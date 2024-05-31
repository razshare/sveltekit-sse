import { derived, readable } from 'svelte/store'
import { consume } from './consume'
import { IS_BROWSER } from './constants'
/**
 * @template T
 * @typedef {{[K in keyof T]:T[K]} & {}} Pretty
 */

/**
 * @typedef ConnectablePayload
 * @property {string} resource Path to the stream.
 * @property {import('./types').Options} options Options for the underlying http request.
 * @property {import('./types').EventListener} onError
 * @property {import('./types').EventListener} onClose
 * @property {import('./types').EventListener} onOpen
 */

/**
 * @typedef {import('svelte/store').Readable<ConnectableStartPayload> & ConnectableAugmentations} Connectable
 */

/**
 * A message from the currently connected source.
 * @typedef ConnectableMessage
 * @property {string} id Message identifier.
 * @property {string} event Event name.
 * @property {string} data Event data.
 */

/**
 * Connectable features.
 * @typedef ConnectableAugmentations
 * @property {function():void} close Close the current connection.
 */

/**
 * @typedef {false | ConnectableMessage} ConnectableStartPayload
 */

/**
 * @type {Map<string, Source>}
 */
const cachedSources = new Map()

/**
 * @param {ConnectablePayload} payload
 * @returns {Connectable}
 */
function connectable({ resource, options, onClose, onError, onOpen }) {
  let terminate = function noop() {}

  const store = readable(
    false,
    /**
     * @param {function(ConnectableStartPayload):void} set
     * @returns
     */
    function start(set) {
      const consumedStream = consume({
        resource,
        options,
        onClose(e) {
          if (onClose) {
            onClose(e)
          }
        },
        onOpen,
        onError,
        onMessage(e) {
          set({ id: e.id, event: e.event, data: decodeURIComponent(e.data) })
        },
      })

      function terminateLocal() {
        consumedStream.controller.abort()
      }

      terminate = terminateLocal

      return terminateLocal
    },
  )

  /**
   * @type {Connectable}
   */
  const connectable = {
    ...store,
    close() {
      terminate()
    },
  }

  return connectable
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
 * @property {import('./types').EventListener} [open] Do something whenever the connection opens.
 * @property {import('./types').EventListener} [error] Do something whenever there are errors.
 * @property {import('./types').Options} [options] Options for the underlying http request.
 * @property {boolean} [cache] Wether or not to cache connections, defaults to `true`.
 * > **Note**\
 * > Connections are cached based on `from` and `options`.\
 * > If two sources define all three properties with the same values, then both sources will share the same connection,
 * > otherwise they will create and use two separate connections.
 */

/**
 * @template [T = any]
 * @callback SourceSelect
 * @param {string} eventName Name of the event.
 * @returns {import('svelte/store').Readable<string>&SourceSelected<T>}
 */

/**
 * @template [T = any]
 * @callback Transformer
 * @param {string} value
 * @return {T}
 */

/**
 * @template [T = any]
 * @callback Jsonifier
 * @param {import('./types').JsonPredicate} [or] Manage the value when the json parsing fails.\
 * Whatever this function returns will become the new value of the store.
 * @returns {import('svelte/store').Readable<null|T>}
 */

/**
 * @template [T = any]
 * @callback SourceSelectedTransform
 * @param {Transformer<T>} transformer
 */

/**
 * @template [T = any]
 * @typedef SourceSelected
 * @property {SourceSelectedTransform<T>} transform Transform the data into a custom shape.
 * @property {Jsonifier<T>} json Parse the data as json.
 */

/**
 * @template [T = any]
 * @typedef Source
 * @property {function():void} close
 * @property {SourceSelect} select Select an event from the stream.
 */

/**
 * Source a server sent event.
 *
 * Multiple sources may share the same underlying connection if they use the same path (`from`).
 * > ## Example
 * > ```js
 * > const connection = source({
 * >  from: '/events',
 * >  options: {
 * >    headers: {
 * >      'Authorization': `Bearer ${token}`
 * >    }
 * >  }
 * > })
 * > ```
 * @template [T = any]
 * @param {string} from Path to the stream.
 * @param {SourceConfiguration} [configuration]
 * @returns {Source<T>}
 */
export function source(
  from,
  { error, close, open, cache = true, options = {} } = {},
) {
  if (!IS_BROWSER) {
    return {
      close() {},
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select(eventName) {
        const storeLocal = readable('')
        return {
          ...storeLocal,
          transform(transformer) {
            return derived(storeLocal, transformer)
          },
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          json(or) {
            return readable(null)
          },
        }
      },
    }
  }

  let key = ''
  if (cache) {
    key = btoa(JSON.stringify({ from, options }))
    const cachedSource = cachedSources.get(key)
    if (cachedSource) {
      return cachedSource
    }
  }

  const connected = connectable({
    resource: from,
    options,
    onClose(e) {
      if (close) {
        close(e)
      }
    },
    onOpen(e) {
      if (open) {
        open(e)
      }
    },
    onError(e) {
      if (error) {
        error(e)
      }
    },
  })

  /** @type {Map<string,import('svelte/store').Readable<string>>} */
  let storeLocalsCache = new Map()
  /** @type {Source<T>} */
  let source = {
    close() {
      connected.close()
    },
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

      if (!storeLocalsCache.has(eventName)) {
        const storeLocal = readable('', function start(set) {
          const unsubscribe = connected.subscribe(function watch(value) {
            if (value && value.event === eventName) {
              set(value.data)
            }
          })

          return function stop() {
            cachedSources.delete(key)
            connected.close()
            unsubscribe()
          }
        })

        storeLocalsCache.set(eventName, storeLocal)
      }

      /** @type {import('svelte/store').Readable<string>} */
      // @ts-ignore
      const storeLocalCached = storeLocalsCache.get(eventName)

      return {
        ...storeLocalCached,
        /**
         * @template [T = any]
         * @param {(value:string) => T} transformer
         * @returns
         */
        transform(transformer) {
          return readable(
            null,
            /**
             *
             * @param {function(null|T):void} set
             * @returns
             */
            function start(set) {
              const unsubscribe = connected.subscribe(function watch(value) {
                if (value && value.event === eventName) {
                  const valueLocal = transformer(value.data)
                  set(valueLocal)
                }
              })

              return function stop() {
                connected.close()
                unsubscribe()
              }
            },
          )
        },
        json(or) {
          /**
           * @type {null|T}
           */
          let previous = null
          // @ts-ignore
          return derived(storeLocalCached, function convert(raw) {
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
  if (key !== '') {
    cachedSources.set(key, source)
  }
  return source
}
