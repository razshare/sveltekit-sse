import { source } from '$lib/source.js'

export function load({ url }) {
  const searchParams = new URLSearchParams(url.search)

  const connection = source(`/events?${searchParams}`, {
    cache: false,
    close({ status, connect, isLocal }) {
      if (isLocal) {
        return
      }
      console.log('Closed', { status, isLocal })
      console.log('reconnecting...')
      connect()
    },
    open({ status, isLocal }) {
      console.log('Opened', { status, isLocal })
    },
  })

  /**
   * @type {import('svelte/store').Readable<null|import('./events/+server.js').Quote>}
   */
  const quote = connection.select('cat-quote').json(function or({
    error,
    previous,
    raw,
  }) {
    console.warn(
      `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
    )
    return previous
  })

  // setTimeout(function disconnect() {
  //   console.log('Closing manually...')
  //   connection.close()
  // }, 3000)

  return {
    quote,
  }
}
