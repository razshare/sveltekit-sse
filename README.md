# SvelteKit SSE

This library provides an easy way to produce and consume server sent events.

Install with:

```sh
npm i -D sveltekit-sse
```

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
	import { source } from 'sveltekit-sse'
	import { onMount } from 'svelte'

	function client() {
		source('/event').subscribe(data => {
			console.log({ data })
		})
	}

	onMount(client)
</script>

```

## Developing

Once you've cloned the project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Everything inside `src/lib` is part of the library, everything inside `src/routes` is used as a showcase or preview app.

## Building

To build the library:

```bash
npm run package
```

To create a production version of the showcase app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.