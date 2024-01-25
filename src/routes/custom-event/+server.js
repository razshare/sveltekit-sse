import { event } from '$lib/event.js'
import { writable } from 'svelte/store'

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
  const locked = writable(true)
  return event(
    async function run(emit) {
      for (let index = 0; index < 10; index++) {
        console.log(`/custom-event says: ${Date.now()}`)
        emit(`/custom-event says: ${Date.now()}`)
        await delay(1000)
      }
      console.log(`/custom-event says: BYE!`)
      emit(`/custom-event says: BYE!`)
      locked.set(false) // this will close the connection
    },
    { locked },
  ).toResponse()
}
