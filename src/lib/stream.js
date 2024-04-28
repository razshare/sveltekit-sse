import { fetchEventSource } from '@microsoft/fetch-event-source'
import { IS_BROWSER } from './constants'

/**
 * @callback IdFound
 * @param {string} id
 */

/**
 * @typedef StreamPayload
 * @property {string} resource
 * @property {import('./types').Options} options
 * @property {number} beacon
 * @property {IdFound} onIdFound
 * @property {import('./types').EventListener} onMessage
 * @property {import('./types').EventListener} onError
 * @property {import('./types').EventListener} onClose
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

  /** @type {StreamConfiguration} */
  const configuration = {
    onClose: [onClose],
    onError: [onError],
    onMessage: [onMessage],
  }

  const controller = new AbortController()

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
  }

  connect().then(function connected() {
    connecting.delete(key)
  })

  return result
}
