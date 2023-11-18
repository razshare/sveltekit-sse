import { fetchEventSource } from '@microsoft/fetch-event-source'
import { IS_BROWSER } from './constants'

/**
 * @typedef Message
 * @property {string} data
 * @property {string} event
 * @property {string} id
 */

/**
 * @callback CloseStream
 * @param {false|string} reason a short description explaining the reason for closing the stream.
 */

/**
 * @callback ConnectStream
 */

/**
 * @typedef Event
 * @property {string} id message identifier.
 * @property {string} event name of the event.
 * @property {string} data incoming message.
 * @property {false|Error} error
 * @property {ConnectStream} connect connect to the stream.
 * > **Note**\
 * > You can use this whenever the stream disconnects for any reason in order to reconnect.
 *
 * Example
 * ```js
 * const connection = source('/custom-event')
 * connection.onclose(function run({ connect }) {
 *   console.log('stream closed')
 *   connect()
 * })
 * ```
 * @property {CloseStream} close close the stream.
 */

/**
 * @typedef {function(Event):void} ListenerCallback
 */

/**
 * @typedef {0|1|2} State
 */

/**
 * @type {State}
 */
export const CONNECTING = 0
/**
 * @type {State}
 */
export const OPEN = 1
/**
 * @type {State}
 */
export const CLOSED = 2

/**
 * @template T
 * @typedef {{[K in keyof T]:T[K]} & {}} Pretty
 */

/**
 * @typedef {Pretty<Pick<import('@microsoft/fetch-event-source').FetchEventSourceInit, "body"|"cache"|"credentials"|"fetch"|"headers"|"integrity"|"keepalive"|"method"|"mode"|"openWhenHidden"|"redirect"|"referrer"|"referrerPolicy"|"timeout"|"window">>} Options
 */

/**
 * Stream an http request (using `fetch` underneath) as if it were an `EventSource`.
 *
 * This will allow you to set custom http headers for the request, which the standard `EventSource` does not permit.
 * @param {RequestInfo|URL} resource This defines the resource that you wish to fetch. This can either be:
 * - A string or any other object with a [stringifier](https://developer.mozilla.org/en-US/docs/Glossary/Stringifier) — including a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object — that provides the URL of the resource you want to fetch.
 * - A [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.
 * @param {false|Options} options An object containing any custom settings that you want to apply to the request. The possible options are:
 * - `method`\
 *   The request method, e.g., `"GET"`, `"POST"`.\
 *   The default is `"GET"`.
 * - `headers`\
 *   Any headers you want to add to your request, contained within a [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object or an object literal with [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) values.
 * > **Note**\
 * > [some names are forbidden](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name).
 * - `body`\
 *   Any body that you want to add to your request: this can be a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob), an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), a [TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), a [DataView](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView), a [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData), a [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams), string object or literal, or a [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) object. This latest possibility is still experimental; check the [compatibility information](https://developer.mozilla.org/en-US/docs/Web/API/Request#browser_compatibility) to verify you can use it.
 * > **Note**\
 * > a request using the GET or HEAD method cannot have a body.
 */
export function stream(resource, options = false) {
  /**
   * @type {Map<string, Array<ListenerCallback>>}
   */
  const events = new Map()

  /**
   * @type {State}
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
   * Close the stream.
   * @param {false|string} reason a short description explaining the reason for closing the stream.
   * @returns
   */
  function close(reason = false) {
    console.log({ reason })
    controller.abort()
    // const reader_local = reader
    // reader = false
    // if (!reader_local) {
    //   controller.abort()
    //   return
    // }
    // await reader_local.cancel(reason ? reason : undefined)
    // reader_local.releaseLock()
  }

  /**
   *
   * @param {false|Error} error
   */
  function sendError(error) {
    const current_listeners = events.get('error') ?? []
    for (const listener of current_listeners) {
      listener({ id: '', event: '', data: '', error, connect, close })
    }
  }

  /**
   *
   * @param {false|Error} error
   */
  function sendClose(error = false) {
    const current_listeners = events.get('close') ?? []
    for (const listener of current_listeners) {
      listener({ id: '', event: '', data: '', error, connect, close })
    }
  }

  /**
   *
   * @param {{id:string,event:string,data:string,error:false|Error}} payload
   */
  function sendMessage({ id, event, data }) {
    const current_listeners = events.get('message') ?? []
    for (const listener of current_listeners) {
      listener({
        id,
        event,
        data,
        error: false,
        connect,
        close,
      })
    }
  }

  connect()

  return {
    /**
     * @param {ListenerCallback} listener
     */
    set onerror(listener) {
      events.set('error', [listener])
    },
    /**
     * @param {ListenerCallback} listener
     */
    set onmessage(listener) {
      events.set('message', [listener])
    },
    /**
     * @param {ListenerCallback} listener
     */
    set onopen(listener) {
      events.set('open', [listener])
    },
    /**
     * @param {ListenerCallback} listener
     */
    set onclose(listener) {
      events.set('close', [listener])
    },
    /**
     * The URL the stream is connecting to.
     */
    get url() {
      return `${resource}`
    },
    /**
     * State of the stream.
     *
     * It can be
     * - `CONNECTING` = `0`
     * - `OPEN` = `1`
     * - `CLOSED` = `2`
     */
    get readyState() {
      return readyState
    },
    /**
     * Add a new event listener.
     * @param {string} type
     * @param {ListenerCallback} listener
     */
    addEventListener(type, listener) {
      if (!events.has(type)) {
        events.set(type, [])
      }

      const listeners = events.get(type) ?? []
      listeners.push(listener)
    },

    /**
     * Remove an event listener.
     * @param {string} type
     * @param {ListenerCallback} listener
     */
    removeEventListener(type, listener) {
      if (!events.has(type)) {
        return
      }
      const listeners = events.get(type) ?? []
      const listeners_replacement = listeners.filter(function pass(
        listener_local,
      ) {
        return listener_local !== listener
      })
      events.set(type, listeners_replacement)
    },
    /**
     * Close the stream.
     * @param {string} [reason] a short description explaining the reason for closing the stream.
     */
    close,
  }
}
