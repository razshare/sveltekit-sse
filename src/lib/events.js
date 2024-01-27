/**
 * @type {import("./types").CreateEmitter}
 */
function createEmitter(controller) {
  let id = 1
  const encoder = new TextEncoder()
  /** @type {function(string, string):void} */
  return function emit(eventName, data) {
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
      controller.enqueue(encoder.encode(`data: ${encodeURIComponent(chunk)}\n`))
    }
    controller.enqueue(encoder.encode('\n'))
    id++
  }
}

/**
 * @type {import("./types").CreateStream}
 */
function createStream(producer, onCancel, options) {
  return new ReadableStream({
    async start(controller) {
      if (options.locked) {
        /**
         * @type {import("svelte/store").Unsubscriber}
         */
        let unsubscribe = options.locked.subscribe(function run(locked) {
          if (locked) {
            return
          }

          unsubscribe()
          controller.close()
        })
      }

      const customEmitter = createEmitter(controller)
      await producer(customEmitter)

      if (!options.locked) {
        controller.close()
      }
    },
    async cancel() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this
      for (const callback of onCancel) {
        await callback(self)
      }
    },
  })
}

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

  return {
    setHeader(key, value) {
      headers.set(key, value)
      return this
    },
    onCancel(callback) {
      onCancel.push(callback)
      return this
    },
    getStream() {
      if (!stream) {
        stream = createStream(producer, onCancel, options)
      }
      return stream
    },
    toResponse() {
      return new Response(this.getStream(), {
        //@ts-ignore
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'text/event-stream',
          'Connection': 'keep-alive',
          ...headers,
        },
      })
    },
  }
}
