<script>
  import Example from '../components/example.svelte'
  let counter = 0
  function increaseCounter() {
    counter += 1
  }
</script>

<button on:click={increaseCounter}>
  <span>Reload all components</span>
</button>

{#key counter}
  <Example />
{/key}
