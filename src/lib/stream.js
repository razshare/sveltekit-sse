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
 * @property {RequestInfo|URL} resource
 * @property {Options} options
 * @property {number} beacon
 * @property {IdFound} [onIdFound]
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
 */

/**
 * @typedef SendClosePayload
 * @property {Error} [error]
 */

/**
 * @typedef {ReturnType<stream>} EventSource
 */

/**
 *
 * @param {StreamPayload} payload
 * @returns
 */
export function stream({ resource, options, onIdFound }) {
  /**
   * @type {Map<string, Array<import('./types').EventListener>>}
   */
  const events = new Map()

  /**
   * @type {StreamState}
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
        sendMessage({ id, event, data })
      },
      onclose() {
        readyState = CLOSED
        sendClose({})
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
   *
   * @param {import('./types').ClosePayload} payload
   */
  function close({ reason }) {
    controller.abort(reason)
    readyState = CLOSED
    sendClose({})
  }

  /**
   *
   * @param {SendErrorPayload} payload
   */
  function sendError({ error }) {
    const currentListeners = events.get('error') ?? []
    for (const listener of currentListeners) {
      listener({ id: '', event: '', data: '', error, connect, close })
    }
  }

  /**
   *
   * @param {SendClosePayload} reason
   */
  function sendClose({ error }) {
    const currentListeners = events.get('close') ?? []
    for (const listener of currentListeners) {
      listener({ id: '', event: '', data: '', error, connect, close })
    }
  }

  /**
   * @typedef SendMessagePayload
   * @property {string} id
   * @property {string} event
   * @property {string} data
   * @property {Error} [error]
   */

  /**
   *
   * @param {SendMessagePayload} payload
   */
  function sendMessage({ id, event, data }) {
    const decoded = decodeURIComponent(data)
    const currentListeners = events.get(event) ?? []
    for (const listener of currentListeners) {
      listener({
        id,
        event,
        data: decoded,
        connect,
        close,
      })
    }
  }

  connect()

  return {
    /**
     * @returns {string}
     */
    get url() {
      return `${resource}`
    },
    /**
     * @returns {StreamState}
     */
    get readyState() {
      return readyState
    },
    /**
     *
     * @param {string} name
     * @param {import('./types').EventListener} listener
     */
    addEventListener(name, listener) {
      if (!events.has(name)) {
        events.set(name, [])
      }

      const listeners = events.get(name) ?? []
      listeners.push(listener)
    },
    /**
     *
     * @param {string} name
     * @param {import('./types').EventListener} listener
     * @returns
     */
    removeEventListener(name, listener) {
      if (!events.has(name)) {
        return
      }
      const listeners = events.get(name) ?? []
      const listenersReplacement = listeners.filter(
        function pass(listenerLocal) {
          return listenerLocal !== listener
        },
      )
      events.set(name, listenersReplacement)
    },
    close,
  }
}
