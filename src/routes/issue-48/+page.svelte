<script>
  import { sourceSSE } from './sse'

  sourceSSE('/issue-48', ['event0'])
  sourceSSE('/issue-48', ['event0'])

  //   setTimeout(function run() {
  //     sourceSSE('/issue-48', ['event0'])
  //   }, 1000)
</script>
