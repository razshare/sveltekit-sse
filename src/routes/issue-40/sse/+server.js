import { events } from '$lib'

/**
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function run(resolve) {
    setTimeout(resolve, milliseconds)
  })
}

export function POST({ request }) {
  return events({
    request,
    async start({ emit }) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        emit('message', 'hello world')
        await delay(1000)
      }
    },
  })
}
