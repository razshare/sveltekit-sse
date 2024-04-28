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
 * @property {IdFound} startBeacon
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
  startBeacon,
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
  let localAbort = false
  /** @type {false|function():void} */
  let stopBeacon = false

  /**
   * Userland should never have direct access to this controller.\
   * It should only be used when we want to hint that the abort signal is in some
   * way issued by the server, for example if the server returns a status code >= 300.
   */
  const controller = new AbortController()

  /**
   * Userland should never have direct access to this controller.\
   * Indirection for the actual `controller`.
   */
  const controllerLocal = new AbortController()

  function close() {
    controllerLocal.abort()
  }

  controller.signal.addEventListener('abort', function abort() {
    if (stopBeacon) {
      stopBeacon()
    }
    const id = uuid({ short: true })
    const isLocal = localAbort
    localAbort = false
    for (const onClose of configuration.onClose) {
      onClose({
        id,
        event: 'close',
        data: '',
        connect,
        isLocal,
        status,
        statusText,
        headers,
        xSseId,
        close,
      })
    }
  })

  controllerLocal.signal.addEventListener('abort', function abortLocal() {
    localAbort = true
    controller.abort()
  })

  const result = {
    get controller() {
      return controllerLocal
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

    // Reset beacon stopper
    stopBeacon = false

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
            if (startBeacon) {
              stopBeacon = startBeacon(xSseId ?? '')
            }
          }

          for (const onOpen of configuration.onOpen) {
            onOpen({
              id: '',
              event: 'open',
              data: '',
              connect,
              isLocal: false,
              status,
              statusText,
              headers,
              xSseId,
              close,
            })
          }
        } else {
          // This type of disconnection should be treated as if issued by the server, not the client.
          localAbort = false
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
            isLocal: false,
            status,
            statusText,
            headers,
            xSseId,
            close,
          })
        }
      },
      onclose() {
        if (stopBeacon) {
          stopBeacon()
        }
        for (const onClose of configuration.onClose) {
          onClose({
            id: '',
            event: 'close',
            data: '',
            connect,
            isLocal: false,
            status,
            statusText,
            headers,
            xSseId,
            close,
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
            isLocal: false,
            status,
            statusText,
            headers,
            xSseId,
            close,
          })
        }
      },
      signal: controller.signal,
    })
  }

  connect().then(function connected() {
    connecting.delete(key)
  })

  return result
}
