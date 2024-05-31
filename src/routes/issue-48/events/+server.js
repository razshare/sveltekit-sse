import { produce } from '$lib'

export function POST() {
  return produce(function start({ emit }) {
    const data = { time: Date.now() }
    emit('event0', JSON.stringify(data))
  })
}
