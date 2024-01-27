import { events } from './events.js'

/**
 * Create one stream and emit one server sent event.
 *
 * > **Note**\
 * > This will use the default event, which is `message`.
 * @type {import('./types.js').CreatorOfOneEventGateway}
 */
export function event(
  producer,
  options = {
    /** @type {false} */
    locked: false,
  },
) {
  return events(function run(emit) {
    return producer(function run(data) {
      return emit('message', data)
    })
  }, options)
}
