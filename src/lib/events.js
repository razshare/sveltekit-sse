import { id } from './id.js'

/**
 * @param {ReadableStreamDefaultController} controller
 */
function createEmitter(controller) {
	const eventId = `id: ${id()}`
	/** @type {function(string):void} */
	return function (eventName, data) {
		const payload = `${eventId}\nevent: ${eventName}\ndata: ${data}\n\n`
		controller.enqueue(payload)
	}
}

/**
 * @param {import("./index.js").ProducerOfManyEvents} producer
 * @param {Array<function(string):void|PromiseLike<void>>} onCancel
 */
function createStream(producer, onCancel) {
	return new ReadableStream({
		async start(controller) {
			const customEmitter = createEmitter(controller)
			await producer(customEmitter)
			controller.close()
		},
		cancel: async function () {
			for (const callback of onCancel) {
				await callback()
			}
		},
	})
}

/**
 * Create one stream and emit multiple server sent events.
 * @param {import('./index.js').ProducerOfManyEvents} producer
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
		 * @param {function(string):void|PromiseLike<void>} callback
		 * @returns
		 */
		onCancel(callback) {
			onCancel.push(callback)
			return this
		},
		/**
		 * @returns The underlying stream used by the event.
		 */
		getStream() {
			if (!stream) {
				stream = createStream(producer, onCancel)
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
