<script>
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
</script>

<select
  value={$page.url.searchParams.get('lang') || 'en'}
  on:change={async function pick(e) {
    $page.url.searchParams.set('lang', e.currentTarget.value)
    goto(`?${$page.url.searchParams}`)
  }}
>
  <option value="en">🇦🇺 English</option>
  <option value="it">🇮🇹 Italiano</option>
</select>

<br />
<br />

<slot />
