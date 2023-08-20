import { event } from '$lib/event.js'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = milliseconds => new Promise(r => setTimeout(r, milliseconds))

export function GET() {
  return event(async emit => {
    while (true) {
      // emit(`/custom-event says: ${Date.now()}`)
      emit(`/custom-event says: hello`)
      await delay(1000)
    }
  }).toResponse()
}
