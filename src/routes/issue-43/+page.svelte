<!-- +page.svelte -->
<script>
  import { source } from '$lib'

  let reconnect = function noop() {
    console.log('test')
  }
  const connection = source(`/events`, {
    close({ connect }) {
      reconnect = connect
    },
  })
  const message = connection.select('message')
</script>

<h3>{$message}</h3>

<button on:click={connection.close}>Disconnect</button>
<button on:click={reconnect}>Reconnect</button>
