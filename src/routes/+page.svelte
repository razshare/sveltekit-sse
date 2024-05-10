<script>
  import { enhance } from '$app/forms'
  import { playwright } from '$lib/playwright/playwright.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  export let data

  $: quote = data?.quote

  $: if ($quote) {
    console.log({ $quote })
    console.log({ counter: playwright.state.counter })
    playwright.state.counter = ++playwright.state.counter
  }
</script>

<select
  value={$page.url.searchParams.get('lang') || 'en'}
  on:change={async function pick(e) {
    $page.url.searchParams.set('lang', e.currentTarget.value)
    goto(`?${$page.url.searchParams}`, { invalidateAll: false })
  }}
>
  <option value="en">🇦🇺 English</option>
  <option value="it">🇮🇹 Italiano</option>
</select>
<br />
<br />

<form use:enhance method="post">
  <button>Force reconnect</button>
</form>

<h3>An International Cat Quote</h3>
<span>{$quote?.value}</span><br />
