<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'

  const value = source(`/issue-70/events`, {
    options: {
      onmessage(e) {
        console.log({ onmessage: e })
        playwright.state.issue70.onmessage.push(e)
      },
      onopen(e) {
        console.log({ onopen: e })
        playwright.state.issue70.status = e.status
      },
    },
  }).select('message')
</script>

<span>Value:{$value}</span>
