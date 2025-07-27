<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'

  const message1 = source(`/pr-69/events?name=猫`).select('message')
  const message2 = source(`/pr-69/events?name=猫`).select('message')

  $effect(function run() {
    playwright.state.pullRequest69.message1 = $message1
    playwright.state.pullRequest69.message2 = $message2
  })
</script>

<span>Message 1:{$message1}</span>
<br />
<span>Message 2:{$message2}</span>
