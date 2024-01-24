import { events } from '$lib/events.js'

/**
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function run(resolve) {
    setTimeout(resolve, milliseconds)
  })
}

export function GET() {
  let sendFakeJsonError = true
  return events(async function run(emit) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let stringified

      if (sendFakeJsonError) {
        stringified = 'this is not json'
        sendFakeJsonError = false
      } else {
        stringified = JSON.stringify({ hello: 'world', time: Date.now() })
      }
      emit('event-1', `/events (1) says\n ${Date.now()}`)
      await delay(1000)
      emit('event-2', `/events (2) says\n ${Date.now()}`)
      await delay(1000)
      emit('event-3', `/events (3) says\n ${Date.now()}`)
      await delay(1000)
      emit('event-4', stringified)
    }
  }).toResponse()
}
