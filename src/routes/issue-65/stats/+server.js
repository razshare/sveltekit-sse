import { produce } from '$lib'
import { delay } from '$lib/delay'

export function POST() {
  return produce(
    async function start({ emit, lock }) {
      while (lock) {
        emit(
          'message',
          JSON.stringify({
            cpu_usage: '0.00%',
            memory: '200.67 MB',
            time: Date.now(),
          }),
        )
        await delay(1000)
      }
    },
    {
      stop() {
        console.info('SSE client disconnected.')
      },
    },
  )
}
