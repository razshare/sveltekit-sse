import { readable } from 'svelte/store'
import { browser } from '$app/environment'
import { CLOSED, stream } from './stream'

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
 * @param {string} url path to the stream.
 */
async function disconnect(url) {
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
 * @param {string} url path to the stream.
 * @param {false|RequestInit} [options]
 */
function connect(url, options = false) {
  if (!references.has(url)) {
    const eventSource = stream(url, options)
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
 * @param {string} url
 * @param {string} eventName
 * @param {Map<string, import('svelte/store').Readable<string>>} readables
 * @param {SourceState} state
 */
function createStore(url, eventName, readables, state) {
  const { eventSource } = connect(url)
  return readable('', function start(set) {
    /**
     *
     * @param {import('./stream').HttpStreamEvent} event
     */
    const listener = function run(event) {
      set(event.data)
    }

    eventSource.addEventListener(eventName, listener)

    return async function stop() {
      state.eventsCounter--
      await disconnect(url)
      eventSource.removeEventListener(eventName, listener)
      readables.delete(eventName)
    }
  })
}

/**
 * @template To
 * @callback TransformerCallback
 * @param {ReadableStream<string>} stream
 * @returns {import('svelte/store').Readable<To>}
 */

/**
 * @param {string} url
 * @param {string} eventName
 */
function createTransformer(url, eventName) {
  /**
   * @template To
   * @param {TransformerCallback<To>} callback
   */
  return function transform(callback) {
    if (!browser) {
      /**
       * @type {To}
       */
      //@ts-ignore
      const data = ''

      return readable(data)
    }

    const { eventSource } = connect(url)
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
 * Consume a server sent event as a readable store.
 *
 * > **Note**: calling this multiple times using the same `url` string will not create multiple streams, instead the same stream will be reused for all exposed events on the given `url`.
 *
 * > **Note**: source values rendered on the server will always be initialized with blank (`''`).
 * @param {string} url path to the stream.
 */
export function source(url) {
  let reconnect = false
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
      return disconnect(url)
    },
    /**
     * Subscribe to the default `message` event.
     * @param {SubscriberCallback} callback
     * @throws when Subscribing callback is not of type `function`.
     */
    subscribe(callback) {
      if (!browser) {
        return readable('').subscribe(callback)
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `Subscribing callback must be of type \`function\`, received \`${typeOfValue}\`.`,
        )
      }

      if (!readables.has('message')) {
        readables.set('message', createStore(url, 'message', readables, state))
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
     * @param {import('./stream').HttpEventCallback} callback
     * @returns {ReturnType<source>}
     * @throws when `callback` is not of type `function`.
     */
    onError(callback) {
      if (!browser) {
        return this
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `Error callback must be of type \`function\`, received \`${typeOfValue}\`.`,
        )
      }
      const { eventSource } = connect(url)
      eventSource.onerror = function run(event) {
        if (!reconnect) {
          disconnect(url)
        }
        callback(event)
      }
      return this
    },
    /**
     * Select an event from the stream.
     * @param {string} eventName name of the event
     * @throws when `eventName` is not of type `string`.
     * @throws when event `eventName` is not found.
     */
    select(eventName) {
      if (!browser) {
        return {
          subscribe: readable('').subscribe,
          /**
           *
           * Transform the stream into a readable store.
           * @template To
           * @param {TransformerCallback<To>} callback
           * @returns {import('svelte/motion').Readable<To>}
           */
          transform(callback) {
            callback
            // @ts-ignore
            return readable('')
          },
        }
      }
      const typeOfValue = typeof eventName
      if (typeOfValue !== 'string') {
        throw new Error(
          `Event name must be of type \`string\`, received \`${typeOfValue}\`.`,
        )
      }

      if (!readables.has(eventName)) {
        readables.set(eventName, createStore(url, eventName, readables, state))
      }

      state.eventsCounter++

      const event = readables.get(eventName)

      if (!event) {
        throw new Error(`Could not find event ${eventName}.`)
      }

      return {
        subscribe: event.subscribe,
        /**
         * Transform the stream into a readable store.
         */
        transform: createTransformer(url, eventName),
      }
    },
    /**
     * Transform the stream into a readable store.
     */
    transform: createTransformer(url, 'message'),
  }
}
