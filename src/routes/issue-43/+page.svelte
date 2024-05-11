<!-- +page.svelte -->
<script>
  import { source } from '$lib'
  import { playwright } from '$lib/playwright/playwright'
  import { onMount } from 'svelte'

  let reconnect = function noop() {
    console.log('noop')
  }

  const connection = source(`/issue-43/events`, {
    close({ connect }) {
      playwright.state.issue43.disconnections++
      reconnect = connect
    },
    open() {
      playwright.state.issue43.connections++
    },
  })
  const message = connection.select('message')

  onMount(function start() {
    setTimeout(function disconnect() {
      connection.close()
    }, 500)

    setTimeout(function disconnect() {
      reconnect()
    }, 1000)

    setTimeout(function disconnect() {
      connection.close()
    }, 1500)

    setTimeout(function disconnect() {
      reconnect()
    }, 2000)

    setTimeout(function disconnect() {
      connection.close()
    }, 2500)
  })
</script>

<h3>{$message}</h3>

<button on:click={connection.close}>Disconnect</button>
<button on:click={reconnect}>Reconnect</button>
