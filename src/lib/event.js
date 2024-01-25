import { events } from './events.js'

/**
 * Create one stream and emit one server sent event.
 *
 * > **Note**: the event will be named `message`.
 * @param {import('./events.js').ProducerOfOneEvent} producer a callback that will be provided an `emit()` function which you can use to send data to the client.
 * @param {import('./events.js').EventsOptions} [options] options for the event.
 */
export function event(producer, options = { locked: false }) {
  return events(function run(emit) {
    return producer(function run(data) {
      return emit('message', data)
    })
  }, options)
}
