import { writable } from 'svelte/store'
import { ok } from './ok'
import { error } from './error'

/**
 * @typedef CreateEmitterPayload
 * @property {ReadableStreamDefaultController} controller
 * @property {{connected:boolean}} context
 */

/**
 *
 * @param {CreateEmitterPayload} payload
 * @returns {import('./types').EmitterOfManyEvents}
 */
function createEmitter({ controller, context }) {
  let id = 1
  const encoder = new TextEncoder()

  return function emit(eventName, data) {
    if (!context.connected) {
      return error('Client disconnected from the stream.')
    }
    const typeOfEventName = typeof eventName
    const typeOfData = typeof data
    if (typeOfEventName !== 'string') {
      return error(
        `Event name must of type \`string\`, received \`${typeOfEventName}\`.`,
      )
    }
    if (typeOfData !== 'string') {
      return error(
        `Event data must of type \`string\`, received \`${typeOfData}\`.`,
      )
    }
    if (eventName.includes('\n')) {
      return error(
        `Event name must not contain new line characters, received "${eventName}".`,
      )
    }
    try {
      controller.enqueue(encoder.encode(`id: ${id}\nevent: ${eventName}\n`))
      const chunks = data.split('\n')
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${encodeURIComponent(chunk)}\n`),
        )
      }
      controller.enqueue(encoder.encode('\n'))
      id++
      return ok()
    } catch (e) {
      return error(e)
    }
  }
}

/**
 * @typedef StreamContext
 * @property {boolean} connected
 */

/**
 * @typedef ProducePayload
 * @property {Start} start
 * @property {number} [ping] The server will ping the client every `interval` milliseconds to check if it's still connected.\
 * If the client has disconnected, the stream will be un`locked` and the connection will terminate.\
 * Defaults to `30_000` milliseconds (`30` seconds).
 * @property {import('svelte/store').Writable<boolean>} lock
 * @property {StreamContext} context
 * @property {Stop} [stop]
 */

/**
 *
 * @param {ProducePayload} payload
 * @returns
 */
function produceStream({ start, lock, context, stop, ping = 30_000 }) {
  return new ReadableStream({
    async start(controller) {
      context.connected = true
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this
      const emit = createEmitter({ controller, context })
      const started = start({ source: self, emit, lock })

      const interval = setInterval(function run() {
        const { error } = emit('ping', '')
        if (error) {
          lock.set(false)
        }
      }, ping)

      /**
       *
       * @param {{$lock:boolean}} payload
       * @returns {Promise<boolean>}
       */
      async function stopLocal({ $lock }) {
        if ($lock || !context.connected) {
          return false
        }

        clearInterval(interval)

        try {
          controller.close()
        } catch {
          // Do nothing.
          // This means the client has already disconnected without notice.
        }
        context.connected = false

        const cancelInline = await started
        if (cancelInline) {
          await cancelInline(self)
        }

        if (stop) {
          await stop(self)
        }
        return true
      }

      const unsubscribe = lock.subscribe(async function run($lock) {
        if (await stopLocal({ $lock })) {
          unsubscribe()
        }
      })
    },
    cancel() {
      lock.set(false)
    },
  })
}

/**
 * @callback OnCancel
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * @callback Start
 * @param {import('./types').Connection} payload
 * @returns {void|Stop|PromiseLike<void>|PromiseLike<Stop>}
 */

/**
 * @callback Stop
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * test
 * @typedef ProduceOptions
 * @property {Record<string, string>} [headers]
 * @property {number} [ping] The server will ping the client every `interval` milliseconds to check if it's still connected.\
 * If the client has disconnected, the stream will be un`locked` and the connection will terminate.\
 * Defaults to `30_000` milliseconds (`30` seconds).
 * @property {Stop} [stop] Do something when the stream is stopped.\
 * The following qualify as "stopped"
 * - Calling `.cancel` on the underlying `ReadableStream`
 * - Calling `lock.set(false)`
 * - Client disconnected
 */

/**
 *
 * @returns {StreamContext}
 */
function createContext() {
  return { connected: false }
}

/**
 * Create one stream and emit multiple server sent events.
 * @param {Start} start The stream has started, you can start emitting events.
 * > ## Example
 * > ```js
 * > export function POST() {
 * >   return produce(function start({ emit }) {
 * >     const notifications = [
 * >       { title: 'title-1', body: 'lorem...' },
 * >       { title: 'title-2', body: 'lorem...' },
 * >       { title: 'title-3', body: 'lorem...' },
 * >     ]
 * >
 * >     for (const notification of notifications) {
 * >       const { error } = emit('notification', JSON.stringify(notification))
 * >       if (error) {
 * >         // Make sure to check for errors,
 * >         // otherwise your stream will keep producing data
 * >         // and you'll create a memory leak.
 * >         return
 * >       }
 * >     }
 * >   })
 * > }
 * > ```
 * @param {ProduceOptions} options
 */
export function produce(start, { stop, headers, ping = 30_000 } = {}) {
  const context = createContext()
  const lock = writable(true)

  const producedStream = produceStream({
    start,
    lock,
    ping,
    stop,
    context,
  })

  return new Response(producedStream, {
    //@ts-ignore
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      ...headers,
    },
  })
}
