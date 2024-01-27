import { readable } from 'svelte/store'
import { CLOSED, stream } from './stream'
import { IS_BROWSER } from './constants'

/**
 * @type {Map<string, import('./types').Connected>}
 * */
const connected = new Map()

/**
 *
 * @param {RequestInfo|URL} resource path to the stream.
 */
async function disconnect(resource) {
  const url = `${resource}`
  const reference = connected.get(url)
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
      connected.delete(url)
    }
  }
}

/**
 * @type {import('./types').Connect}
 */
function connect(resource, options = false) {
  const url = `${resource}`
  if (!connected.has(url)) {
    const eventSource = stream(resource, options)
    const freshReference = {
      eventSource,
      connectionsCounter: 0,
    }
    connected.set(url, freshReference)
    return freshReference
  }

  const cachedReference = connected.get(url)
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
 * @type {import('./types').CreateStore}
 */
function createStore(resource, options, eventName, readables, state) {
  const { eventSource } = connect(resource, options)
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
 * @template T
 * @type {import('./types').CreateTransformer<T>}
 */
function createTransformer(resource, options, eventName) {
  return function transform(callback) {
    if (!IS_BROWSER) {
      /**
       * @type {T}
       */
      // @ts-ignore
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
 * Consume a server sent event as a readable store.
 *
 * > **Note**\
 * > Calling this multiple times using the same `resource` string will not
 * > create multiple streams, instead the same stream will be reused for all exposed
 * > events on the given `resource`.
 * @type {import('./types').Source}
 */
export function source(resource, options = false) {
  /** @type {import('./types').SourceState} */
  let state = {
    eventsCounter: 0,
  }
  /** @type {Map<string,import('svelte/store').Readable<string>>} */
  let readables = new Map()

  return {
    close() {
      if (!IS_BROWSER) {
        return Promise.resolve()
      }
      return disconnect(resource)
    },
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
      eventSource.addEventListener('error', function run(event) {
        callback(event)
      })
      return this
    },
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
      eventSource.addEventListener('error', function run(event) {
        callback(event)
      })
      return this
    },
    select(eventName) {
      if (!IS_BROWSER) {
        return {
          json(onJsonParseError = false) {
            if (onJsonParseError) {
              return readable(null)
            }
            return readable(null)
          },
          subscribe: readable('').subscribe,
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
        json: this.json,
        subscribe: event.subscribe,
        transform: createTransformer(resource, options, eventName),
      }
    },

    transform: createTransformer(resource, options, 'message'),

    /**
     * @template T
     */
    json(onJsonParseError = false) {
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
}
