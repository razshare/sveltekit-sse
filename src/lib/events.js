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
 * @type {import("./types").CreateEmitter}
 */
function createEmitter(controller, streamInfo) {
  let id = 1
  const encoder = new TextEncoder()
  return function emit(eventName, data) {
    if (streamInfo.canceled) {
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
 * @type {import("./types").CreateStream}
 */
function createStream(producer, id, expectBeacon, onCancel, options) {
  const streamInfo = { canceled: false }
  return new ReadableStream({
    async start(controller) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this

      if (options.locked) {
        /**
         * @type {import("svelte/store").Unsubscriber}
         */
        const unsubscribe = options.locked.subscribe(
          async function run(locked) {
            if (locked) {
              return
            }

            controller.close()
            streamInfo.canceled = true
            for (const callback of onCancel) {
              await callback(self)
            }
            unsubscribe()
          },
        )

        const timeout = setTimeout(async function run() {
          unsubscribe()
          if (options.locked) {
            options.locked.set(false)
          }
          controller.close()
          streamInfo.canceled = true
          for (const callback of onCancel) {
            await callback(self)
          }
        }, expectBeacon)

        beaconTimeouts.set(id, timeout)
      } else {
        const timeout = setTimeout(async function run() {
          controller.close()
          streamInfo.canceled = true
          for (const callback of onCancel) {
            await callback(self)
          }
        }, expectBeacon)

        beaconTimeouts.set(id, timeout)
      }

      const customEmitter = createEmitter(controller, streamInfo)

      await producer(customEmitter)

      if (!options.locked) {
        streamInfo.canceled = true
        controller.close()
        for (const callback of onCancel) {
          await callback(self)
        }
      }
    },
    async cancel() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this
      streamInfo.canceled = true
      for (const callback of onCancel) {
        await callback(self)
      }
    },
  })
}

/**
 * @type {Map<string,NodeJS.Timeout>}
 */
const beaconTimeouts = new Map()

/**
 * Create one stream and emit multiple server sent events.
 * @type {import('./types').CreatorOfManyEventsGateway}
 */
export function events(
  producer,
  options = {
    /** @type {false} */
    locked: false,
  },
) {
  /** @type {Array<import("./types").OnCancelCallback>} */
  const onCancel = []
  /** @type {Map<string, string>} */
  const headers = new Map()
  /** @type undefined|ReadableStream */
  let stream = undefined
  let expectBeacon = 15000

  return {
    setHeader(key, value) {
      headers.set(key, value)
      return this
    },
    onCancel(callback) {
      onCancel.push(callback)
      return this
    },
    getStream(id) {
      if (!stream) {
        stream = createStream(producer, id, expectBeacon, onCancel, options)
      }
      return stream
    },
    expectBeacon(milliseconds) {
      expectBeacon = milliseconds
      return this
    },
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
