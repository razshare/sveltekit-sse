<script>
  import { source } from '$lib'

  const value = source('/issue-40/sse')
    .select('message')
    .transform(function convert(value) {
      return { value }
    })

  value.subscribe(function watch(message) {
    console.log(message)
  })
</script>
