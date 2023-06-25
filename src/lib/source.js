import { readable } from 'svelte/store'
import { browser } from '$app/environment'

/**
 * Consume a server sent event as a readable store.
 * @param {string} url path of event source.
 * @returns {import('svelte/store').Readable<string>} source values rendered on the server will always be initialized with blank (`''`).
 */
export function source(url) {
	return readable('', function start(set) {
		if (!browser) {
			set('')
		} else {
			const source = new EventSource(url)

			source.onmessage = function (event) {
				set(event.data)
			}

			source.onerror = function (_) {
				source.close()
				throw new Error(`Could not read source ${url}.`)
			}

			return function stop() {
				source.close()
			}
		}
	})
}
