<script>
  import { source } from '$lib/source.js'

  const connection1 = source('/custom-event')
  const single1 = connection1.select('message')

  const connection2 = source('/events')
  const multiple1 = connection2.select('event-1')
  const multiple2 = connection2.select('event-2')
  const multiple3 = connection2.select('event-3')

  const transformed1 = single1.transform(stream => {
    let state = {
      /** @type {Array<function(string):void>}*/
      listeners: [],
    }
    const reader = stream.getReader()
    const store = {
      subscribe(callback) {
        if (!state.listeners.includes(callback)) {
          state.listeners.push(callback)
        }

        return () => (state.listeners = state.listeners.filter(value => value !== callback))
      },
    }

    const start = async function () {
      let value = ''
      while (({ value } = await reader.read())) {
        state.listeners.forEach(callback => callback(value))
      }
    }

    start()

    return store
  })

  transformed1.subscribe(value => {
    console.log({ value })
  })
</script>

<h3>1 strea & 1 event</h3>
{$single1}
<br />
<h3>1 stream & 3 events</h3>
{$multiple1}<br />
{$multiple2}<br />
{$multiple3}<br />
