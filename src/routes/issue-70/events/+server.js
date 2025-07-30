import { produce } from '$lib'
import { delay } from '$lib/delay.js'

export async function POST() {
  return produce(async function start({ emit }) {
    while (true) {
      const { error } = emit('message', `hello ${Date.now()}`)
      if (error) {
        return
      }
      await delay(1000)
    }
  })
}
