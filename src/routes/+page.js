import { source } from '$lib/source.js'

export function load({ url }) {
  const searchParams = new URLSearchParams(url.search)

  /**
   * @type {import('svelte/store').Readable<null|import('./events/+server.js').Quote>}
   */
  const quote = source(`/events?${searchParams}`, {
    cache: false,
    close({ status, connect, xSseId }) {
      console.log('Closed', { status, xSseId })
      console.log('reconnecting...')
      connect()
    },
    open({ status, xSseId }) {
      console.log('Opened', { status, xSseId })
    },
  })
    .select('cat-quote')
    .json(function or({ error, previous, raw }) {
      console.warn(
        `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
      )
      return previous
    })

  return {
    quote,
  }
}
