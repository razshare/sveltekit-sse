import { readable } from 'svelte/store'
import { browser } from '$app/environment'

/**
 * Consume a server sent event as a readable store.
 *
 * > Note: source values rendered on the server will always be initialized with blank (`''`).
 * @param {string} url path of event source.
 * @returns {import('./index.js').ServerSentEventSource}
 */
export function source(url) {
	let onError = []

	const store = readable('', function start(set) {
		if (!browser) {
			set('')
		} else {
			const source = new EventSource(url)

			source.onmessage = function (event) {
				set(event.data)
			}

			source.onerror = function (event) {
				source.close()
				onError.forEach(callback => callback(event))
			}

			return function stop() {
				source.close()
			}
		}
	})

	return {
		subscribe: store.subscribe,
		onError: function (callback) {
			onError.push(callback)
			return this
		},
	}
}
