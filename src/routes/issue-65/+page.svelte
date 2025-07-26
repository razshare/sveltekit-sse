<script>
  import { stats } from '$lib/stores/stats'
  import { playwright } from '$lib/playwright/playwright'
  $effect(function track() {
    if (!$stats) {
      return
    }
    playwright.state.issue65.cpu_usage = $stats.cpu_usage
    playwright.state.issue65.memory = $stats.memory
  })
</script>

<main>
  <h2>Admin dashboard page</h2>

  {#if $stats}
    <span>Cpu usage - {$stats.cpu_usage}</span><br />
    <span>Memory - {$stats.memory}</span><br />
    <span>Time - {$stats.time}</span><br />
  {/if}
</main>
