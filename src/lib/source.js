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
 * @param {false|RequestInit} options options for the underlying http request.
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
 * @param {false|RequestInit} options options for the underlying http request.
 * @param {string} eventName
 * @param {Map<string, import('svelte/store').Readable<string>>} readables
 * @param {SourceState} state
 */
function createStore(resource, options, eventName, readables, state) {
  const { eventSource } = connect(resource, options)
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
      await disconnect(resource)
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
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|RequestInit} options options for the underlying http request.
 * @param {string} eventName
 */
function createTransformer(resource, options, eventName) {
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
 * Consume a server sent event as a readable store.
 *
 * > **Note**: calling this multiple times using the same `resource` string will not create multiple streams, instead the same stream will be reused for all exposed events on the given `resource`.
 *
 * > **Note**: source values rendered on the server will always be initialized with blank (`''`).
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|RequestInit} options options for the underlying http request.
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
      return disconnect(resource)
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
     * @param {import('./stream').HttpEventCallback} callback
     * @returns {ReturnType<source>}
     * @throws when `callback` is not of type `function`.
     */
    onerror(callback) {
      if (!browser) {
        return this
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `onerror callback must be of type \`function\`, received \`${typeOfValue}\`.`,
        )
      }
      const { eventSource } = connect(resource, options)
      eventSource.onerror = function run(event) {
        callback(event)
      }
      return this
    },
    /**
     * Invoke `callback` whenever the connections closes.
     * @param {import('./stream').HttpEventCallback} callback
     * @returns {ReturnType<source>}
     * @throws when `callback` is not of type `function`.
     */
    onclose(callback) {
      if (!browser) {
        return this
      }
      const typeOfValue = typeof callback
      if (typeOfValue !== 'function') {
        throw new Error(
          `onclose callback must be of type \`function\`, received \`${typeOfValue}\`.`,
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
  }
}
