import { IS_BROWSER } from './constants'
import { fetchEventSource } from './fetchEventSource'
import { uuid } from './uuid'

/**
 *
 * @param {string} resource
 * @param {import('./types.external').Options} options
 * @returns {import('./types.internal').ConsumedStream}
 */
export function consume(resource, options = {}) {
  const events = {
    /** @type {import('./types.external').EventListener[]} */
    onclose: [],
    /** @type {import('./types.external').EventListener[]} */
    onerror: [],
    /** @type {import('./types.external').EventListener[]} */
    onmessage: [],
    /** @type {import('./types.external').EventListener[]} */
    onopen: [],
  }

  if (options.onclose) {
    events.onclose.push(options.onclose)
  }
  if (options.onerror) {
    events.onerror.push(options.onerror)
  }
  if (options.onmessage) {
    events.onmessage.push(options.onmessage)
  }
  if (options.onopen) {
    events.onopen.push(options.onopen)
  }

  // Assume the worst then let `onopen()` handle the rest
  let status = 500
  let statusText = 'Internal Server Error'
  let headers = new Headers()
  let localAbort = false
  /** @type {Response|false} */
  let response = false

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

    for (const onclose of events.onclose) {
      if (!response) {
        continue
      }
      onclose({
        id,
        name: 'close',
        data: '',
        connect,
        isLocal,
        status,
        statusText,
        headers,
        close,
        response,
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
      async onopen(responseLocal) {
        response = responseLocal
        const {
          headers: headersLocal,
          status: statusLocal,
          statusText: statusTextLocal,
          ok,
        } = response
        status = statusLocal
        statusText = statusTextLocal
        headers = headersLocal

        if (ok && headers.get('content-type') === 'text/event-stream') {
          for (const onopen of events.onopen) {
            onopen({
              id: '',
              name: 'open',
              data: '',
              connect,
              isLocal: false,
              status,
              statusText,
              headers,
              close,
              response,
            })
          }
        } else {
          // This type of disconnection should be treated as if issued by the server, not the client.
          localAbort = false
          controller.abort()
        }
      },
      onmessage({ id, event, data }) {
        for (const onmessage of events.onmessage) {
          if (!response) {
            continue
          }
          onmessage({
            id,
            name: event,
            data,
            connect,
            isLocal: false,
            status,
            statusText,
            headers,
            close,
            response,
          })
        }
      },
      onclose() {
        for (const onclose of events.onclose) {
          if (!response) {
            continue
          }
          onclose({
            id: '',
            name: 'close',
            data: '',
            connect,
            isLocal: false,
            status,
            statusText,
            headers,
            close,
            response,
          })
        }
      },
      onerror(error) {
        for (const onerror of events.onerror) {
          if (!response) {
            continue
          }
          onerror({
            id: '',
            name: 'error',
            data: '',
            error,
            connect,
            isLocal: false,
            status,
            statusText,
            headers,
            close,
            response,
          })
        }
      },
      signal: controller.signal,
    })
  }
  connect()
  return result
}
