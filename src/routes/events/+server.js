import { events } from '$lib/events.js'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = function run(milliseconds) {
  return new Promise(function run(r) {
    return setTimeout(r, milliseconds)
  })
}

export function GET() {
  return events(async function run(emit) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      emit('event-1', `/events (1) says\n ${Date.now()}`)
      await delay(1000)
      emit('event-2', `/events (2) says\n ${Date.now()}`)
      await delay(1000)
      emit('event-3', `/events (3) says\n ${Date.now()}`)
      await delay(1000)
    }
  }).toResponse()
}
