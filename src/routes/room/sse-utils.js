import { source } from '$lib'
import { readonly, writable } from 'svelte/store'

/**
 * Wrapper for the source function that reconnects on close or error.
 *
 * @param {string} url Path to the stream.
 * @param {import('$lib').SourceConfiguration} [opts]
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

    close({ connect, isLocal }) {
      status.set('closed')
      _connect = connect

      if (isLocal) {
        stopped = true
      } else if (!stopped) {
        console.error(
          `Event stream ${url} closed unexpectedly, reconnecting...`,
        )
        reconnect()
      }
    },

    error({ connect, error, isLocal }) {
      status.set('errored')
      _connect = connect
      console.error(`Connection to ${url} errored:`, error)

      if (isLocal) {
        stopped = true
      } else if (!stopped) {
        console.error(
          `Event stream ${url} errored unexpectedly, reconnecting...`,
        )
        reconnect()
      }
    },
    ...opts,
  })

  function listenToStopEvents() {
    let initial = true
    const unsub = connection.select('stop').subscribe(function listen(message) {
      if (initial) {
        initial = false // Svelte will call the first subscriber immediately, so we need to ignore
        return
      }

      // Discard prefix - timetamp followed by colon, space
      message = message.split(': ')[1]

      stopped = true
      connection.close()
      if (message) {
        console.warn(`Event stream ${url} stoppped by server:`, message.length)
      } else {
        console.log(`Event stream ${url} stoppped by server.`)
      }
      unsub()
    })
  }

  listenToStopEvents()

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
 * @type {import('$lib').JsonPredicate<any>}
 */
export function orPrevious({ error, previous, raw }) {
  console.warn(
    `Could not parse "${raw}" as json, reverting back to ${previous}. ${error}`,
  )
  return previous
}
