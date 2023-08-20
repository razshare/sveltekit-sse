<script lang="ts">
  import { source } from '$lib/source.js'

  const connection1 = source('/event')
  const single1 = connection1.select('message')
  single1.subscribe(message => {
    console.log(message)
  })

  const connection2 = source('/events')
  const multiple1 = connection2.select('event-1')
  const multiple2 = connection2.select('event-2')
  const multiple3 = connection2.select('event-3')
</script>

<h3>1 strea & 1 event</h3>
{$single1}
<br />
<h3>1 stream & 3 events</h3>
{$multiple1}<br />
{$multiple2}<br />
{$multiple3}<br />
