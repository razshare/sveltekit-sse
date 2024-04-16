import { readable } from 'svelte/store'
import { CLOSED, stream } from './stream'
import { IS_BROWSER } from './constants'
/**
 * @template T
 * @typedef {{[K in keyof T]:T[K]} & {}} Pretty
 */

/**
 * State of the stream.\
 * It can be
 * - `CONNECTING` = `0`
 * - `OPEN` = `1`
 * - `CLOSED` = `2`
 * @typedef {0|1|2} StreamState
 */

/**
 * Connection established.
 * @typedef Connected
 * @property {RequestInfo|URL} resource Path to the stream.
 * @property {ReturnType<import('./stream').stream>} eventSource Stream has been established and this is information regarding the connection.
 * @property {number} connectionsCounter How many other clients are connected to the stream.
 * @property {()=>void} stopBeacon
 */

/**
 * @type {Map<string, Connected>}
 * */
const connected = new Map()

/**
 * @typedef DisconnectPayload
 * @property {RequestInfo|URL} resource Path to the stream.
 * @property {import('./types').EventListener} [close] Do something whenever the connection closes.
 * @property {import('./types').EventListener} [error] Do something whenever there are errors.
 */

/**
 * Close the source connection `resource`. This will trigger `close`.
 * @param {DisconnectPayload} payload
 */
async function disconnect({ resource, close, error }) {
  const url = `${resource}`
  const reference = connected.get(url)
  if (reference) {
    reference.connectionsCounter--

    if (reference.connectionsCounter < 0) {
      reference.connectionsCounter = 0
    }

    if (reference.connectionsCounter === 0) {
      connected.delete(url)
      reference.stopBeacon()
      reference.eventSource.close({})
    }
    if (close) {
      reference.eventSource.removeEventListener('close', close)
    }
    if (error) {
      reference.eventSource.removeEventListener('error', error)
    }
  }
}

/**
 * @typedef ConnectPayload
 * @property {RequestInfo|URL} resource Path to the stream.
 * @property {number} [beacon] How often to send a beacon to the server in `milliseconds`.\
 * Defaults to `5000 milliseconds`.
 *
 * > **Note**\
 * > You can set `beacon` to `0` or a negative value to disable this behavior.\
 * > Remember that if you disable this behavior but the server sent event still declares
 * > a `timeout`, the stream will close without notice after the `timeout` expires on the server.
 * @property {Options} [options] Options for the underlying http request.
 * @property {import('./types').EventListener} [close] Do something whenever the connection closes.
 * @property {import('./types').EventListener} [error] Do something whenever there are errors.
 */

/**
 *
 * @param {ConnectPayload} payload
 * @returns
 */
function connect({ resource, beacon = 5000, close, error, options = {} }) {
  const url = `${resource}`
  if (!connected.has(url)) {
    /**
     * @type {false|ReadableStreamDefaultController<string>}
     */
    let controller = false
    /**
     * @type {false|NodeJS.Timeout}
     */
    let interval = false
    const eventSource = stream({
      resource,
      beacon,
      options,
      onIdFound(id) {
        if (beacon <= 0) {
          return
        }
        const path = resource.toString().split('?', 2)[0] ?? '/'
        interval = setInterval(function run() {
          navigator.sendBeacon(`${path}?x-sse-id=${id}`)
        }, beacon)
      },
    })

    const stopBeacon = function stopBeacon() {
      if (controller) {
        controller.close()
      }
      if (interval) {
        clearInterval(interval)
      }
    }

    eventSource.addEventListener('close', stopBeacon)
    eventSource.addEventListener('error', stopBeacon)

    if (close) {
      eventSource.addEventListener('close', close)
    }

    if (error) {
      eventSource.addEventListener('error', error)
    }

    const freshReference = {
      resource,
      eventSource,
      connectionsCounter: 0,
      stopBeacon,
    }

    connected.set(url, freshReference)
    return freshReference
  }

  const cachedReference = connected.get(url)
  if (!cachedReference) {
    throw new Error(`Could not find reference for ${url}.`)
  }

  const { eventSource, stopBeacon } = cachedReference

  if (eventSource.readyState === CLOSED) {
    // const reconnectedEventSource = new EventSource(url)
    const freshReference = {
      resource,
      eventSource,
      connectionsCounter: 0,
      stopBeacon,
    }
    connected.set(url, freshReference)

    return freshReference
  }

  if (cachedReference.connectionsCounter < 0) {
    cachedReference.connectionsCounter = 1
  } else {
    cachedReference.connectionsCounter++
  }

  return cachedReference
}

/**
 * State of the source.
 * @typedef SourceState
 * @property {number} eventsCounter How many events are currently using the stream.
 */

/**
 * @typedef CreateStorePayload
 * @property {Connected} connected Connected insurance.
 * @property {string} eventName Name of the event.
 * @property {SourceState} state State of the source.
 * @property {Map<string, import('svelte/store').Readable<string>>} readables
 */

/**
 *
 * @param {CreateStorePayload} payload
 * @returns
 */
function createStore({ connected, eventName, readables, state }) {
  if (!IS_BROWSER) {
    return readable('')
  }
  const { eventSource, resource } = connected
  return readable('', function start(set) {
    /**
     *
     * @param {import('./types').Event} event
     */
    function listener(event) {
      set(event.data)
    }

    eventSource.addEventListener(eventName, listener)

    return async function stop() {
      state.eventsCounter--
      await disconnect({ resource })
      eventSource.removeEventListener(eventName, listener)
      readables.delete(eventName)
    }
  })
}

/**
 * @typedef CreateTransformerPayload
 * @property {Connected} connected Connected insurance.
 * @property {string} eventName Name of the event.
 */

/**
 * @param {CreateTransformerPayload} payload
 * @returns
 */
function createTransformer({ connected, eventName }) {
  /**
   * @template T
   * @param {(stream:ReadableStream<string>)=>import('svelte/store').Readable<T>} callback
   * @returns
   */
  return function transform(callback) {
    if (!IS_BROWSER) {
      /**
       * @type {T}
       */
      // @ts-ignore
      const data = ''

      return readable(data)
    }

    const { eventSource } = connected

    /**
     * @type {ReadableStreamDefaultController<string>}
     */
    let controller

    /**
     *
     * @param {import('./types').Event} event
     */
    function run(event) {
      controller.enqueue(event.data)
    }

    /**
     * @type {ReadableStream<string>}
     */
    const readableStream = new ReadableStream({
      start(controllerLocal) {
        controller = controllerLocal
        eventSource.addEventListener(eventName, run)
      },
      cancel() {
        eventSource.removeEventListener(eventName, run)
      },
    })

    return callback(readableStream)
  }
}

/**
 * Options for the underlying http request.
 * @typedef {Pick<import('@microsoft/fetch-event-source').FetchEventSourceInit, "body"|"cache"|"credentials"|"fetch"|"headers"|"integrity"|"keepalive"|"method"|"mode"|"openWhenHidden"|"redirect"|"referrer"|"referrerPolicy"|"timeout"|"window">} Options
 */

/**
 * Describes the current parsed json and the previous json values.
 * @template T
 * @typedef JsonOrPayload
 * @property {Error} error The error generated by `JSON.parse`.
 * @property {string} raw This is the current raw string value, the one that triggered the error.
 * @property {null|T} previous This is the previous value of the store.
 */

/**
 * @template [T = any]
 * @callback JsonPredicate
 * @param {JsonOrPayload<T>} payload
 * @returns {null|T}
 */

/**
 * @template [T = any]
 * @param {JsonOrPayload<T>} payload
 * @returns {null|T}
 */
function defaultJsonOrPredicate({ error, previous }) {
  console.error(error)
  return previous
}

/**
 * Consume a server sent event as a readable store.
 *
 * > **Note**\
 * > Calling this multiple times using the same `resource` string will not
 * > create multiple streams, instead the same stream will be reused for all exposed
 * > events on the given `resource`.
 * @typedef SourceConfiguration
 * @property {import('./types').EventListener} [close] Do something whenever the connection closes.
 * @property {import('./types').EventListener} [error] Do something whenever there are errors.
 * @property {Options} [options] Options for the underlying http request.
 * @property {number} [beacon]
 */

/**
 * Source a server sent event.
 *
 * Multiple sources may share the same underlying connection if they use the same path (`from`).
 * > ## Example
 * > ```js
 * > const connection = source({
 * >  from: '/events',
 * >  beacon: 1000,
 * >  options: {
 * >    headers: {
 * >      'Authorization': `Bearer ${token}`
 * >    }
 * >  }
 * > })
 * > ```
 * @param {string} from Path to the stream.
 * @param {SourceConfiguration} [configuration]
 * @returns
 */
export function source(
  from,
  { close, error, beacon = 5000, options = {} } = {},
) {
  /** @type {SourceState} */
  const state = {
    eventsCounter: 0,
  }
  /** @type {Map<string,import('svelte/store').Readable<string>>} */
  const readables = new Map()

  /**
   * @type {Connected}
   */
  let connected

  if (IS_BROWSER) {
    connected = connect({ resource: from, beacon, options, close, error })
  }

  let closeLocal = close
  let errorLocal = error

  return {
    close() {
      if (!IS_BROWSER) {
        return Promise.resolve()
      }
      return disconnect({ resource: from, close, error })
    },
    /**
     *  Select an event from the stream.
     * @param {string} eventName Name of the event.
     * @returns
     */
    select(eventName) {
      if (eventName.includes('\n')) {
        throw new Error(
          `The name of the event must not contain new line characters, received "${eventName}"`,
        )
      }
      const typeOfValue = typeof eventName
      if (typeOfValue !== 'string') {
        throw new Error(
          `Event name must be of type \`string\`, received \`${typeOfValue}\`.`,
        )
      }

      if (!readables.has(eventName)) {
        readables.set(
          eventName,
          createStore({
            connected,
            eventName,
            readables,
            state,
          }),
        )
      }

      state.eventsCounter++

      const event = readables.get(eventName)

      if (!event) {
        throw new Error(`Could not find event ${eventName}.`)
      }

      return {
        subscribe: event.subscribe,
        transform: createTransformer({
          connected,
          eventName,
        }),
        /**
         * Parse each message as Json.
         * @template [T = any]
         * @param {JsonPredicate<T>} or A function that's invoked when a `JSON.parse` error is detected.
         * The resulting value of this function will become the new value of the store.
         * @returns {import('svelte/store').Readable<null|T>}
         */
        json(or = defaultJsonOrPredicate) {
          if (!IS_BROWSER) {
            return readable(null)
          }
          const transformed = this.transform(function run(stream) {
            /**
             * @type {null|T}
             */
            let previous = null
            const reader = stream.getReader()
            return readable(
              previous,
              /**
               * @type {import('svelte/store').StartStopNotifier<null|T>}
               */
              function start(set) {
                async function read() {
                  try {
                    const { done, value: raw } = await reader.read()
                    if (done) {
                      return
                    }
                    try {
                      previous = JSON.parse(raw)
                      set(previous)
                    } catch (e) {
                      set(
                        or({
                          previous,
                          raw: raw,
                          // @ts-ignore
                          error: e,
                        }),
                      )
                    }
                    read()
                  } catch (e) {
                    set(
                      or({
                        previous,
                        raw: '',
                        // @ts-ignore
                        error: e,
                      }),
                    )
                  }
                }
                read()
                return function stop() {
                  reader.cancel().then(function run() {
                    disconnect({
                      resource: from,
                      close: closeLocal,
                      error: errorLocal,
                    })
                  })
                }
              },
            )
          })
          return transformed
        },
      }
    },
  }
}
