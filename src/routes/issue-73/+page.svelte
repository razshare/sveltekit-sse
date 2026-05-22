<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'

  let status = $state('disconnected')
  const value = source(`/issue-73/events`, {
    open() {
      status = 'Connected'
      playwright.state.issue73.connected = true
    },
    close() {
      status = 'Disconnected'
      playwright.state.issue73.connected = false
    },
    error() {
      status = 'Disconnected'
      playwright.state.issue73.connected = false
    },
  }).select('message')
</script>

<span>Status: {status}</span>
<br />
<span>Value:{$value}</span>
