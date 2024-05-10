import { source } from '$lib'
import { readonly, writable } from 'svelte/store'

/**
 * Wrapper for the source function that reconnects on close or error.
 *
 * @param {string} url Path to the stream.
 * @param {import('$lib/source').SourceConfiguration} [opts]
 */
export function reconnectingSource(url, opts = {}) {
  /** @type {import('svelte/store').Writable<'connecting' | 'reconnecting' | 'connected' | 'closed' | 'errored' >} */
  const status = writable('connecting')

  let stopped = false
  let _connect = function noop() {}

  function reconnect() {
    status.set('reconnecting')
    stopped = false
    _connect()
    listenToStopEvents()
  }

  const connection = source(url, {
    open({ connect }) {
      status.set('connected')
      _connect = connect
    },

    close({ connect }) {
      status.set('closed')
      _connect = connect

      if (!stopped) {
        console.error(
          `Event stream ${url} closed unexpectedly, reconnecting...`,
        )
        // reconnect() // Temporarily disabled
      }
    },

    error({ connect, error }) {
      status.set('errored')
      _connect = connect
      console.error(`Connection to ${url} errored:`, error)

      if (!stopped) {
        console.error(
          `Event stream ${url} errored unexpectedly, reconnecting...`,
        )
        // reconnect() // Temporarily disabled
      }
    },
    ...opts,
  })

  function listenToStopEvents() {
    let initial = false
    const unsub = connection.select('stop').subscribe(function listen(message) {
      if (!initial) {
        initial = true // svelte will call the first subscriber immediately, so we need to ignore
        return
      }

      stopped = true
      connection.close()
      if (message) {
        console.warn(`Event stream ${url} stoppped by server:`, message)
      } else {
        console.log(`Event stream ${url} stoppped by server.`)
      }
      unsub()
    })
  }

  return {
    ...connection,
    reconnect,
    status: readonly(status),
  }
}

/**
 * Use this function with SvelteKit form actions to prevent submission from
 * invalidating load functions.
 *
 * @type {import('@sveltejs/kit').SubmitFunction}
 */
export function skipInvalidate() {
  return async function onResponse({ update }) {
    await update({ reset: false, invalidateAll: false })
  }
}

/**
 * Default error handler for `.json()` transformer parsing errors.
 *
 * @type {import('$lib').JsonPredicate}
 */
export function orPrevious({ error, previous, raw }) {
  console.warn(
    `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
  )
  return previous
}
