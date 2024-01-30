import { fetchEventSource } from '@microsoft/fetch-event-source'
import { IS_BROWSER } from './constants'

/**
 * @type {import('./types').StreamState}
 */
export const CONNECTING = 0
/**
 * @type {import('./types').StreamState}
 */
export const OPEN = 1
/**
 * @type {import('./types').StreamState}
 */
export const CLOSED = 2

/**
 * @type {import('./types').Stream}
 */
export function stream(resource, options = false, onIdFound = false) {
  /**
   * @type {Map<string, Array<import('./types').ListenerCallback>>}
   */
  const events = new Map()

  /**
   * @type {import('./types').StreamState}
   */
  let readyState = CONNECTING

  const controller = new AbortController()
  const openWhenHidden = true
  const rest = options ? { ...options } : {}
  async function connect() {
    if (!IS_BROWSER) {
      return
    }

    await fetchEventSource(`${resource}`, {
      openWhenHidden,
      ...rest,
      method: 'POST',
      async onopen({ headers }) {
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
        sendMessage({ id, event, data, error: false })
      },
      onclose() {
        readyState = CLOSED
        sendClose()
      },
      onerror(error) {
        readyState = CLOSED
        sendError(error)
      },
      signal: controller.signal,
    })
    readyState = OPEN
  }

  /**
   * @type {import('./types').StreamedClose}
   */
  function close(reason = false) {
    controller.abort(reason)
    readyState = CLOSED
    sendClose()
  }

  /**
   *
   * @param {false|Error} error
   */
  function sendError(error) {
    const currentListeners = events.get('error') ?? []
    for (const listener of currentListeners) {
      listener({ id: '', event: '', data: '', error, connect, close })
    }
  }

  /**
   *
   * @param {false|Error} error
   */
  function sendClose(error = false) {
    const currentListeners = events.get('close') ?? []
    for (const listener of currentListeners) {
      listener({ id: '', event: '', data: '', error, connect, close })
    }
  }

  /**
   *
   * @param {{id:string,event:string,data:string,error:false|Error}} payload
   */
  function sendMessage({ id, event, data }) {
    const decoded = decodeURIComponent(data)
    const currentListeners = events.get(event) ?? []
    for (const listener of currentListeners) {
      listener({
        id,
        event,
        data: decoded,
        error: false,
        connect,
        close,
      })
    }
  }

  connect()

  return {
    get url() {
      return `${resource}`
    },
    get readyState() {
      return readyState
    },
    addEventListener(type, listener) {
      if (!events.has(type)) {
        events.set(type, [])
      }

      const listeners = events.get(type) ?? []
      listeners.push(listener)
    },
    removeEventListener(type, listener) {
      if (!events.has(type)) {
        return
      }
      const listeners = events.get(type) ?? []
      const listenersReplacement = listeners.filter(
        function pass(listenerLocal) {
          return listenerLocal !== listener
        },
      )
      events.set(type, listenersReplacement)
    },
    close,
  }
}
