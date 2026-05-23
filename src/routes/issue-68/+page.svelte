<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'
  const message = source('/issue-68', {
    method: 'GET',
    headers: {
      'X-Name': 'World',
    },
  }).select('message')

  message.subscribe(function update(name) {
    playwright.state.issue68.name = name
  })
</script>

{$message}
