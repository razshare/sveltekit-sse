<script>
  import Content from '../components/content.svelte'
  let k = 0
</script>

<button
  on:click={function run() {
    k++
  }}
>
  <span>Reload all components</span>
</button>

{#key k}
  <Content />
{/key}
