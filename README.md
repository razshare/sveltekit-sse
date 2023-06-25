# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-server-sent-events
```

Create your server sent event with:

```js
// src/routes/event/+sever.js
import { event } from 'sveltekit-server-sent-events'

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
	import { source } from 'sveltekit-server-sent-events'
	import { onMount } from 'svelte'

	const event = source('/event')

	$:console.log('new value:', $event)
</script>

```