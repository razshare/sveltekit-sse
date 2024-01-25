# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-sse
```

Create your server sent event with:

```js
// src/routes/custom-event/+server.js
import { event } from 'sveltekit-sse'

/**
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function run(r) {
    setTimeout(r, milliseconds)
  })
}

export function GET() {
  return event(async function run(emit) {
    while (true) {
      emit(`${Date.now()}`)
      await delay(1000)
    }
  }).toResponse()
}
```

<details>
  <summary>(expand for more details)</summary>

  The stream and http connection will end whenever the callback passed to `event()` resolves.\
  \
  The infinite loop is of great importance in this case because it prevents the callback from resolving and keeps the connection to the client open.\
  You can end the connection at any time by `return`ing or `break`ing the loop
  ```js
  export function GET() {
    let i = 0
    return event(async function run(emit){
      while (true) {
        emit(`${Date.now()}`)
        await delay(1000)
        if(9 === i) {
            return
        }
        i++
      }
    }).toResponse()
  }
  ```
  This will complete the response after 10 iterations.

  You don't have to use an infinite loop, you can achieve the same result using any other kind of semaphore-like behavior.

  For example using `Promise`

  ```js
  export function GET() {
      let i = 0
      return event(async function run(emit){
          await new Promise(function run(stop){  // this line will prevent the callback from resolving
              while (i < 10) {
                  emit(`${Date.now()}`)
                  await delay(1000)
                  i++
              }
              stop()  // if you omit this line, the promise will not resolve and the connection will remain open
          })
      }).toResponse()
  }
  ```
  Without calling `stop()`, even though the `while` loop is not infinite anymore, the connection will remain open and you will leak memory this way.

  Read more about this topic in the [locking section](#locking).
</details>

and consume the source on your client with:

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
function delay(milliseconds) {
  return new Promise(function run(r) {
    setTimeout(r, milliseconds)
  })
}

export function GET() {
  return events(async function run(emit) {
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

  const connection = source('/custom-event')
  const channel = connection.select('message')

  const transformed = channel.transform(function start(stream) {
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

        return function stop() {
          state.listeners = state.listeners.filter(function pass(value) {
            return value !== callback
          })
        }
      },
    }

    const listen = async function () {
      let value = ''
      while (({ value } = await reader.read())) {
        state.listeners.forEach(function run(callback) {
          callback(value)
        })
      }
    }

    listen()

    return store
  })

  $: console.log({ $transformed })
</script>
```

## Custom Headers

The standard `EventSource` class does not permit setting custom headers or manipulating the underlying request options.

This library achieves client side event sourcing using `fetch`.

> [!NOTE]
> Custom headers are only available since version `0.4.0`.

The following will set a `Authorization: Bearer ...` header to the underlying http request.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const data = source('/event', {
    headers: {
      Authorization: 'Bearer ...',
    },
  })
</script>

{$data}
```

## Reconnect

You can reconnect to the stream whenever the stream closes by invoking `Event::connect`.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const data = source('/custom-event').onClose(function stop({ connect }) {
    connect()
    console.log('reconnecting')
  })

  setTimeout(function run() {
    data.close()
  }, 5000)
</script>

{$data}
```

## Json

You can parse incoming messages from the source as json using `source::select::json`.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/custom-event')
  const json = connection.select('message').json(
    function onJsonParseError({error, currentRawValue, previousParsedValue}){
      console.error(`Could not parse "${currentRawValue}" as json.`, error)
      return previousParsedValue  // this will be the new value of the store
    }
  )
  $: console.log({$json})
</svelte>
```

When a parsing error occurs, `onJsonParseError` is invoked.\
Whatever this function returns will become the new value of the store, in the example above `previousParsedValue`, which is the previous (valid) value of the store.

## Locking

More often than not for an SSE endpoint to be useful you usually need to keep the connection alive for long periods of time.

The default behavior for any event is to close the connection immediately as soon as your event callback resolves.

For example

```js
export function GET() {
  return event(async function run(emit) {
    emit('hello world')
  }).toResponse()
}
```

This endpoint will emit the string `hello world` and immediately close the connection.

This is not very useful.

Usually you need to consume data from your database or some other I/O resource over longer periods of time.\
Regardless of the origin of your data, you most likely will need to keep the connection alive.

One way of doing that is using a `Promise`
```js
export function GET() {
  return event(async function run(emit) {
    await new Promise(function run(stop){
      // imagine `myIo` is some I/O data provider you need to consume
      myIo.addEventListener("data", function run(data){
        emit(data)
      })
      myIo.addEventListener("close", stop)
      myIo.addEventListener("error", stop)
    })
  }).toResponse()
}
```

This looks fine to me personally, but some might prefer a `more svelte-like` 
way of doing things, that is: using `EventsOptions::locked`.

Both `event` and `events` take a second parameter, an `EventsOptions` object with the following signature

```js
/**
 * @typedef EventsOptions
 * @property {false|import("svelte/store").Writable<boolean>} locked
 */
```

When `locked` is a valid writable store, the event will automatically enter a locked state and will wait for the `locked` store to be set to `false`.

```js
export function GET() {
  const locked = writable(true)
  return event(async function run(emit) {
    myIo.addEventListener("data", function run(data){
      emit(data)
    })
    myIo.addEventListener("close", function close(){
      locked.set(false)
    })
    myIo.addEventListener("error", function error(){
      locked.set(false)
    })
  },
  {locked}
  ).toResponse()
}
```

After the store is set to `false` the event stream and connection will both close immediately.

> [!NOTE]
> This means you should not emit anything after unlocking the event.\
> If you do, you'll get an error from the underlying `ReadableStream`, which by that point is closed.

## Other notes

> [!NOTE]
>
> 1. Multiple sources connecting to the same path will use the same cached connection.
> 2. When the readable store becomes inactive, meaning when the last subscriber unsubscribes from the store, the background connection is closed.
> 3. (Then) When the first subscription is issued to the store, the store will attempt to connect (again) to the server.
> 4. This note applies to [single event sources](#sveltekit-sse), [multiple events sources](#multiple-evennts), [transform](#transform) and [json](#json) modifiers.
