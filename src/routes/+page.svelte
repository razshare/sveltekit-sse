<script>
  import { enhance } from '$app/forms'
  import Example from '../components/example.svelte'

  export let data

  let counter = 0
  function increaseCounter() {
    counter += 1
  }

  const quote = data?.quote
</script>

<button on:click={increaseCounter}>
  <span>Reload all components</span>
</button>

{#key counter}
  <Example />
{/key}

<h3>A Loaded Cat Quote</h3>
<span>{$quote?.value ?? ''}</span><br />

<form use:enhance method="post">
  <button>Force reconnect</button>
</form>
