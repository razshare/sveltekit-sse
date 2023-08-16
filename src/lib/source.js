import { readable, writable } from 'svelte/store'
import { browser } from '$app/environment'

/**
 * @type {Map<string, {
 *		eventSource: EventSource,
 * }>}
 * */
const references = new Map()

/**
 *
 * @param {string} url path to the stream.
 */
function connect(url) {
	if (!references.has(url)) {
		const eventSource = new EventSource(url)
		const freshReference = {
			eventSource,
		}
		references.set(url, freshReference)
		return freshReference
	}

	const cachedReference = references.get(url)
	const { eventSource } = cachedReference

	if (eventSource === eventSource.CLOSED) {
		const reconnectedEventSource = new EventSource(url)
		const freshReference = {
			eventSource,
		}
		references.set(url, freshReference)

		return freshReference
	}

	return cachedReference
}

/**
 * Consume a server sent event as a readable store.
 *
 * > **Note**: calling this multiple times using the same `url` string will not create multiple streams, instead the same stream will be reused for all exposed events on the given `url`.
 *
 * > **Note**: source values rendered on the server will always be initialized with blank (`''`).
 * @template {string} EventName
 * @param {string} url path to the stream.
 */
export function source(url) {
	let reconnect = false
	let evensCounter = 0
	/** @type {false|import('svelte/store').Readable<string>} */
	let defaultReadable = false
	return {
		/**
		 * Subscribe to the default `message` event.
		 * @param {function(string):void} callback
		 * @throws when Subscribing callback is not of type `function`.
		 */
		subscribe(callback) {
			if (!browser) {
				return readable('').subscribe(callback)
			}
			const typeOfValue = typeof callback
			if (typeOfValue !== 'function') {
				throw new Error(`Subscribing callback must of type \`function\`, received \`${typeOfValue}\`.`)
			}
			if (defaultReadable) {
				return defaultReadable.subscribe(callback)
			}

			evensCounter++
			const { eventSource } = connect(url)
			evensCounter++
			defaultReadable = readable('', function (set) {
				eventSource.addEventListener('message', function (event) {
					set(event.data)
				})

				return function stop() {
					evensCounter--
					if (evensCounter === 0 && eventSource.readyState !== eventSource.CLOSED) {
						eventSource.close()
					}
					defaultReadable = false
				}
			})

			return defaultReadable.subscribe(callback)
		},
		/**
		 * Execute a callback on error.
		 * @param callback
		 */
		onError(callback) {
			if (!browser) {
				return this
			}
			const typeOfValue = typeof callback
			if (typeOfValue !== 'function') {
				throw new Error(`Error callback must of type \`function\`, received \`${typeOfValue}\`.`)
			}
			const { eventSource } = connect(url)
			eventSource.onerror = function (event) {
				if (!reconnect && eventSource.readyState !== eventSource.CLOSED) {
					eventSource.close()
				}
				callback(event)
			}
			return this
		},
		/**
		 * Wether or not to allow the source to reconnect when an error occurs.
		 * @param reconnect if set to true, the underlying `EventSource` will attempt to reconnect, otherwise the source will be closed immediately after the first error occurs.
		 * @throws when `reconnect` is not of type `boolean`.
		 */
		setReconnect(value) {
			const typeOfValue = typeof eventName
			if (typeOfValue !== 'boolean') {
				throw new Error(`Reconnect value must of type \`boolean\`, received \`${typeOfValue}\`.`)
			}
			reconnect = value
			return this
		},
		/**
		 * Select an event from the stream.
		 * @param {EventName} eventName name of the event
		 * @throws when `eventName` is not of type `string`.
		 */
		select(eventName) {
			if (!browser) {
				return readable('')
			}
			const typeOfValue = typeof eventName
			if (typeOfValue !== 'string') {
				throw new Error(`Event name must of type \`string\`, received \`${typeOfValue}\`.`)
			}
			const { eventSource } = connect(url)

			evensCounter++

			return readable('', function (set) {
				eventSource.addEventListener(eventName, function (event) {
					set(event.data)
				})

				return function stop() {
					evensCounter--
					if (evensCounter === 0 && eventSource.readyState !== eventSource.CLOSED) {
						eventSource.close()
					}
				}
			})
		},
	}
}
