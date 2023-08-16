# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-sse
```

> **Warning**: prevously `npm i -D sveltekit-server-sent-events`

Create your server sent event with:

```js
// src/routes/event/+sever.js
import { event } from 'sveltekit-sse'

/**
 * @param {number} milliseconds
 * @returns
 */
const delay = milliseconds => new Promise(r => setTimeout(r, milliseconds))

export function GET() {
	return event(async emit => {
		while (true) {
			emit(Date.now())
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
	const value = source('/event').onError(error => console.error({ error }))
</script>
{$value}
```

## Multiple events.

All major browsers will limit the number of parallel http connections.

One solution to this problem is using http2.

However, for various reasons not everyone can serve http2 responses, in that case you can use the same http1 connection to emit multiple events.

```js
// src/routes/events/+sever.js
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
	import { events } from 'sveltekit-sse'
	
	const connection = source('/events')
	const value1 = connection.select('event-1')
	const value2 = connection.select('event-2')
	const value3 = connection.select('event-3')
</script>
{$value1}
<br/>
{$value2}
<br/>
{$value3}
```