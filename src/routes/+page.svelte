<script>
  import { enhance } from '$app/forms'
  import { playwright } from '$lib/playwright/playwright.js'
  export let data
  $: quote = data?.quote

  $: if ($quote) {
    console.log({ $quote })
    console.log({ counter: playwright.state.counter })
    playwright.state = {
      counter: ++playwright.state.counter,
    }
  }
</script>

<form use:enhance method="post">
  <button>Force reconnect</button>
</form>

<h3>An International Cat Quote</h3>
<span>{$quote?.value}</span><br />
