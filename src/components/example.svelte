<script>
  import { source } from '$lib/source.js'
  const connection = source('/events', { beacon: 1000 })
  /**
   * @type {import('svelte/store').Readable<Array<import('../routes/events/+server').Quote>>}
   */
  const quotes = connection.select('thousands-of-cat-quotes').json()

  // setTimeout(function run() {
  //   connection.close()
  // }, 3000)
  // let counter = 0

  // $: inspect({ quotes: $quotes })
  /**
   * @param {{quotes:Array<import('../routes/events/+server').Quote>}} payload
   */
  // function inspect({ quotes }) {
  //   if (!quotes) {
  //     return
  //   }
  //   if (counter >= 3) {
  //     console.log(`Counter is ${counter}, closing connection...`)
  //     connection.close()
  //   }
  //   counter++
  // }
</script>

<h3>Thousands of Cat Quotes</h3>
{#each $quotes ?? [] as quote}
  <span>{quote.value}</span><br />
{/each}
