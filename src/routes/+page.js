import { source } from '$lib/source.js'

export function load({ url }) {
  const searchParams = new URLSearchParams(url.search)

  /**
   * @type {import('svelte/store').Readable<null|import('./events/+server.js').Quote>}
   */
  const quote = source(`/events?${searchParams}`, {
    close({ connect }) {
      console.log('reconnecting...')
      connect()
    },
  })
    .select('cat-quote')
    .json(function or({ error, previous, raw }) {
      console.log(
        `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
      )
      return previous
    })

  return {
    quote,
  }
}
