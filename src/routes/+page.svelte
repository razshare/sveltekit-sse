<script>
  import { enhance } from '$app/forms'
  export let data

  $: quote = data?.quote
</script>

<form use:enhance method="post">
  <button>Force reconnect</button>
</form>

<h3>An International Cat Quote</h3>
<span>{$quote?.value}</span><br />
