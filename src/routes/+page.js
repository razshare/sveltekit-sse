import { source } from '$lib/source.js'

export function load() {
  /**
   * @type {import('svelte/store').Readable<null|import('./events/+server').Quote>}
   */
  const quote = source('/events', {
    close({ connect }) {
      console.log('reconnecting...')
      connect()
    },
  })
    .select('cat-quote')
    .json()

  return {
    quote,
  }
}
