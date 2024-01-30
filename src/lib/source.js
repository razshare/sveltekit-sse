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
 * @property {ReturnType<import('./stream').stream>} eventSource Stream has been established and this is information regarding the connection.
 * @property {number} connectionsCounter How many other clients are connected to the stream.
 * @property {()=>void} stopBeacon
 */

/**
 * @type {Map<string, Connected>}
 * */
const connected = new Map()

/**
 * Close the source connection `resource`. This will trigger `close`.
 * @param {RequestInfo|URL} resource Path to the stream.
 */
async function disconnect(resource) {
  const url = `${resource}`
  const reference = connected.get(url)
  if (reference) {
    const { eventSource } = reference

    if (eventSource.readyState !== CLOSED) {
      // await reference.eventSource.close()
      reference.eventSource.close({})
      reference.stopBeacon()
    }
    reference.connectionsCounter--

    if (reference.connectionsCounter < 0) {
      reference.connectionsCounter = 0
    }

    if (reference.connectionsCounter === 0) {
      connected.delete(url)
    }
  }
}

/**
 * @typedef ConnectPayload
 * @property {RequestInfo|URL} resource Path to the stream.
 * @property {number} [beacon]
 * @property {Options} [options] Options for the underlying http request.
 */

/**
 *
 * @param {ConnectPayload} payload
 * @returns
 */
function connect({ resource, beacon = 10000, options = {} }) {
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
        if (!id) {
          console.error('Invalid sse id.', { id })
          return
        }
        interval = setInterval(function run() {
          navigator.sendBeacon(resource.toString() + '?' + id)
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

    const freshReference = {
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
 * @property {RequestInfo|URL} resource Path to the stream.
 * @property {string} eventName
 * @property {SourceState} state State of the source.
 * @property {Map<string, import('svelte/store').Readable<string>>} readables
 * @property {number} [beacon]
 * @property {Options} [options] Options for the underlying http request.
 */

/**
 *
 * @param {CreateStorePayload} payload
 * @returns
 */
function createStore({
  resource,
  options,
  beacon,
  eventName,
  readables,
  state,
}) {
  const { eventSource } = connect({ resource, options, beacon })
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
      await disconnect(resource)
      eventSource.removeEventListener(eventName, listener)
      readables.delete(eventName)
    }
  })
}

/**
 * @typedef CreateTransformerPayload
 * @property {string} eventName Name of the event.
 * @property {RequestInfo|URL} resource Path to the stream.
 * @property {number} [beacon]
 * @property {Options} [options] Options for the underlying http request.
 */

/**
 * @param {CreateTransformerPayload} payload
 * @returns
 */
function createTransformer({
  resource,
  eventName,
  beacon = 10000,
  options = {},
}) {
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

    const { eventSource } = connect({ resource, beacon, options })
    /**
     * @type {ReadableStream<string>}
     */
    const readableStream = new ReadableStream({
      start(controller) {
        eventSource.addEventListener(eventName, function run(event) {
          controller.enqueue(event.data)
        })
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
 * Describes a json parse error.
 * @template T
 * @typedef OnJsonParseErrorPayload
 * @property {Error} error What went wrong.
 * @property {string} currentRawValue This raw string value that triggered this error.
 * @property {null|T} previousParsedValue This is the previous value of the store.
 */

/**
 * Consume a server sent event as a readable store.
 *
 * > **Note**\
 * > Calling this multiple times using the same `resource` string will not
 * > create multiple streams, instead the same stream will be reused for all exposed
 * > events on the given `resource`.
 * @typedef SourcePayload
 * @property {string} resource path to the stream.
 * @property {import('./types').EventListener} [close] Do something whenever the connection closes.
 * @property {import('./types').EventListener} [error] Do something whenever there are errors.
 * @property {Options} [options] Options for the underlying http request.
 * @property {number} [beacon]
 */

/**
 *
 * @param {SourcePayload} payload
 * @returns
 */
export function source({
  resource,
  close,
  error,
  beacon = 10000,
  options = {},
}) {
  /** @type {import('./types').SourceState} */
  let state = {
    eventsCounter: 0,
  }
  /** @type {Map<string,import('svelte/store').Readable<string>>} */
  let readables = new Map()

  const { eventSource } = connect({ resource, beacon, options })
  if (error) {
    eventSource.addEventListener('error', error)
  }

  if (close) {
    eventSource.addEventListener('close', close)
  }

  return {
    close() {
      if (!IS_BROWSER) {
        return Promise.resolve()
      }
      return disconnect(resource)
    },
    /**
     *
     * @param {import('svelte/store').Subscriber<string>} callback Callback to inform of a value updates.
     * @returns
     */
    subscribe(callback) {
      if (!IS_BROWSER) {
        return readable('').subscribe(callback)
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `Subscribing callback must be of type \`function\`, received \`${typeOfValue}\`.`,
        )
      }

      if (!readables.has('message')) {
        readables.set(
          'message',
          createStore({
            resource,
            eventName: 'message',
            beacon,
            options,
            readables,
            state,
          }),
        )
      }

      state.eventsCounter++

      const message = readables.get('message')

      if (!message) {
        throw new Error('Could not find message.')
      }

      return message.subscribe(callback)
    },
    /**
     *
     * @param {string} eventName
     * @returns
     */
    select(eventName) {
      if (!IS_BROWSER) {
        return {
          /**
           * @template T
           * @param {(error:OnJsonParseErrorPayload<T>)=>null|T|Promise<null|T>} [onJsonParseError]
           * @returns
           */
          json(onJsonParseError) {
            if (onJsonParseError) {
              return readable(null)
            }
            return readable(null)
          },
          subscribe: readable('').subscribe,
          transform(
            /**
             * @type {(event:import('./types').Event)=>void}
             */
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            callback,
          ) {
            // @ts-ignore
            return readable('')
          },
        }
      }
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
            resource,
            beacon,
            options,
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
        transform: createTransformer({ resource, eventName, beacon, options }),
        /**
         * @template T
         * @param {(error:OnJsonParseErrorPayload<T>)=>null|T|Promise<null|T>} [onJsonParseError]
         * @returns
         */
        json(onJsonParseError) {
          if (!IS_BROWSER) {
            return readable(null)
          }
          const transformed = this.transform(function run(data) {
            /**
             * @type {null|T}
             */
            let previousParsedValue = null
            const reader = data.getReader()
            return readable(
              previousParsedValue,
              /**
               * @type {import('svelte/store').StartStopNotifier<null|T>}
               */
              function start(set) {
                const read = async function run() {
                  try {
                    const { done, value } = await reader.read()
                    if (done) {
                      return
                    }
                    try {
                      previousParsedValue = JSON.parse(value)
                      set(previousParsedValue)
                    } catch (error) {
                      if (!onJsonParseError) {
                        console.error(error)
                        set(null)
                        return
                      }
                      set(
                        await onJsonParseError({
                          // @ts-ignore
                          error,
                          currentRawValue: value,
                          previousParsedValue,
                        }),
                      )
                    }
                    read()
                  } catch (error) {
                    if (!onJsonParseError) {
                      console.error(error)
                      set(null)
                      return
                    }
                    set(
                      await onJsonParseError({
                        // @ts-ignore
                        error,
                        currentRawValue: '',
                        previousParsedValue,
                      }),
                    )
                  }
                }
                read()
                return function stop() {
                  disconnect(resource)
                  reader.cancel()
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
