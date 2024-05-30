import { produce, source } from '$lib'

/**
 *
 * @param {Array<string>} eventNames
 */
export function produceSSE(eventNames) {
  return produce(function start({ emit }) {
    for (const eventName of eventNames) {
      const data = { time: Date.now() }
      emit(eventName, JSON.stringify(data))
    }
  })
}

/**
 *
 * @param {string} route
 * @param {Array<string>} eventNames
 */
export function sourceSSE(route, eventNames) {
  for (const eventName of eventNames) {
    const sse = source(route, { cache: true }).select(eventName).json()
    sse.subscribe(console.log)
  }
}
