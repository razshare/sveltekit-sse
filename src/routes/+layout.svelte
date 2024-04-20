<script>
  import { goto } from '$app/navigation'
  import { navigating, page } from '$app/stores'
  let lang = $page.url.searchParams.get('lang') || 'en'
</script>

<select
  bind:value={lang}
  on:change={async function pick(e) {
    $page.url.searchParams.set('lang', e.currentTarget.value)
    goto(`?${$page.url.searchParams}`, {
      // You need this!
      // Otherwise subsequent goto() calls will not invoke the load function.
      // If the load() function doesn't get invoked, then the #key below
      // will update the slot with the old source store, which will
      // be closed at that point.
      invalidateAll: true,
    })
  }}
>
  <option value="en">🇦🇺 English</option>
  <option value="it">🇮🇹 Italiano</option>
</select>
<br />
<br />
<!-- 
  Using goto() will not unsubscribe from your stores, 
  you need to force the client to unsubscribe using a #key. 
  The $page store works just fine as a key here.
  The $navigating store also works because 
  it is indirectly updated by goto().
-->
{#key $navigating}
  <slot />
{/key}
