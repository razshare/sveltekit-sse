<script>
	import { source } from '$lib/source.js'
	import { onMount } from 'svelte'

	function client() {
		source('/event').subscribe(data => {
			console.log({ data })
		})
	}

	onMount(client)
</script>
