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
 * @type {Map<string, number>}
 */
const connecting = new Map()

/**
 * @typedef StreamConfiguration
 * @property {Array<import('./types').EventListener>} onError
 * @property {Array<import('./types').EventListener>} onClose
 * @property {Array<import('./types').EventListener>} onMessage
 */

/**
 * @typedef StreamConnection
 * @property {AbortController} controller
 * @property {string} resource
 * @property {StreamState} readyState
 */

/**
 *
 * @param {StreamPayload} payload
 * @returns {StreamConnection}
 */
export function stream({
  resource,
  beacon,
  options,
  onIdFound,
  onMessage,
  onError,
  onClose,
}) {
  const key = btoa(JSON.stringify({ resource, options, beacon }))

  /** @type {StreamState} */
  let readyState = CONNECTING

  /** @type {StreamConfiguration} */
  const configuration = {
    onClose: [onClose],
    onError: [onError],
    onMessage: [onMessage],
  }

  const controller = new AbortController()

  controller.signal.addEventListener('abort', function closed() {
    readyState = CLOSED
  })

  const result = {
    get controller() {
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
