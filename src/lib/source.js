import { readable } from 'svelte/store'

/**
 * Consume a server sent event as a readable store.
 * @param {string} url path of event source.
 * @returns {import('svelte/store').Readable<string>}
 */
export function source(url) {
	return readable(undefined, function (set) {
		const source = new EventSource(url)

		source.onmessage = function (event) {
			set(event.data)
		}

		source.onerror = function (event) {
			throw new Error(`Could not read source ${url}.`)
		}
	})
}
