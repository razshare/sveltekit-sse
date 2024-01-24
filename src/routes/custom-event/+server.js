import { event } from '$lib/event.js'

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
  return event(async function run(emit) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      emit(`/custom-event says: ${Date.now()}`)
      // emit(`/custom-event says: hello`)
      await delay(1000)
    }
  }).toResponse()
}
