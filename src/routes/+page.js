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

  const quote = connection.select('cat-quote').json(
    /**
     * @param {{error:Error,previous:import('./events/+server.js').Quote?,raw:string}} payload
     * @returns
     */
    function or({ error, previous, raw }) {
      console.warn(
        `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
      )
      return previous
    },
  )

  // setTimeout(function disconnect() {
  //   console.log('Closing manually...')
  //   connection.close()
  // }, 3000)

  return {
    quote,
  }
}
