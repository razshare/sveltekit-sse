<script>
  import { source } from '$lib'

  const connection = source('/issue-65/events')
  const stats = connection.select('message').json()
</script>

<main>
  <h2>Admin dashboard page</h2>

  {#if $stats}
    <span>Cpu usage - {$stats.cpu_usage}</span><br />
    <span>Memory - {$stats.memory}</span><br />
    <span>Time - {$stats.time}</span><br />
  {/if}
</main>
