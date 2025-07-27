import { produce } from '$lib'
import { delay } from '$lib/delay.js'
import { uuid } from '$lib/uuid.js'

export async function POST({ url }) {
  const key = uuid()
  const name = url.searchParams.get('name')
  return produce(async function start({ emit }) {
    while (true) {
      const { error } = emit('message', `hello ${name} ${key}`)
      if (error) {
        return
      }
      await delay(1000)
    }
  })
}
