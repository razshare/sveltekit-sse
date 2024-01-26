import { readable } from 'svelte/store'
import { CLOSED, stream } from './stream'
import { IS_BROWSER } from './constants'

/**
 * @typedef Reference
 * @property {ReturnType<stream>} eventSource,
 * @property {number} connectionsCounter,
 */

/**
 * @type {Map<string, Reference>}
 * */
const references = new Map()

/**
 *
 * @param {RequestInfo|URL} resource path to the stream.
 */
async function disconnect(resource) {
  const url = `${resource}`
  const reference = references.get(url)
  if (reference) {
    const { eventSource } = reference

    if (eventSource.readyState !== CLOSED) {
      // await reference.eventSource.close()
      reference.eventSource.close()
    }
    reference.connectionsCounter--

    if (reference.connectionsCounter < 0) {
      reference.connectionsCounter = 0
    }

    if (reference.connectionsCounter === 0) {
      references.delete(url)
    }
  }
}

/**
 *
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|import('./stream').Options} options options for the underlying http request.
 */
function connect(resource, options = false) {
  const url = `${resource}`
  if (!references.has(url)) {
    const eventSource = stream(resource, options)
    const freshReference = {
      eventSource,
      connectionsCounter: 0,
    }
    references.set(url, freshReference)
    return freshReference
  }

  const cachedReference = references.get(url)
  if (!cachedReference) {
    throw new Error(`Could not find reference for ${url}.`)
  }

  const { eventSource } = cachedReference

  if (eventSource.readyState === CLOSED) {
    // const reconnectedEventSource = new EventSource(url)
    const freshReference = {
      eventSource,
      connectionsCounter: 0,
    }
    references.set(url, freshReference)

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
 * @typedef SourceState
 * @property {number} eventsCounter
 */

/**
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|import('./stream').Options} options options for the underlying http request.
 * @param {string} eventName
 * @param {Map<string, import('svelte/store').Readable<string>>} readables
 * @param {SourceState} state
 */
function createStore(resource, options, eventName, readables, state) {
  const { eventSource } = connect(resource, options)
  return readable('', function start(set) {
    /**
     *
     * @param {import('./stream').Event} event
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
 * @template T
 * @callback TransformerCallback
 * @param {ReadableStream<string>} stream
 * @returns {import('svelte/store').Readable<T>}
 */

/**
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|import('./stream').Options} options options for the underlying http request.
 * @param {string} eventName
 */
function createTransformer(resource, options, eventName) {
  /**
   * @template To
   * @param {TransformerCallback<To>} callback
   */
  return function transform(callback) {
    if (!IS_BROWSER) {
      /**
       * @type {To}
       */
      //@ts-ignore
      const data = ''

      return readable(data)
    }

    const { eventSource } = connect(resource, options)
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
 * @callback OnErrorCallback
 * @param {Event} event
 * @returns {void|PromiseLike<void>}
 */

/**
 * @callback SubscriberCallback
 * @param {string} payload
 * @returns {void|PromiseLike<void>}
 */

/**
 * @template T
 * @typedef OnJsonParseErrorPayload
 * @property {Error} error
 * @property {string} currentRawValue
 * @property {null|T} previousParsedValue
 */

/**
 * @template T
 * @callback OnJsonParseError<T>
 * @param {OnJsonParseErrorPayload<T>} payload
 * @returns {null|T|PromiseLike<null|T>}
 */

/**
 * Consume a server sent event as a readable store.
 *
 * > **Note**: calling this multiple times using the same `resource` string will not create multiple streams, instead the same stream will be reused for all exposed events on the given `resource`.
 *
 * > **Note**: source values rendered on the server will always be initialized with blank (`''`).
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|import('./stream').Options} options options for the underlying http request.
 */
export function source(resource, options = false) {
  /** @type {SourceState} */
  let state = {
    eventsCounter: 0,
  }
  /** @type {Map<string,import('svelte/store').Readable<string>>} */
  let readables = new Map()

  return {
    /**
     * Close the source connection.
     * @returns {Promise<void>}
     */
    close() {
      if (!IS_BROWSER) {
        return Promise.resolve()
      }
      return disconnect(resource)
    },
    /**
     * Subscribe to the default `message` event.
     * @param {SubscriberCallback} callback
     * @throws when Subscribing callback is not of type `function`.
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
          createStore(resource, options, 'message', readables, state),
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
     * Invoke `callback` whenever an error occurs.
     * @param {import('./stream').ListenerCallback} callback
     * @returns {ReturnType<source>}
     * @throws when `callback` is not of type `function`.
     */
    onError(callback) {
      if (!IS_BROWSER) {
        return this
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `The onError callback must be of type \`function\`, received \`${typeOfValue}\`.`,
        )
      }
      const { eventSource } = connect(resource, options)
      eventSource.onerror = function run(event) {
        callback(event)
      }
      return this
    },
    /**
     * Invoke `callback` whenever the connection closes.
     * @param {import('./stream').ListenerCallback} callback
     * @returns {ReturnType<source>}
     * @throws when `callback` is not of type `function`.
     */
    onClose(callback) {
      if (!IS_BROWSER) {
        return this
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `The onClose callback must be of type \`function\`, received \`${typeOfValue}\`.`,
        )
      }
      const { eventSource } = connect(resource, options)
      eventSource.onclose = function run(event) {
        callback(event)
      }
      return this
    },
    /**
     * Select an event from the stream.
     * @param {string} eventName name of the event
     * @throws when `eventName` is not of type `string`.
     * @throws when `eventName` is not found.
     * @throws when `eventName` containst new lines (`\n`).
     */
    select(eventName) {
      if (!IS_BROWSER) {
        return {
          /**
           * Parse each message of the stream as JSON and wrap them in a readable store.
           * @template [T = any]
           * @param {false|OnJsonParseError<T>} onJsonParseError a callback that will be invoked whenever an error occurs while parsing the JSON.
           * @returns {import("svelte/store").Readable<null|T>} a readable store that will emit the parsed JSON or `null` whenever an error occurs while parsing the JSON.
           */
          json(onJsonParseError = false) {
            if (onJsonParseError) {
              return readable(null)
            }
            return readable(null)
          },
          subscribe: readable('').subscribe,
          /**
           *
           * Transform the stream into a readable store.
           * @template To
           * @param {TransformerCallback<To>} callback
           * @returns {import('svelte/motion').Readable<To>}
           */
          transform(
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
          createStore(resource, options, eventName, readables, state),
        )
      }

      state.eventsCounter++

      const event = readables.get(eventName)

      if (!event) {
        throw new Error(`Could not find event ${eventName}.`)
      }

      return {
        /**
         * Parse each message of the stream as JSON and wrap them in a readable store.
         * @template [T = any]
         * @param {false|OnJsonParseError<T>} onJsonParseError a callback that will be invoked whenever an error occurs while parsing the JSON.
         * @returns {import("svelte/store").Readable<null|T>} a readable store that will emit the parsed JSON or `null` whenever an error occurs while parsing the JSON.
         */
        json: this.json,
        subscribe: event.subscribe,
        /**
         * Transform the stream into a readable store.
         */
        transform: createTransformer(resource, options, eventName),
      }
    },
    /**
     * Transform the stream into a readable store.
     */
    transform: createTransformer(resource, options, 'message'),
    /**
     * Parse each message of the stream as JSON and wrap them in a readable store.
     * @template [T = any]
     * @param {false|OnJsonParseError<T>} onJsonParseError a callback that will be invoked whenever an error occurs while parsing the JSON.
     * @returns {import("svelte/store").Readable<null|T>} a readable store that will emit the parsed JSON or `null` whenever an error occurs while parsing the JSON.
     */
    json(onJsonParseError = false) {
      if (!IS_BROWSER) {
        return readable(null)
      }
      const transformed = this.transform(
        /**
         * @param {ReadableStream<string>} data
         * @returns {import("svelte/store").Readable<null|T>}}
         */
        function run(data) {
          /**
           * @type {null|T}
           */
          let previousParsedValue = null
          const reader = data.getReader()
          /**
           * @type {import('svelte/store').Readable<null|T>}
           */
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
        },
      )

      return transformed
    },
  }
}
