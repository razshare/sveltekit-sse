<script>
  import { stats } from '$lib/stores/stats'
</script>

<main>
  <h2>Admin dashboard page</h2>

  {#if localStorage.getItem('showStats')}
    <span>Cpu usage - {$stats.cpu_usage}</span><br />
    <span>Memory - {$stats.memory}</span><br />
    <span>Time - {$stats.time}</span><br />
  {/if}
</main>
