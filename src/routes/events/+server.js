import { events } from '$lib/events.js'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = milliseconds => new Promise(r => setTimeout(r, milliseconds))

export function GET() {
	return events(async emit => {
		while (true) {
			emit('event-1', `hello from event-1: ${Date.now()}`)
			emit('event-2', `hello from event-2: ${Date.now()}`)
			await delay(1000)
		}
	}).toResponse()
}
