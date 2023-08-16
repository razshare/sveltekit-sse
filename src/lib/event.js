import { events } from './events.js'

/**
 * Create one stream and emit one server sent event.
 *
 * > **Note**: the even will be named `message`.
 * @param {import("./index.js").ProducerOfOneEvent} producer
 */
export function event(producer) {
	return events(emit => producer(data => emit('message', data)))
}
