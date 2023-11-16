const decoder = new TextDecoder()

/**
 *
 * @param { ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {function(string):void} callback
 */
async function readlines(reader, callback) {
  let previous = ''
  let result
  do {
    result = await reader.read()
    const chunk = decoder.decode(result.value)

    const lines = chunk.split('\n')
    for (let index = 0; index < lines.length; index++) {
      const line = previous + lines[index]
      callback(line)
      if (index === lines.length - 1) {
        previous = line
      } else {
        previous = ''
      }
    }
  } while (!result.done)
}

/**
 *
 * @param {string} line
 * @param {"id"|"event"|"data"} token
 */
function parse(line, token) {
  if (!line) {
    return false
  }
  if (line.startsWith(`${token}: `)) {
    return line.substring(token.length + 2) ?? ''
  }

  return false
}

/**
 * @typedef HttpStreamEvent
 * @property {string} id
 * @property {string} event
 * @property {string} data
 * @property {false|Error} error
 */

/**
 * @typedef {function(HttpStreamEvent):void} HttpEventCallback
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
 * Stream an http request (using `fetch` underneath) as if it were an `EventSource`.
 *
 * This will allow you to set custom http headers for the request, which the standard `EventSource` does not permit.
 * @param {RequestInfo|URL} resource This defines the resource that you wish to fetch. This can either be:
 * - A string or any other object with a [stringifier](https://developer.mozilla.org/en-US/docs/Glossary/Stringifier) — including a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object — that provides the URL of the resource you want to fetch.
 * - A [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.
 * @param {false|RequestInit} [options] An object containing any custom settings that you want to apply to the request. The possible options are:
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
 * @throws When the request fails with a status of >= 300.
 * @throws When the body of the response is not readable.
 */
export function stream(resource, options = false) {
  /**
   * @type {false|Response}
   */
  let response = false

  /**
   * @type {Map<string, Array<HttpEventCallback>>}
   */
  const events = new Map()

  /**
   * @type {State}
   */
  let readyState = CONNECTING

  /**
   * @type {false|string}
   */
  let current_id = false
  /**
   * @type {Array<string>}
   */
  let current_data = []
  /**
   * @type {false|string}
   */
  let current_event = false

  let blank_counter = 0

  /**
   * @type {false| ReadableStreamDefaultReader<Uint8Array>}
   */
  let reader = false

  /**
   *
   * @param {false|Error} error
   */
  function send_error(error) {
    const current_listeners = events.get('error') ?? []
    for (const listener of current_listeners) {
      listener({ id: '', event: '', data: '', error })
    }
  }

  function flush() {
    if (current_id && current_event && current_data) {
      const current_listeners = events.get(current_event) ?? []
      for (const listener of current_listeners) {
        listener({
          id: current_id,
          event: current_event,
          data: current_data.join('\n'),
          error: false,
        })
      }
      current_id = ''
      current_event = ''
      current_data = []
    }
  }

  const promise_response = fetch(resource, options ? options : undefined)
  promise_response
    .then(function start(response_local) {
      response = response_local
      if (response.status >= 300) {
        readyState = CLOSED
        send_error(
          new Error(
            `Http request failed with status ${response.status} ${response.statusText}.`,
          ),
        )
        return
      }

      if (!response.body) {
        send_error(
          new Error(`Something went wrong, could not read the response body.`),
        )
        return
      }

      reader = response.body.getReader()

      readlines(reader, function run(line) {
        if ('' === line) {
          if (++blank_counter > 1) {
            return
          }
          // console.log({
          //   current_id,
          //   current_event,
          //   current_data: current_data.join('\n'),
          // })
          flush()
          return
        }

        blank_counter = 0

        const id = parse(line, 'id')
        const event = parse(line, 'event')
        const data = parse(line, 'data')

        if (id) {
          current_id = id
        }

        if (event) {
          current_event = event
        }

        if (data) {
          current_data.push(data)
        }
      })
    })
    .catch(function stop() {
      readyState = CLOSED
    })

  return {
    /**
     * @param {HttpEventCallback} listener
     */
    set onerror(listener) {
      events.set('error', [listener])
    },
    /**
     * @param {HttpEventCallback} listener
     */
    set onmessage(listener) {
      events.set('message', [listener])
    },
    /**
     * @param {HttpEventCallback} listener
     */
    set onopen(listener) {
      events.set('open', [listener])
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
     * @param {HttpEventCallback} listener
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
     * @param {HttpEventCallback} listener
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
    async close(reason = undefined) {
      if (!reader) {
        return
      }
      await reader.cancel(reason)
      reader.releaseLock()
    },
  }
}
