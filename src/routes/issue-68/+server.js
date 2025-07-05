import { produce } from '$lib'
import { delay } from '$lib/delay'

export function GET({ request }) {
  let name = 'unknown'
  if (request.headers.has('X-Name')) {
    name = request.headers.get('X-Name') ?? 'unknown'
  }

  return produce(async function start({ emit, lock }) {
    while (lock) {
      emit('message', `Hello ${name}, the time is ${Date.now()}`)
      await delay(1000)
    }
  })
}
