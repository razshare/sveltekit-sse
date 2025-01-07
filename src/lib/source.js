import { derived, readable } from 'svelte/store'
import { consume } from './consume'
import { IS_BROWSER } from './constants'

/**
 * @type {Map<string, import('./types.external').Source>}
 */
const cachedSources = new Map()

/**
 * @param {import('./types.internal').ConnectablePayload} payload
 * @returns {import('./types.internal').Connectable}
 */
function connectable({ resource, options, onClose, onError, onOpen }) {
  let terminate = function noop() {}

  const store = readable(
    false,
    /**
     * @param {function(import('./types.internal').ConnectableStartPayload):void} set
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
          set({ id: e.id, event: e.event, data: e.data })
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
   * @type {import('./types.internal').Connectable}
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
 * @param {string} from Path to the stream.
 * @param {import('./types.external').SourceConfiguration} [configuration]
 * @returns {import('./types.external').Source}
 */
export function source(
  from,
  { error, close, open, cache = true, options = {} } = {},
) {
  if (!IS_BROWSER) {
    return {
      close() {},
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select(eventName) {
        const storeLocal = readable('')
        return {
          ...storeLocal,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          json(or) {
            return readable(null)
          },
          transform(transformer) {
            return derived(storeLocal, transformer)
          },
        }
      },

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // select(eventName) {
      //   const storeLocal = readable('')
      //   return {
      //     ...storeLocal,
      //     transform(transformer) {
      //       return derived(storeLocal, transformer)
      //     },
      //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //     json(or) {
      //       return readable(null)
      //     },
      //   }
      // },
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
  // @ts-ignore
  let storeLocalsCache = new Map()

  /** @type {import('./types.external').Source} */
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
        json(or) {
          // @ts-ignore
          let previous = null
          let result = derived(storeLocalCached, function convert(raw) {
            try {
              previous = JSON.parse(raw)
              return previous
            } catch (e) {
              if (or) {
                return or({
                  // @ts-ignore
                  error: e,
                  raw: raw,
                  // @ts-ignore
                  previous,
                })
              }
            }
          })
          return result
        },
        transform(transformer) {
          /** @type {any} */
          let initialValue = null
          return readable(initialValue, function start(set) {
            const unsubscribe = connected.subscribe(function watch(value) {
              if (value && value.event === eventName) {
                const valueLocal = transformer(value.data)
                // @ts-ignore
                set(valueLocal)
              }
            })

            return function stop() {
              connected.close()
              unsubscribe()
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
