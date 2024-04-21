<script>
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
</script>

<select
  value={$page.url.searchParams.get('lang') || 'en'}
  on:change={async function pick(e) {
    $page.url.searchParams.set('lang', e.currentTarget.value)
    goto(`?${$page.url.searchParams}`, {
      // You need this!
      // Otherwise subsequent goto() calls will not invoke the load function.
      // If the load() function doesn't get invoked, then the #key below
      // will update the slot with the old source store, which will
      // be closed at that point.
      invalidateAll: false,
    })
  }}
>
  <option value="en">🇦🇺 English</option>
  <option value="it">🇮🇹 Italiano</option>
</select>

<br />
<br />

<slot />
