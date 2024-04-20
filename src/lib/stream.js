import { fetchEventSource } from '@microsoft/fetch-event-source'
import { IS_BROWSER } from './constants'

/**
 * @type {StreamState}
 */
export const CONNECTING = 0
/**
 * @type {StreamState}
 */
export const OPEN = 1
/**
 * @type {StreamState}
 */
export const CLOSED = 2

/**
 * Options for the underlying http request.
 * @typedef {Pick<import('@microsoft/fetch-event-source').FetchEventSourceInit, "body"|"cache"|"credentials"|"fetch"|"headers"|"integrity"|"keepalive"|"method"|"mode"|"openWhenHidden"|"redirect"|"referrer"|"referrerPolicy"|"timeout"|"window">} Options
 */

/**
 * @callback IdFound
 * @param {string} id
 */

/**
 * @typedef StreamPayload
 * @property {string} resource
 * @property {Options} options
 * @property {number} beacon
 * @property {IdFound} onIdFound
 * @property {import('./types').EventListener} onMessage
 * @property {import('./types').EventListener} onError
 * @property {import('./types').EventListener} onClose
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
 * @typedef SendErrorPayload
 * @property {Error} [error]
 * @property {boolean} local
 */

/**
 * @typedef SendClosePayload
 * @property {Error} [error]
 * @property {boolean} local
 */

/**
 * @typedef {ReturnType<stream>} EventSource
 */

/**
 * @type {Map<string, {
 *  onMessage: Array<import('./types').EventListener>,
 *  onError: Array<import('./types').EventListener>,
 *  onClose: Array<import('./types').EventListener>,
 * }>}
 */
const cache = new Map()

/**
 * @type {Map<string, AbortController>}
 */
const controllers = new Map()

/**
 * @type {Map<string, number>}
 */
const connecting = new Map()

/**
 *
 * @param {StreamPayload} payload
 * @returns
 */
export function stream({
  resource,
  options,
  onIdFound,
  onMessage,
  onError,
  onClose,
}) {
  const key = btoa(JSON.stringify({ resource, options }))

  /** @type {StreamState} */
  let readyState = CONNECTING

  const configuration = {
    onClose: [onClose],
    onError: [onError],
    onMessage: [onMessage],
  }

  const result = {
    flush() {
      if (!cache.has(key)) {
        this.controller.abort()
      }
    },
    get controller() {
      let fresh = true
      /**
       * @type {AbortController}
       */
      let controller
      if (controllers.has(key)) {
        const controllerLocal = controllers.get(key)
        if (controllerLocal) {
          controller = controllerLocal
          fresh = false
        } else {
          controller = new AbortController()
          controllers.set(key, controller)
        }
      } else {
        controller = new AbortController()
        controllers.set(key, controller)
      }

      if (fresh) {
        controller.signal.addEventListener('abort', function closed() {
          readyState = CLOSED
          for (const onClose of configuration.onClose) {
            onClose({
              id: '',
              event: 'close',
              data: '',
              connect,
              controller: controller,
            })
          }
          cache.delete(key)
        })
      }

      return controller
    },
    /**
     * @returns {string}
     */
    get resource() {
      return resource
    },
    /**
     * @returns {StreamState}
     */
    get readyState() {
      return readyState
    },
  }

  if (cache.has(key)) {
    const configuration = cache.get(key)
    configuration?.onMessage.push(onMessage)
    configuration?.onError.push(onError)
    configuration?.onClose.push(onClose)
    return result
  }

  cache.set(key, configuration)

  const openWhenHidden = true
  const rest = options ? { ...options } : {}
  async function connect() {
    if (!IS_BROWSER) {
      return
    }

    if (connecting.has(key)) {
      return
    }

    connecting.set(key, Date.now())

    await fetchEventSource(`${resource}`, {
      openWhenHidden,
      ...rest,
      method: 'POST',
      async onopen({ headers }) {
        connecting.delete(key)
        if (!onIdFound) {
          return
        }
        const id = headers.get('x-sse-id')
        if (!id) {
          return
        }
        onIdFound(id ?? '')
      },
      onmessage({ id, event, data }) {
        for (const onMessage of configuration.onMessage) {
          onMessage({
            id,
            event,
            data,
            connect,
            controller: result.controller,
          })
        }
        cache.delete(key)
      },
      onclose() {
        readyState = CLOSED
        for (const onClose of configuration.onClose) {
          onClose({
            id: '',
            event: 'close',
            data: '',
            connect,
            controller: result.controller,
          })
        }
        cache.delete(key)
      },
      onerror(error) {
        readyState = CLOSED
        for (const onError of configuration.onError) {
          onError({
            id: '',
            event: 'error',
            data: '',
            error,
            connect,
            controller: result.controller,
          })
        }
      },
      signal: result.controller.signal,
    })
    readyState = OPEN
  }

  connect().then(function connected() {
    connecting.delete(key)
  })

  return result
}
