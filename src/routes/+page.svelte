<script lang="ts">
	import { source } from '$lib/source.js'
	const single = source('/event')
		.setReconnect(false)
		.onError(error => console.error({ error }))
	const multiple1 = source('/events', 'event-1')
		.setReconnect(false)
		.onError(error => console.error({ error }))
	const multiple2 = source('/events', 'event-2')
		.setReconnect(false)
		.onError(error => console.error({ error }))
</script>

<span>single event</span>
{$single}
<hr />
<span>multiple events (1)</span>
{$multiple1}
<br />
<span>multiple events (2)</span>
{$multiple2}
