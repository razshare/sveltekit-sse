<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'
  const connection = source('/issue-55/events', {
    options: {
      method: 'GET',
    },
  })
  const message = connection.select('message')
  $effect(function track() {
    playwright.state.issue55.messages.push($message)
  })
</script>

<h3>{$message}</h3>
