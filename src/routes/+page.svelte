<script>
  import Content from '../components/content.svelte'
  let counter = 0
  function increaseCounter() {
    counter += 1
  }
</script>

<button on:click={increaseCounter}>
  <span>Reload all components</span>
</button>

{#key counter}
  <Content />
{/key}
