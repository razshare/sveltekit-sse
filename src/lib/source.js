import { readable } from 'svelte/store'
import { browser } from '$app/environment'

/**
 * @type {Map<string, {
 *		eventSource: EventSource,
		events: Map<string,boolean>,
 * }>}
 * */
const references = new Map()

/**
 * Consume a server sent event as a readable store.
 *
 * > **Note**: calling this multiple times using the same `url` string will not create multiple streams, instead the same stream will be reused for all exposed events on the given `url`.
 *
 * > **Note**: source values rendered on the server will always be initialized with blank (`''`).
 * @param {string} url path to the stream.
 * @param {string} eventName name of the event.
 * @returns {import('./index.js').ServerSentEventSource}
 */
export function source(url, eventName = 'message') {
	/** @type {Array<(import('./index.js').ServerSentEventSourceOnError)>} */
	let onError = []
	const options = {
		reconnect: false,
	}
	const store = readable('', function start(set) {
		if (!browser) {
			set('')
		} else {
			const reference = references.get(url) ?? {
				events: new Map(),
				eventSource: new EventSource(url),
			}

			const events = reference.events
			const eventSource = reference.eventSource

			if (!references.has(url)) {
				references.set(url, reference)
			}

			if (!events.has(eventName)) {
				events.set(eventName, true)
			}

			eventSource.addEventListener(eventName, function (event) {
				set(event.data)
			})

			eventSource.addEventListener('error', function (event) {
				if (!options.reconnect) {
					if (eventSource.readyState !== eventSource.CLOSED) {
						eventSource.close()
					}
				}
				onError.forEach(callback => callback(event, eventSource))
			})

			return function stop() {
				events.set(eventName, false)
				if (eventSource.readyState !== eventSource.CLOSED) {
					eventSource.close()
				}
			}
		}
	})

	return {
		subscribe: store.subscribe,
		onError: function (callback) {
			onError.push(callback)
			return this
		},
		setReconnect: function (reconnect) {
			options.reconnect = reconnect
			return this
		},
	}
}
