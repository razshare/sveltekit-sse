# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-sse
```

Create your server sent event with:

```js
// src/routes/custom-event/+server.js
import { events } from 'sveltekit-sse'

/**
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function run(resolve) {
    setTimeout(resolve, milliseconds)
  })
}

export function POST({ request }) {
  return events({
    request,
    start({emit}) {
      while(true){
        emit('message', 'hello world')
        await delay(1000)
      }
    },
  })
}
```

and consume the source on your client with:

```svelte
<script>
  // src/routes/+page.svelte
  import { source } from 'sveltekit-sse'
  const value = source('/custom-event').select('message')
</script>

{$value}
```


> [!CAUTION]
> Due to how the [beacon api](#beacon) works, you must write all your logic within the `start()` function while on the server.


In other words, this is wrong

```js
export function POST({ request }) {
  const message = 'hello world'   // <=== wrong, move this below
  return events({
    request,
    start({emit}) {
      while(true){
        emit('message', message)
        await delay(1000)
      }
    },
  })
}
```

And this is the correct way to do it

```js
export function POST({ request }) {
  return events({
    request,
    start({emit}) {
      const message = 'hello world'   // <=== this is correct
      while(true){
        emit('message', message)
        await delay(1000)
      }
    },
  })
}
```


## Reconnect

You can reconnect to the stream whenever the stream closes

```html
<script>
  import { source } from "sveltekit-sse"
  
  const data = source('/custom-event', {
    close({connect}){
      console.log('reconnecting...')
      connect()
    }
  })

  setTimeout(function run() {
    data.close()
  }, 3000)
</script>

{$data}
```

## Custom Headers

You can apply custom headers to the connection

```html
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/event', {
    options: {
      headers: {
        Authorization: 'Bearer ...',
      }
    }
  })

  const data = connection.select('message')
</script>

{$data}
```

## Transform

While on the client, you can transform the stream into any type of object you want by using `source::select::transform`.

The `transform` method receives a `ReadableStream`, which you can use to read incoming messages from the source.

Here's an example how to use it.

```html
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

## Json

You can parse incoming messages from the source as json using `source::select::json`.

```svelte
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/custom-event')
  const json = connection.select('message').json(
    function or({error, raw, previous}){
      console.error(`Could not parse "${raw}" as json.`, error)
      return previous  // This will be the new value of the store
    }
  )
  $: console.log({$json})
</svelte>
```

When a parsing error occurs, `or` is invoked.\
Whatever this function returns will become the new value of the store, in the example above `previous`, which is the previous (valid) value of the store.

## Locking

All streams are locked server side by default, meaning the server will keep the connection alive indefinitely.

The locking mechanism is achieved through a `Writable<bool>`, which you can access from the `start` function.

```js
export function POST({ request }) {
  return events({
    request,
    start({emit, lock}) {
      emit('message', 'hello world')
      setTimeout(function unlock(){
        lock.set(false)
      },2000)
    },
  })
}
```

The above code `emit`s the `hello world` string to the `message` event and closes the stream after 2 seconds.

> [!WARNING]
> You should not send any more messages after invoking `lock.set(false)` otherwise your `emit` function will result into an error.\
> The resulting error is wrapper in `Unsafe<void>`, which you can manage using conditionals
```js
lock.set(false)
const {error} = emit('message', 'I have a bad feeling about this...')
if(error){
  console.error(error)
  return
}
```

## Beacon

Currently there is no way to detect canceled http connections in SvelteKit.

This poses a big issue for server sent events because that means there is no way to detect when to automatically un`lock` the stream and stop emitting data.

The current solution to this problem is using [beacons](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) to keep the stream alive.

The algorithm is simple in theory, but it requires both server and client to cooperate

- **Server:** _Accept client connection._
- **Server:** _Open a stream to the client._
- **Server:** _Schedule a stream destructor in `T` milliseconds._
- **Client:** _Send a beacon to the server to verify you're alive._
> [!NOTE]
> There's actually a sort of [session being managed](./src/lib/events.js#309) in this step in order to identify each client.


- **Server:** _Reset the stream destructor [if the beacon is valid](./src/lib/events.js#279)._
- Repeat.

The key part here is obviously `T`, which lives on both the client and the server.\
Let's call them `TClient` and `TServer`.

In order for this to work `TClient` should always be lesser than `TServer`, and possibly it should also take into account some the network latency and add a bit of padding.



You can set `TClient` as you're invoking `source`

```js
const connection = source('/events', {
  beacon:3000,  // <=== this is TClient
})
```

And `TServer` as you-re invoking `events`

```js
export function POST({request}){
  return events({
    request,
    timeout: 5000,  // <=== this is TServer
    start(){
      // ...
    }
  })
}
```

You don't need to manually set these variables up yourself, but you can.\
The default values are `beacon: 5000` and `timeout: 7000`.


## Other notes

> [!NOTE]
>
> 1. Multiple sources connecting to the same path will use the same cached connection.
> 2. When the readable store becomes inactive, meaning when the last subscriber unsubscribes from the store, the background connection is closed.
> 3. (Then) When the first subscription is issued to the store, the store will attempt to connect (again) to the server.
> 4. This note applies to [single event sources](#sveltekit-sse), [multiple events sources](#multiple-evennts), [transform](#transform) and [json](#json) modifiers.
