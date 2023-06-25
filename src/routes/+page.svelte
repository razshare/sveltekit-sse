<script>
	import { source } from '$lib/source.js'

	const event = source('/event')

	$: console.log('new value:', $event)
</script>
