<script>
  import { source } from '$lib'
  import { onMount } from 'svelte'
  /**
   * @type {false|import('svelte/store').Unsubscriber}
   */
  let SSE_unsub = false
  /**
   * @type {Array<string>}
   */
  let payloads = []
  onMount(function run() {
    if (SSE_unsub) {
      return
    }
    SSE_unsub = source('/sse').subscribe(async function watch(payload) {
      if (!payload?.length) return
      let data
      try {
        data = JSON.parse(payload)
      } catch (e) {
        // debugger;
        console.log(e, payload)
        data = payload
      }
      if (Array.isArray(data)) {
        payloads = [...(payloads || []), ...data]
      }
      console.log({ payloads })
    })
  })
</script>

<slot />
