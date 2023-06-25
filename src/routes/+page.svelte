<script>
	import { source } from '$lib/source.js'
	const value = source('/event').onError(error => console.error({ error }))
</script>

{$value}
