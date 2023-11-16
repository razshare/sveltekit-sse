import { event } from '$lib/event.js'

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
  console.log('test')
  return event(async function run(emit) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      emit(`/custom-event says \n ${Date.now()}`)
      // emit(`/custom-event says\n hello`)
      await delay(300)
    }
  }).toResponse()
}
