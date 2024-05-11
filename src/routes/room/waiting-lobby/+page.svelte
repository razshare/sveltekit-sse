<script>
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'

  export let data

  $: waitingUser = data.waitingUser

  $: status = data.connection?.status

  $: if ($waitingUser?.approved) {
    goto('/room')
  }

  $: cancel = function cancel() {
    data.connection.close()
  }
</script>

<p>You are {data.id}, connection status {$status}</p>

{#if $status.includes('connecting')}
  <p>Connecting...</p>
{:else if $waitingUser?.approved === false}
  <p>You have been denied access to the room.</p>
{:else if $status === 'connected'}
  <p>Waiting to be let into the room...</p>
{:else}
  <p>Disconnected.</p>
{/if}

{#if $status === 'closed'}
  <form
    use:enhance={function skipInvalidate() {
      return async function onResponse({ update, result }) {
        await update({ reset: false, invalidateAll: false })
        if (result.type === 'success') {
          data.connection.reconnect()
        }
      }
    }}
    method="post"
    action="?/rejoin"
  >
    <input type="hidden" name="id" value={data.id} />
    <button>Retry?</button>
  </form>
{:else}
  <button type="button" on:click={cancel}>Cancel</button>
{/if}
