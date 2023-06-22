/**
 * @param {ReadableStreamDefaultController} controller
 */
function createEmitter(controller) {
	/** @type {function(undefined|string):void} */
	return function (data) {
		controller.enqueue(`data: ${data}\n\n`)
	}
}

/**
 * @param {ReadableStreamDefaultController} controller
 */
function createPinger(controller) {
	/** @type {function(undefined|string):void} */
	return function () {
		controller.enqueue(`event:ping\ndata:\n\n`)
	}
}

/**
 * @param {import("./index.js").Producer} producer
 * @param {function(undefiend|string):void|Promise<void>} onCancel
 */
function createStream(producer, cancelCallback) {
	return new ReadableStream({
		async start(controller) {
			await producer(createEmitter(controller), createPinger(controller))
			controller.close()
		},
		cancel: cancelCallback,
	})
}

/**
 * Create a server sent event.
 * @param {import("./index.js").Producer} producer
 */
export function event(producer) {
	/** @type {function(undefiend|string):void|Promise<void>} */
	let cancelCallback = undefined
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
		 * @param {function(undefiend|string):void|Promise<void>} callback
		 * @returns
		 */
		onCancel(callback) {
			cancelCallback = callback()
			return this
		},
		/**
		 * @returns The underlying stream used by the event.
		 */
		getStream() {
			if (!stream) {
				stream = createStream(producer, cancelCallback)
			}
			return stream
		},
		/**
		 * Build a `Response`.
		 * @returns Response
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
