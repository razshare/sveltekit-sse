<script>
  import { enhance } from '$app/forms'
  export let data
  const quote = data?.quote
  const quote2 = data?.quote2
</script>

<form use:enhance method="post">
  <button>Force reconnect</button>
</form>

<h3>An International Cat Quote</h3>

<span>{$quote?.value}</span><br />
<span>{$quote2?.value}</span><br />
