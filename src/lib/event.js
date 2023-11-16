import { events } from './events.js'

/**
 * Create one stream and emit one server sent event.
 *
 * > **Note**: the event will be named `message`.
 * @param {import('./events.js').ProducerOfOneEvent} producer
 */
export function event(producer) {
  return events(function run(emit) {
    return producer(function run(data) {
      return emit('message', data)
    })
  })
}
