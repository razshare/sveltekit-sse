import { produce } from '$lib'
import { delay } from '$lib/delay.js'

export async function POST() {
  return produce(async function start({ emit }) {
    let counter = 0
    while (counter < 3) {
      const { error } = emit('message', `hello ${Date.now()}`)
      if (error) {
        return
      }
      counter++
      await delay(100)
    }
    // we need this in order to test an abrupt shutdown of the server
    process.exit(1)
  })
}
