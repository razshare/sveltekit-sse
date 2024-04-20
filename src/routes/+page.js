import { source } from '$lib/source.js'

export function load({ url }) {
  console.log('loading...')

  const searchParams = new URLSearchParams(url.search)

  /**
   * @type {import('svelte/store').Readable<null|import('./events/+server.js').Quote>}
   */
  const quote = source(`/events?${searchParams}`, {
    close({ connect, local }) {
      if (local) {
        return
      }
      console.log('reconnecting...')
      connect()
    },
  })
    .select('cat-quote')
    .transform(function run(data) {
      return {
        id: '0',
        value: `transformed: ${data}`,
      }
    })
  // .json(function or({ error, previous, raw }) {
  //   console.log(
  //     `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
  //   )
  //   return previous
  // })

  return {
    quote,
  }
}
