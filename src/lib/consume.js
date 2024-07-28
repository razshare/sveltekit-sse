import {
  EventStreamContentType,
  fetchEventSource,
} from '@microsoft/fetch-event-source'
import { IS_BROWSER } from './constants'
import { uuid } from './uuid'

/**
 *
 * @param {import('./types').ConsumePayload} payload
 * @returns {import('./types').ConsumedStream}
 */
export function consume({
  resource,
  options,
  onMessage,
  onError,
  onClose,
  onOpen,
}) {
  /** @type {import('./types').StreamEvents} */
  const events = {
    onClose: [onClose],
    onError: [onError],
    onMessage: [onMessage],
    onOpen: [onOpen],
  }

  // Assume the worst then let `onopen()` handle the rest
  let status = 500
  let statusText = 'Internal Server Error'
  let headers = new Headers()
  let localAbort = false

  /**
   * Userland should never have direct access to this controller.\
   * It should only be used when we want to hint that the abort signal is in some
   * way issued by the server, for example if the server returns a status code >= 300.
   */
  let controller = new AbortController()

  /**
   * Userland should never have direct access to this controller.\
   * Indirection for the actual `controller`.
   */
  let controllerLocal = new AbortController()

  let firstControllerWiring = true

  function abort() {
    const id = uuid({ short: true })
    const isLocal = localAbort
    localAbort = false
    for (const onClose of events.onClose) {
      onClose({
        id,
        event: 'close',
        data: '',
        connect,
        isLocal,
        status,
        statusText,
        headers,
        close,
      })
    }
  }

  function abortLocal() {
    localAbort = true
    controller.abort()
  }

  function wireControllers() {
    if (!firstControllerWiring) {
      controller.signal.removeEventListener('abort', abort)
      controllerLocal.signal.removeEventListener('abort', abortLocal)
      controller = new AbortController()
      controllerLocal = new AbortController()
    } else {
      firstControllerWiring = false
    }

    controller.signal.addEventListener('abort', abort)

    controllerLocal.signal.addEventListener('abort', abortLocal)
  }

  function close() {
    controllerLocal.abort()
  }

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

    // Reset assumptions on new connections
    status = 500
    statusText = 'Internal Server Error'
    headers = new Headers()

    wireControllers()

    await fetchEventSource(`${resource}`, {
      openWhenHidden,
      method: 'POST',
      ...rest,
      async onopen({
        headers: headersLocal,
        status: statusLocal,
        statusText: statusTextLocal,
        ok,
      }) {
        status = statusLocal
        statusText = statusTextLocal
        headers = headersLocal

        if (ok && headers.get('content-type') === EventStreamContentType) {
          for (const onOpen of events.onOpen) {
            onOpen({
              id: '',
              event: 'open',
              data: '',
              connect,
              isLocal: false,
              status,
              statusText,
              headers,
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
        for (const onMessage of events.onMessage) {
          onMessage({
            id,
            event,
            data,
            connect,
            isLocal: false,
            status,
            statusText,
            headers,
            close,
          })
        }
      },
      onclose() {
        for (const onClose of events.onClose) {
          onClose({
            id: '',
            event: 'close',
            data: '',
            connect,
            isLocal: false,
            status,
            statusText,
            headers,
            close,
          })
        }
      },
      onerror(error) {
        for (const onError of events.onError) {
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
            close,
          })
        }
      },
      signal: controller.signal,
    })
  }

  connect()

  return result
}
