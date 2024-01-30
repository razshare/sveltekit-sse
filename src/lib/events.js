import { writable } from 'svelte/store'

function uuid({ short } = { short: false }) {
  let dt = new Date().getTime()
  const BLUEPRINT = short ? 'xyxxyxyx' : 'xxxxxxxx-xxxx-yxxx-yxxx-xxxxxxxxxxxx'
  const RESULT = BLUEPRINT.replace(/[xy]/g, function check(c) {
    const r = (dt + Math.random() * 16) % 16 | 0
    dt = Math.floor(dt / 16)
    return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
  return RESULT
}

/**
 * @typedef CreateEmitterPayload
 * @property {ReadableStreamDefaultController} controller
 * @property {{connected:boolean}} context
 */

/**
 *
 * @param {CreateEmitterPayload} payload
 * @returns {EmitterOfManyEvents}
 */
function createEmitter({ controller, context }) {
  let id = 1
  const encoder = new TextEncoder()
  return function emit(eventName, data) {
    if (!context.connected) {
      throw new Error(`Client disconnected from the event.`)
    }
    const typeOfEventName = typeof eventName
    const typeOfData = typeof data
    if (typeOfEventName !== 'string') {
      throw new Error(
        `Event name must of type \`string\`, received \`${typeOfEventName}\`.`,
      )
    }
    if (typeOfData !== 'string') {
      throw new Error(
        `Event data must of type \`string\`, received \`${typeOfData}\`.`,
      )
    }
    if (eventName.includes('\n')) {
      throw new Error(
        `Event name must not contain new line characters, received "${eventName}".`,
      )
    }

    controller.enqueue(encoder.encode(`id: ${id}\nevent: ${eventName}\n`))
    const chunks = data.split('\n')
    for (const chunk of chunks) {
      try {
        controller.enqueue(
          encoder.encode(`data: ${encodeURIComponent(chunk)}\n`),
        )
      } catch (e) {
        console.log('something went wrong (1)', e)
      }
    }
    try {
      controller.enqueue(encoder.encode('\n'))
    } catch (e) {
      console.log('something went wrong (2)', e)
    }
    id++
    return true
  }
}

/**
 * @typedef CreateStreamPayload
 * @property {Start} start
 * @property {Cancel} [cancel]
 * @property {string} id
 * @property {number} expectBeacon
 * @property {import('svelte/store').Writable<boolean>} lock
 */

/**
 *
 * @param {CreateStreamPayload} payload
 * @returns
 */
function createStream({ start, id, expectBeacon, cancel, lock }) {
  const context = { connected: true }
  return new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      const unsubscribe = lock.subscribe(async function run($lock) {
        if ($lock) {
          return
        }

        controller.close()
        if (cancel) {
          cancel(self)
        }
        unsubscribe()
      })

      const timeout = setTimeout(async function run() {
        unsubscribe()
        lock.set(false)
        controller.close()
        context.connected = false
        if (cancel) {
          cancel(self)
        }
      }, expectBeacon)

      beaconTimeouts.set(id, timeout)

      const emit = createEmitter({ controller, context })

      await start({ source: self, emit, lock })
    },
    cancel() {
      if (cancel) {
        cancel(this)
      }
    },
  })
}

/**
 * @type {Map<string,NodeJS.Timeout>}
 */
const beaconTimeouts = new Map()

/**
 * @callback OnCancel
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * Send data to the client.
 * @callback EmitterOfManyEvents
 * @param {string} eventName Name of the event.
 * @param {string} data Data to send.
 * @throws When `eventname` or `data` are not of type `string`.
 * @returns {boolean} `false` if the stream has been canceled, otherwise `true`.
 */

/**
 * @typedef StartPayload
 * @property {EmitterOfManyEvents} emit Emit events to the client.
 * @property {import("svelte/store").Writable<boolean>} lock Set this store to false in order to terminate the event.
 * @property {UnderlyingDefaultSource<string>} source
 */

/**
 * @callback Start
 * @param {StartPayload} payload
 * @returns {void|PromiseLike<void>}
 */

/**
 * @callback Cancel
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * test
 * @typedef EventsPayload
 * @property {Start} start
 * @property {Cancel} [cancel]
 */

/**
 * Create one stream and emit multiple server sent events.
 * @param {EventsPayload} payload
 */
export function events({ start, cancel }) {
  /** @type {Map<string, string>} */
  const headers = new Map()
  /** @type undefined|ReadableStream */
  let stream = undefined
  let expectBeacon = 15000
  let lock = writable(true)

  return {
    /**
     *
     * @param {string} key
     * @param {string} value
     * @returns
     */
    setHeader(key, value) {
      headers.set(key, value)
      return this
    },
    /**
     *
     * @param {string} id
     * @returns
     */
    getStream(id) {
      if (!stream) {
        stream = createStream({
          start,
          expectBeacon,
          id,
          lock,
          cancel,
        })
      }
      return stream
    },
    /**
     *
     * @param {number} milliseconds
     * @returns
     */
    expectBeacon(milliseconds) {
      expectBeacon = milliseconds
      return this
    },
    /**
     *
     * @param {Request} request
     * @returns
     */
    toResponse(request) {
      const parts = request.url.split('?')
      let id = 2 === parts.length ? parts[1] ?? '' : ''

      if (id) {
        // console.log('Clearing timeout', id)
        const timeout = beaconTimeouts.get(id)
        if (timeout) {
          clearTimeout(timeout)
        }
        return new Response()
      }

      do {
        id = uuid({ short: false })
      } while (beaconTimeouts.has(id))

      const stream = this.getStream(id)

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
    },
  }
}
