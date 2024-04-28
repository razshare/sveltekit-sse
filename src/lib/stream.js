import {
  EventStreamContentType,
  fetchEventSource,
} from '@microsoft/fetch-event-source'
import { IS_BROWSER } from './constants'
import { uuid } from './uuid'

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
 * @property {import('./types').EventListener} onOpen
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
 * @property {Array<import('./types').EventListener>} onOpen
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
  onOpen,
}) {
  const key = btoa(JSON.stringify({ resource, options, beacon }))

  /** @type {StreamConfiguration} */
  const configuration = {
    onClose: [onClose],
    onError: [onError],
    onMessage: [onMessage],
    onOpen: [onOpen],
  }

  // Assume the worst then let `onopen()` handle the rest
  let status = 500
  let statusText = 'Internal Server Error'
  let headers = new Headers()
  /** @type {false|string} */
  let xSseId = false

  const controller = new AbortController()

  controller.signal.addEventListener('abort', function abort() {
    const id = uuid({ short: true })
    const headers = new Headers()
    for (const onClose of configuration.onClose) {
      onClose({
        id,
        event: 'close',
        data: '',
        connect,
        controller: result.controller,
        isLocal: false,
        status,
        statusText,
        headers,
        xSseId,
      })
    }
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

    // Reset assumptions on new connections
    status = 500
    statusText = 'Internal Server Error'
    headers = new Headers()

    await fetchEventSource(`${resource}`, {
      openWhenHidden,
      ...rest,
      method: 'POST',
      async onopen({
        headers: headersLocal,
        status: statusLocal,
        statusText: statusTextLocal,
        ok,
      }) {
        status = statusLocal
        statusText = statusTextLocal
        headers = headersLocal
        connecting.delete(key)

        if (ok && headers.get('content-type') === EventStreamContentType) {
          const xSseIdLocal = headers.get('x-sse-id')
          if (xSseIdLocal) {
            xSseId = xSseIdLocal
            if (onIdFound) {
              onIdFound(xSseId ?? '')
            }
          }

          for (const onOpen of configuration.onOpen) {
            onOpen({
              id: '',
              event: 'open',
              data: '',
              connect,
              controller: result.controller,
              isLocal: false,
              status,
              statusText,
              headers,
              xSseId,
            })
          }
        } else {
          controller.abort()
        }
      },
      onmessage({ id, event, data }) {
        for (const onMessage of configuration.onMessage) {
          onMessage({
            id,
            event,
            data,
            connect,
            controller: result.controller,
            isLocal: false,
            status,
            statusText,
            headers,
            xSseId,
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
            isLocal: false,
            status,
            statusText,
            headers,
            xSseId,
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
            isLocal: false,
            status,
            statusText,
            headers,
            xSseId,
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
