import { events } from '$lib/events.js'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = milliseconds => new Promise(r => setTimeout(r, milliseconds))

export function GET() {
  return events(async emit => {
    while (true) {
      emit('event-1', `/events (1) says: ${Date.now()}`)
      emit('event-2', `/events (2) says: ${Date.now()}`)
      emit('event-3', `/events (3) says: ${Date.now()}`)
      await delay(2000)
    }
  }).toResponse()
}
