import { writable } from 'svelte/store'
import { ok } from './ok'
import { error } from './error'
import { beacon } from './beacon'
import { uuid } from './uuid'

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
 * @type {Map<string,Timer>}
 */
const timeouts = new Map()
/**
 * @type {Map<string,import('svelte/store').Writable<boolean>>}
 */
const locks = new Map()

/**
 * @typedef StreamContext
 * @property {boolean} connected
 */

/**
 * @typedef CreateTimeoutAndLockPayload
 * @property {StreamContext} context
 * @property {number} timeout
 */

/**
 * @typedef CreateTimeoutPayload
 * @property {StreamContext} context
 * @property {import('svelte/store').Writable<boolean>} lock
 * @property {number} timeout
 */

/**
 *
 * @param {CreateTimeoutPayload} payload
 * @returns
 */
function createTimeout({ context, lock, timeout }) {
  return setTimeout(async function run() {
    if (!context.connected) {
      return
    }
    lock.set(false)
  }, timeout)
}

/**
 * @typedef CreateStreamPayload
 * @property {Start} start
 * @property {string} id
 * @property {import('svelte/store').Writable<boolean>} lock
 * @property {StreamContext} context
 * @property {number} timeout
 * @property {Cancel} [cancel]
 */

/**
 *
 * @param {CreateStreamPayload} payload
 * @returns
 */
function createStream({ start, id, lock, context, cancel, timeout }) {
  return new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this
      const emit = createEmitter({ controller, context })
      const started = start({ source: self, emit, lock })

      /**
       *
       * @param {{$lock:boolean}} payload
       * @returns {Promise<boolean>}
       */
      async function stop({ $lock }) {
        if ($lock || !context.connected) {
          return false
        }

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

        if (cancel) {
          await cancel(self)
        }
        return true
      }

      const unsubscribe = lock.subscribe(async function run($lock) {
        if (await stop({ $lock })) {
          unsubscribe()
        }
      })

      if (timeout > 0) {
        timeouts.set(id, createTimeout({ context, timeout, lock }))
      }
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
 * @returns {void|Cancel|PromiseLike<void>|PromiseLike<Cancel>}
 */

/**
 * @callback Cancel
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * test
 * @typedef EventsPayload
 * @property {Request} request
 * @property {Start} start The stream has started, run all your logic inside this function.
 * > **Warning**\
 * > You should delegate all code that you would normally write directly under your `export function POST` function to this method instead.\
 * > That is because the whole endpoint is actually going to be used to collect beacon signals from the client in order to correctly detect inactivity or disconnected clients.\
 * > Beacon signals will be collected repeatedly (by default every `5 seconds`), thus, unless you want to collect that beacon data, you should put all your code inside this `start` function, which will get triggered only once per client connection: the first time they connect.
 * > ## Example
 * > ```js
 * > export function POST({ request }) {
 * > return events({
 * >  request,
 * >  timeout: 3000,
 * >  start({emit}) {
 * >    const notifications = [
 * >      { title: 'title-1', body: 'lorem...' },
 * >      { title: 'title-2', body: 'lorem...' },
 * >      { title: 'title-3', body: 'lorem...' },
 * >    ]
 * >    notifications.forEach(function pass(notification){
 * >      emit('notification', JSON.stringify(notification))
 * >    })
 * >  }
 * > })
}
 * > ```
 * @property {Record<string, string>} [headers]
 * @property {Cancel} [cancel] Do something when the stream is canceled.\
 * The following qualify as "canceling"
 * - Calling `.cancel` on the underlying `ReadableStream`
 * - Calling `lock.set(false)`
 * - Timeout due to missing beacon signals
 * @property {number} [timeout] A countdown in `milliseconds`.\
 * If it expires the stream ends immediately.\
 * Each client can send a beacon to the server to reset this timeout and keep the stream online.
 * 
 * > **Note**\
 * > You can set the `timeout` to `0` or a negative value to disable this behavior and let 
 * > the stream live indefinitely or until you manually close it through `lock.set(false)`.
 */

/**
 * Create one stream and emit multiple server sent events.
 * @param {EventsPayload} payload
 */
export function events({ start, cancel, request, headers, timeout = 7000 }) {
  /**
   * @type {StreamContext}
   */
  const context = { connected: true }

  let id = beacon({ request })

  if (id) {
    const timeoutOld = timeouts.get(id)
    if (timeoutOld) {
      clearTimeout(timeoutOld)
      const lock = locks.get(id)
      if (timeout <= 0 || !lock) {
        return new Response()
      }
      timeouts.set(id, createTimeout({ timeout, context, lock }))
      locks.set(id, lock)
    }
    return new Response()
  }

  do {
    id = uuid({ short: false })
  } while (timeouts.has(id))

  const lock = writable(true)
  locks.set(id, lock)
  const stream = createStream({
    start,
    timeout,
    id,
    lock,
    cancel,
    context,
  })

  return new Response(stream, {
    //@ts-ignore
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      ...headers,
      'x-sse-id': id,
    },
  })
}
