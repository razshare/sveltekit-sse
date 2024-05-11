import { produce } from '$lib'
import { delay } from '$lib/delay.js'

export async function POST() {
  return produce(async function start({ emit }) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { error } = emit('message', `${Date.now()}`)
      if (error) {
        return
      }
      await delay(1000)
    }
  })
}
