/**
 *
 * @param {ReadableStream<Uint8Array>} readable
 * @param {function(Uint8Array<ArrayBufferLike>):void} callback
 */
async function chunk(readable, callback) {
  const reader = readable.getReader()
  while (true) {
    const result = await reader.read()
    if (result.done) {
      return
    }
    callback(result.value)
  }
}

/**
 * @param {Uint8Array<ArrayBufferLike>} a
 * @param {Uint8Array<ArrayBufferLike>} b
 */
function concat(a, b) {
  const res = new Uint8Array(a.length + b.length)
  res.set(a)
  res.set(b, a.length)
  return res
}

/**
 *
 * @param {function(Uint8Array<ArrayBufferLike>,number):void} callback
 * @returns {function(Uint8Array<ArrayBufferLike>):void}
 */
function newLiner(callback) {
  /** @type {Uint8Array<ArrayBufferLike>|undefined} */
  let buffer
  /** @type {number} */
  let position
  /** @type {number} */
  let fieldLength
  let discardTrailingNewline = false

  return function run(value) {
    if (buffer === undefined) {
      buffer = value
      position = 0
      fieldLength = -1
    } else {
      buffer = concat(buffer, value)
    }
    const bufLength = buffer.length
    let lineStart = 0
    while (position < bufLength) {
      if (discardTrailingNewline) {
        if (buffer[position] === 10) {
          lineStart = ++position
        }
        discardTrailingNewline = false
      }
      let lineEnd = -1
      for (; position < bufLength && lineEnd === -1; ++position) {
        switch (buffer[position]) {
          case 58:
            if (fieldLength === -1) {
              fieldLength = position - lineStart
            }
            break
          case 13:
            discardTrailingNewline = true
          // eslint-disable-next-line no-fallthrough
          case 10:
            lineEnd = position
            break
        }
      }
      if (lineEnd === -1) {
        break
      }
      callback(buffer.subarray(lineStart, lineEnd), fieldLength)
      lineStart = position
      fieldLength = -1
    }
    if (lineStart === bufLength) {
      buffer = undefined
    } else if (lineStart !== 0) {
      buffer = buffer.subarray(lineStart)
      position -= lineStart
    }
  }
}
/**
 *
 * @returns {import("./types.external").FetchEventSourceMessage}
 */
function newMessage() {
  return { data: '', event: '', id: '' }
}

/**
 *
 * @param {function(string):void} onid
 * @param {function(number|undefined):void} onretry
 * @param {function(import("./types.external").FetchEventSourceMessage):void} onmessage
 * @returns {function(Uint8Array<ArrayBufferLike>,number)}
 */
function newMessenger(onid, onretry, onmessage) {
  let message = newMessage()
  const decoder = new TextDecoder()
  return function run(line, fieldLength) {
    if (0 === line.length) {
      onmessage(message)
      message = newMessage()
      return
    }

    const field = decoder.decode(line.subarray(0, fieldLength))
    const valueOffset = fieldLength + (line[fieldLength + 1] === 32 ? 2 : 1)
    const value = decoder.decode(line.subarray(valueOffset))
    switch (field) {
      case 'data':
        message.data = message.data ? message.data + '\n' + value : value
        break
      case 'event':
        message.event = value
        break
      case 'id':
        onid((message.id = value))
        break
      case 'retry':
        // eslint-disable-next-line no-case-declarations
        const retry = parseInt(value, 10)
        if (!isNaN(retry)) {
          onretry((message.retry = retry))
        }
        break
    }
  }
}

/**
 * @param {Response} response
 */
async function defaultOnOpen(response) {
  const contentType = response.headers.get('content-type')
  if (!contentType) {
    throw new Error(
      `fetchEventSource expects response content-type to be text/event-stream, received ${contentType} instead`,
    )
  }
}

/**
 *
 * @param {RequestInfo} input
 * @param {import("./types.external").FetchEventSourceInit} init
 * @returns {Promise<void>}
 */
export function fetchEventSource(input, init = {}) {
  return new Promise(function run(resolve, reject) {
    const headers = Object.assign({}, init.headers)
    if (!headers.accept) {
      headers.accept = 'text/event-stream'
    }

    /** @type {number|undefined} */
    let interval = 1000
    /** @type {AbortController|undefined} */
    let controller
    let timer = -1

    function onVisibilityChange() {
      if (controller) {
        controller.abort()
      }
      if (!document.hidden) {
        submit()
      }
    }

    function dispose() {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearTimeout(timer)
      if (controller) {
        controller.abort()
      }
    }

    if (!init.openWhenHidden) {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    if (init.signal) {
      init.signal.addEventListener('abort', function cancel() {
        if (!controller) {
          return
        }
        dispose()
        resolve()
      })
    }

    const onopen = init.onopen ?? defaultOnOpen

    async function submit() {
      controller = new AbortController()

      try {
        const response = await fetch(input, init)
        await onopen(response)
        if (!response.body) {
          reject(new Error(`empty response from source ${input}.`))
          return
        }

        const messenger = newMessenger(
          function onid(id) {
            if (id) {
              headers['last-event-id'] = id
              return
            }
            delete headers['last-event-id']
          },
          function onretry(intervalLocal) {
            interval = intervalLocal
          },
          function onmessage(message) {
            if (!init.onmessage) {
              return
            }
            init.onmessage(message)
          },
        )
        const liner = newLiner(messenger)
        await chunk(response.body, liner)

        if (init.onclose) {
          init.onclose()
        }
        dispose()
        resolve()
      } catch (error) {
        if (!controller.signal.aborted) {
          controller.abort()
          reject(error)
          return
        }

        try {
          if (timer >= 0) {
            window.clearTimeout(timer)
          }

          timer = window.setTimeout(submit, interval)
        } catch (innerError) {
          dispose()
          reject(innerError)
        }
      }
    }

    submit()
  })
}
