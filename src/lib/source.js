import { derived, readable, writable } from 'svelte/store'
import { stream } from './stream'
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
 * @property {string} resource Path to the stream.
 * @property {ReturnType<import('./stream').stream>} eventSource Stream has been established and this is information regarding the connection.
 * @property {number} connectionsCounter How many other clients are connected to the stream.
 * @property {()=>void} stopBeacon
 */

/**
 * @typedef ConnectPayload
 * @property {string} resource Path to the stream.
 * @property {number} beacon How often to send a beacon to the server in `milliseconds`.\
 * Defaults to `5000 milliseconds`.
 *
 * > **Note**\
 * > You can set `beacon` to `0` or a negative value to disable this behavior.\
 * > Remember that if you disable this behavior but the server sent event still declares
 * > a `timeout`, the stream will close without notice after the `timeout` expires on the server.
 * @property {Options} options Options for the underlying http request.
 * @property {import('./types').EventListener} onMessage
 * @property {import('./types').EventListener} onError
 * @property {import('./types').EventListener} onClose
 */

/**
 *
 * @param {ConnectPayload} payload
 * @returns
 */
function connect({ resource, beacon, options, onClose, onError, onMessage }) {
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
    onClose,
    onError,
    onMessage,
  })

  const stopBeacon = function stopBeacon() {
    if (interval) {
      clearInterval(interval)
    }
  }

  return {
    resource,
    eventSource,
    connectionsCounter: 0,
    stopBeacon,
  }
}

/**
 * Options for the underlying http request.
 * @typedef {Pick<import('@microsoft/fetch-event-source').FetchEventSourceInit, "body"|"cache"|"credentials"|"fetch"|"headers"|"integrity"|"keepalive"|"method"|"mode"|"openWhenHidden"|"redirect"|"referrer"|"referrerPolicy"|"timeout"|"window">} Options
 */

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
  { error, close, beacon = 5000, options = {} } = {},
) {
  if (!IS_BROWSER) {
    return {
      close() {},
      /**
       *  Select an event from the stream.
       * @param {string} eventName Name of the event.
       * @returns
       */
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select(eventName) {
        const storeLocal = readable('')
        return {
          ...storeLocal,
          /**
           * @template [T = any]
           * @param {(value:string) => T} transformer
           * @returns
           */
          transform(transformer) {
            return derived(storeLocal, transformer)
          },
          /**
           * @template [T = any]
           * @param {import('./types').JsonPredicate} [or]
           * @returns {import('svelte/store').Readable<null|T>}
           */
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          json(or) {
            return readable(null)
          },
        }
      },
    }
  }

  /**
   * @type {import('svelte/store').Writable<false|{id:string,event:string,data:string}>}
   */
  const store = writable(false)

  /**
   * @type {Connected}
   */
  const connected = connect({
    resource: from,
    beacon,
    options,
    onClose(e) {
      if (close) {
        close(e)
      }
    },
    onError(e) {
      if (error) {
        error(e)
      }
    },
    onMessage(e) {
      store.set({ id: e.id, event: e.event, data: decodeURIComponent(e.data) })
    },
  })

  return {
    close() {
      connected.eventSource.controller.abort()
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

      const storeLocal = readable('', function start(set) {
        const unsubscribe = store.subscribe(function pass(value) {
          if (value && value.event === eventName) {
            set(value.data)
          }
        })

        return function stop() {
          connected.eventSource.validate()
          unsubscribe()
        }
      })

      return {
        ...storeLocal,
        /**
         * @template [T = any]
         * @param {(value:string) => T} transformer
         * @returns
         */
        transform(transformer) {
          return derived(storeLocal, transformer)
        },
        /**
         * @template [T = any]
         * @param {import('./types').JsonPredicate} [or]
         * @returns {import('svelte/store').Readable<null|T>}
         */
        json(or) {
          /**
           * @type {null|T}
           */
          let previous = null
          return derived(storeLocal, function convert(raw) {
            try {
              previous = JSON.parse(raw)
              return previous
            } catch (e) {
              if (or) {
                return or({
                  previous,
                  raw: raw,
                  // @ts-ignore
                  error: e,
                })
              }
            }
          })
        },
      }
    },
  }
}
