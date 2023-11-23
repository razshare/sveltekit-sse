# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-sse
```

> **Warning**\
> previously `npm i -D sveltekit-server-sent-events`

Create your server sent event with:

```js
// src/routes/custom-event/+server.js
import { event } from 'sveltekit-sse'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = milliseconds => new Promise(r => setTimeout(r, milliseconds))

export function GET() {
  return event(async emit => {
    while (true) {
      emit(`${Date.now()}`)
      await delay(1000)
    }
  }).toResponse()
}

```

and consume it on your client with:

```svelte
<script>
  // src/routes/+page.svelte
  import { source } from 'sveltekit-sse'
  const value = source('/custom-event')
</script>
{$value}
```

## Multiple events

All major browsers will limit the number of parallel http connections.

One solution to this problem is using http2.

However, for various reasons not everyone can serve http2 responses, in that case you can use the same http1 connection to emit multiple events.

```js
// src/routes/events/+server.js
import { events } from 'sveltekit-sse'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = milliseconds => new Promise(r => setTimeout(r, milliseconds))

export function GET() {
  return events(async emit => {
    while (true) {
      emit('event-1', `/events (1) says: ${Date.now()}`)
      emit('event-2', `/events (2) says: ${Date.now()}`)
      emit('event-3', `/events (3) says: ${Date.now()}`)
      await delay(2000)
    }
  }).toResponse()
}
```

and consume it on your client with:

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/events')
  const value1 = connection.select('event-1')
  const value2 = connection.select('event-2')
  const value3 = connection.select('event-3')
</script>

{$value1}
<br />
{$value2}
<br />
{$value3}
```

## Transform

While on the client, you can transform the stream into any type of object you want by using `source::select::transform`.

The `transform` method receives a `ReadableStream`, which you can use to read incoming messages from the source.

Here's an example how to use it.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const connection1 = source('/custom-event')
  const single1 = connection1.select('message')

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
```


## Custom Headers

The standard `EventSource` class does not permit setting custom headers or manipulating the underlying request options.

This library achieves client side event sourcing using `fetch`.

> **Note**\
> Custom headers are only available since version `0.4.0`.

The following will set a `Authorization: Bearer ...` header to the underlying http request.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const data = source("/event", {
    headers: {
      "Authorization": "Bearer ..."
    }
  })
</script>
{$data}
```

## Reconnect

You can reconnect to the stream whenever the stream closes by invoking `Event.connect`.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const data = source('/custom-event').onclose(function stop({ connect }) {
    connect()
    console.log('reconnecting')
  })

  setTimeout(function run() {
    data.close()
  }, 5000)

</script>
{$data}
```
