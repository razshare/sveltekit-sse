/**
 * Send data to the client.
 * @callback EmitterOfOneEvent
 * @param {string} data
 * @throws when `data` is not of type `string`.
 * @returns {void}
 */

/**
 * @callback ProducerOfOneEvent
 * @param {EmitterOfOneEvent} emit
 * @returns {void}
 */

/**
 * Send data to the client.
 * @callback EmitterOfManyEvents
 * @param {string} eventName
 * @param {string} data
 * @throws when `eventname` or `data` are not of type `string`.
 * @returns {void}
 */

/**
 * @callback ProducerOfManyEvents
 * @param {EmitterOfManyEvents} emit
 * @returns {void}
 */

/**
 * @param {ReadableStreamDefaultController} controller
 */
function createEmitter(controller) {
  let id = 1
  /** @type {function(string):void} */
  return function (eventName, data) {
    const typeOfEventName = typeof eventName
    const typeOfData = typeof data
    if (typeOfEventName !== 'string') {
      throw new Error(`Event name must of type \`string\`, received \`${typeOfEventName}\`.`)
    }
    if (typeOfData !== 'string') {
      throw new Error(`Event data must of type \`string\`, received \`${typeOfData}\`.`)
    }
    const payload = `id: ${id}\nevent: ${eventName}\ndata: ${data}\n\n`
    controller.enqueue(payload)
    id++
  }
}

/**
 * @callback OnCancelCallback
 * @param {ReadableStream} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * @param {ProducerOfManyEvents} producer
 * @param {Array<OnCancelCallback>} onCancel
 */
function createStream(producer, onCancel) {
  return new ReadableStream({
    async start(controller) {
      const customEmitter = createEmitter(controller)
      await producer(customEmitter)
      controller.close()
    },
    async cancel() {
      for (const callback of onCancel) {
        await callback(this)
      }
    },
  })
}

/**
 * Create one stream and emit multiple server sent events.
 * @param {ProducerOfManyEvents} producer
 */
export function events(producer) {
  /** @type {Array<function(string):void|PromiseLike<void>>} */
  const onCancel = []
  /** @type {Map<string,string>} */
  const headers = new Map()
  /** @type undefined|ReadableStream */
  let stream = undefined

  return {
    /**
     * Set a response header.
     *
     * ### Note
     * The following headers are set by default for all events:
     * ```json
     * {
     *   "Cache-Control": "no-store",
     *   "Content-Type": "text/event-stream",
     *   "Connection": "keep-alive",
     * }
     * ```
     *
     * ### Warning
     * Overwriting the default headers is allowed.
     *
     * Overwriting header `Content-Type` to something other than `text/event-stream` will break the SSE contract and the event will stop working as intended.
     * @param {string} key
     * @param {string} value
     */
    setHeader(key, value) {
      headers.set(key, value)
      return this
    },
    /**
     * Do something after the stream has been canceled.
     * @param {OnCancelCallback} callback
     */
    onCancel(callback) {
      onCancel.push(callback)
      return this
    },
    /**
     * Get the underlying stream used by the event.
     */
    getStream() {
      if (!stream) {
        stream = createStream(producer, onCancel)
      }
      return stream
    },
    /**
     * Build a `Response`.
     */
    toResponse() {
      return new Response(this.getStream(), {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          ...headers,
        },
      })
    },
  }
}
