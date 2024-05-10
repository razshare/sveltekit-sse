import { events } from '$lib'

/**
 *
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function start(resolve) {
    setTimeout(resolve, milliseconds)
  })
}

export async function POST({ request }) {
  return events({
    request,
    async start({ emit }) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        emit('message', `${Date.now()}`)
        await delay(1000)
      }
    },
  })
}
