# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-sse
```

Produce your server sent events with

```js
// src/routes/custom-event/+server.js
import { produce } from 'sveltekit-sse'

/**
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function run(resolve) {
    setTimeout(resolve, milliseconds)
  })
}

export function POST() {
  return produce(async function start({ emit }) {
      while (true) {
        const {error} = emit('message', `the time is ${Date.now()}`)
        if(error) {
          return
        }
        await delay(1000)
      }
  })
}
```

Consume them on your client with

```svelte
<script>
  // src/routes/+page.svelte
  import { source } from 'sveltekit-sse'
  const value = source('/custom-event').select('message')
</script>

{$value}
```
Your application will render something like this

![Peek 2024-05-28 03-03](https://github.com/razshare/sveltekit-sse/assets/6891346/215b0b26-fa21-4841-9b69-b28a4c1ec731)


## Locking

All streams are locked server side by default, meaning the server will keep the connection alive indefinitely.

The locking mechanism is achieved through a `Writable<bool>`, which you can access from the `start` function.

```js
import { produce } from 'sveltekit-sse'
export function POST() {
  return produce(function start({ emit, lock }) {
    emit('message', 'hello world')
    setTimeout(function unlock() {
      lock.set(false)
    }, 2000)
  })
}
```

The above code `emit`s the `hello world` string with the `message` event name and closes the stream after 2 seconds.

You should not send any more messages after invoking `lock.set(false)` otherwise your `emit` function will return an error.\
The resulting error is wrapped in `Unsafe<void>`, which you can manage using conditionals

```js
lock.set(false)
const { error } = emit('message', 'I have a bad feeling about this...')
if (error) {
  console.error(error)
  return
}
```

## Stop

You can stop a connection and run code when a connection is stopped
- by returning a function from `start()`
  ```js
  import { produce } from 'sveltekit-sse'
  export function POST() {
    return produce(function start({ emit, lock }) {
      emit('message', 'hello')
      return function cancel() {
        console.log('Connection canceled.')
      }
    })
  }
  ```

- or by setting `options::stop()` and calling `lock.set(false)`

  ```js
  import { produce } from 'sveltekit-sse'
  export function POST() {
    return produce(
      function start({ emit, lock }) {
        emit('message', 'hello')
        lock.set(false)
      },
      {
        stop() {
          console.log('Connection stopped.')
        },
      },
    )
  }
  ```

Both ways are valid.

> [!NOTE]
> In the second case, using `options::stop()`, your code will also 
> run if the client itself cancels the connection.

## Cleanup

Whenever the client disconnects from the stream, the server will detect that event and trigger your [stop function](#stop).\
This behavior has a delay of 30 seconds by default.\
This is achieved through a ping mechanism, by periodically (_every 30 seconds by default_) sending a ping event to the client.

You can customize that ping event's time interval 

```js
import { produce } from 'sveltekit-sse'
export function POST() {
  return produce(
    function start() {
      // Your emitters go here
    },
    { 
      ping: 4000, // Custom ping interval
      stop(){
        console.log("Client disconnected.")
      }
    },
  )
}
```

You can also forcefully detect disconnected clients by simply emitting any event to that client, you will get back an error if the client has disconnected.

When that happens, you should stop your producer

```js
import { produce } from 'sveltekit-sse'
export function POST() {
  return produce(async function start({ emit }) {
    await new Promise(function start(resolve){
      someRemoteEvent("incoming-data", function run(data){
        const {error} = emit("data", data)
        if(error){
          resolve(error)
        }
      })
    })
    return function stop(){
      // Do your cleanup here
      console.log("Client has disconnected.")
    }
  })
}
```

## Reconnect

You can reconnect to the stream whenever the stream closes

```html
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/custom-event', {
    close({ connect }) {
      console.log('reconnecting...')
      connect()
    },
  })

  const data = connection.select('message')

  setTimeout(function run() {
    connection.close()
  }, 3000)
</script>

{$data}
```

## Custom Headers

You can apply custom headers to the request

```html
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/event', {
    options: {
      headers: {
        Authorization: 'Bearer ...',
      },
    },
  })

  const data = connection.select('message')
</script>

{$data}
```

## Transform

You can transform the stream into any type of object you want by using `source::select::transform`.

The `transform` method receives a `string`, which is the value of the store.

Here's an example how to use it.

```html
<script>
  import { source } from 'sveltekit-sse'

  const connection = source('/custom-event')
  const channel = connection.select('message')

  const transformed = channel.transform(function run(data) {
    return `transformed: ${data}`
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

## FAQ

- How can I produce data from third party sources?\
  This library doesn't provide a direct answer to that question, but the road to an answer is short.\
  You will have to identify users using sessions (or some equivalent mechanism, for example actual database-backed accounts) and map them to references of their respective emitters.\
  For example using a global map
  ```js
  // src/lib/clients.js
  /** @type {Map<string,(eventName:string,data:string)=>import('sveltekit-sse').Unsafe<void,Error>>} */
  export const clients = new Map()
  ```
  ```js
  // src/routes/events/+server.js
  import { clients } from '$lib/clients'

  export function POST({ request }) {
    return produce(
      function start({ emit }) {
        const sessionId = request.headers.get('session-id') ?? ''
        if (!sessionId) {
          return function stop() {
            console.error('Client session id not found.')
          }
        }
        // Map the session id to an emitter.
        // This will also indicate to you that the client is "online".
        clients.set(sessionId, emit)
      },
      {
        // Client goes "offline", so remove the entry.
        stop() {
          const sessionId = request.headers.get('session-id') ?? ''
          if (!sessionId) {
            return
          }
          clients.delete(sessionId)
        },
      },
    )
  }
  ```
  Then you can access any of the clients' emitters from your third party data source, external to the original _POST_ method, as long as you have their session id.
  ```js
  // some-file.js
  import { clients } from '$lib/clients'
  clients.get('some-session-id').emit('message', 'hello')
  ```
  In a distributed system this mapping would have to happen externally, see next question.

- Is this distributed systems friendly?\
  Yes - see https://github.com/razshare/sveltekit-sse/issues/50, https://github.com/razshare/sveltekit-sse/issues/49 , https://github.com/razshare/sveltekit-sse/issues/34 and https://github.com/razshare/sveltekit-sse/issues/16 .
  
  There is no special setup required for distributed systems for this library specifically, but you should always remember to avoid saving state directly on nodes as that memory is [transient](https://en.wikipedia.org/wiki/Transient_(computer_programming)).
  
  
  To solve the transient memory issue you will need to abstract away the mapping between sessions and emitters described above.\
  For example you could use a [DBMS](https://en.wikipedia.org/wiki/Database), such as Postgre, that can emit events, then you just forward those events to your clients.

  Here's an example using [pg-listen](https://github.com/andywer/pg-listen)

  ```js
  import { clients } from '$lib/clients'
  import createSubscriber from "pg-listen"
  import { databaseURL } from "./config"

  // Accepts the same connection config object that the "pg" package would take
  const subscriber = createSubscriber({ connectionString: databaseURL })

  subscriber.notifications.on("my-channel", (payload) => {
    clients.get('some-session-id').emit('my-channel', payload.message)
  })
  ```

  There's also this [guide on how to use Postgre Events](https://edernegrete.medium.com/psql-event-triggers-in-node-js-ec27a0ba9baa), which may be useful to you.

## Other notes

> [!NOTE]
>
> 1. Multiple sources connecting to the same path will use the same cached connection.
> 2. When the readable store becomes inactive, meaning when the last subscriber unsubscribes from the store, the background connection is closed.
> 3. (Then) When the first subscription is issued to the store, the store will attempt to connect (again) to the server.
