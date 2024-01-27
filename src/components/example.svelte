<script>
  import { source } from '$lib/source.js'
  const connection = source('/events')

  /**
   * @type {import('svelte/store').Readable<Array<import('../routes/events/+server').Quote>>}
   */
  const quotes = connection.select('thousand-cat-quotes').json()

  $: console.log($quotes)
</script>

<h3>Thousands of Cat Quotes</h3>
{#each $quotes ?? [] as quote}
  <span>{quote.value}</span><br />
{/each}
