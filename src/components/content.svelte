<script>
  import { source } from '$lib/source.js'

  const customEvent = source('/custom-event')
  customEvent.onClose(function run({ connect }) {
    console.log('stream closed, reconnecting in 2 seconds...')
    setTimeout(function run() {
      connect()
    }, 2000)
  })
  const single1 = customEvent.select('message')
  const transformed = single1.transform(
    /**
     *
     * @param {ReadableStream<string>} stream
     */
    function run(stream) {
      let state = {
        /** @type {Array<function(string):void>}*/
        listeners: [],
      }
      const reader = stream.getReader()
      const store = {
        /**
         *
         * @param {function(string):void} callback
         */
        subscribe(callback) {
          if (!state.listeners.includes(callback)) {
            state.listeners.push(callback)
          }

          return function stop() {
            state.listeners = state.listeners.filter(function pass(value) {
              return value !== callback
            })
          }
        },
      }

      async function start() {
        /**
         * @type {ReadableStreamReadResult<string>}
         */
        let chunk
        while ((chunk = await reader.read())) {
          state.listeners.forEach(function pass(callback) {
            callback(chunk.value ?? '')
          })
        }
      }

      start()

      return store
    },
  )

  transformed.subscribe(function watch(value) {
    console.log({ value })
  })

  const events = source('/events')
  const event1 = events.select('event-1')
  const event2 = events.select('event-2')
  const event3 = events.select('event-3')
  const event4 = events.select('event-4').json(function onJsonParseError({
    error,
    currentRawValue,
    previousParsedValue,
  }) {
    console.warn(
      `[!!! THIS WARNING IS INTENDED !!!] Could not parse "${currentRawValue}" as json.`,
      error.message,
    )
    return previousParsedValue
  })
</script>

<h3>One event over one stream</h3>
{$single1}
<br />
<h3>Four events over a single stream</h3>
{$event1}<br />
{$event2}<br />
{$event3}<br />
{JSON.stringify($event4)}<br />
