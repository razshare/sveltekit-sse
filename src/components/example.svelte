<script>
  import { source } from '$lib/source.js'
  const connection = source({
    from: '/events',
    beacon: 1000,
  })
  const channel = connection.select('cat-quote')
  /**
   * @type {import('svelte/store').Readable<null|import('../routes/events/+server').Quote>}
   */
  const quote = channel.json()
</script>

<h3>A Cat Quote</h3>
<span>{$quote?.value ?? ''}</span><br />
