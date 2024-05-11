import { events } from '$lib'
import { delay } from '$lib/delay.js'

export async function POST({ request }) {
  return events({
    request,
    async start({ emit }) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { error } = emit('message', `${Date.now()}`)
        if (error) {
          return
        }
        await delay(1000)
      }
    },
  })
}
