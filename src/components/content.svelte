<script>
  import { source } from '$lib/source.js'

  const connection1 = source('/custom-event')
  connection1.onclose(function run(event) {
    debugger
    console.log({ event })
  })
  setTimeout(function run() {
    connection1.close()
  }, 3000)
  const single1 = connection1.select('message')
  const transformed1 = single1.transform(
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

      const start = async function run() {
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

  transformed1.subscribe(function watch(value) {
    console.log({ value })
  })

  const connection2 = source('/events')
  const multiple1 = connection2.select('event-1')
  const multiple2 = connection2.select('event-2')
  const multiple3 = connection2.select('event-3')
</script>

<h3>1 strea & 1 event</h3>
<pre>{$single1}</pre>
<br />
<h3>1 stream & 3 events</h3>
<pre>{$multiple1}</pre>
<br />
<pre>{$multiple2}</pre>
<br />
<pre>{$multiple3}</pre>
<br />
