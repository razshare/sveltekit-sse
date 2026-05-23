<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { delay } from '$lib/delay'
  import { playwright } from '$lib/playwright/playwright'

  let status = $state('disconnected')
  const value = source(`/issue-73/events`, {
    onopen() {
      console.log('connected')
      status = 'Connected'
      playwright.state.issue73.connections++
    },
    onclose() {
      console.log('disconnected')
      status = 'Disconnected'
      playwright.state.issue73.disconnections++
    },
    async onerror({ connect }) {
      console.log('disconnected')
      status = 'Disconnected'
      playwright.state.issue73.abruptDisconnections++
      await delay(100)
      connect()
    },
  }).select('message')
</script>

<span>Status: {status}</span>
<br />
<span>Value: {$value}</span>
