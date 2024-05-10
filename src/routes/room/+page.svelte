<script>
  import { enhance } from '$app/forms'
  import { skipInvalidate } from './sse-utils'

  export let data

  $: usersInRoom = data.usersInRoom
  $: usersInLobby = data.usersInLobby
</script>

<h3>Inside</h3>

<ul>
  {#each $usersInRoom || [] as user (user.id)}
    <li>
      Participant {user.id}
      <b>{data.id === user.id ? '(You)' : ''}</b>
    </li>
  {:else}
    <li>
      <i
        >(There are no participants inside the room... which is suprising,
        because you are reading this)</i
      >
    </li>
  {/each}
</ul>

<h3>Outside</h3>

<ul>
  {#each $usersInLobby || [] as guest (guest.id)}
    <li>
      Guest {guest.id}
      <form method="post" use:enhance={skipInvalidate}>
        <input type="hidden" name="id" value={guest.id} />
        <button formaction="?/approve">✅ Approve</button>
        <button formaction="?/decline">❌ Decline</button>
      </form>
    </li>
  {:else}
    <li><i>(There are no guests in the waiting lobby)</i></li>
  {/each}
</ul>
