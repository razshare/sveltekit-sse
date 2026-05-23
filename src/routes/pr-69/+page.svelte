<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'

  const connection1 = source(`/pr-69/events?name=猫`)
  const connection2 = source(`/pr-69/events?name=猫`)
  const message1 = connection1.select('message')
  const message2 = connection2.select('message')

  $effect(function run() {
    playwright.state.pullRequest69.connection1 = connection1
    playwright.state.pullRequest69.connection2 = connection2
    playwright.state.pullRequest69.message1 = $message1
    playwright.state.pullRequest69.message2 = $message2
    console.log('connection1 === connection2', connection1 === connection2)
    console.log('message1 === message2', $message1 === $message2)
  })
</script>

<span>Message 1:{$message1}</span>
<br />
<span>Message 2:{$message2}</span>
