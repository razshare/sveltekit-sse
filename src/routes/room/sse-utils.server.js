/**
 * Helper function to create a stopper object for SSE events.
 *
 * @param {string} route_id
 * @param {import('$lib').Connection['emit']} emit
 * @param {import('$lib').Connection['lock']} lock
 *
 * @example
 * export function POST({ route, request }) {
 *   return events({
 *     request,
 *     start({ emit, lock }) {
 *       const stopper = eventStopper(route.id, emit, lock)
 *
 *       const unsub = databaseListener.subscribe(function notify(event) {
 *         if (event.type === 'new') {
 *           const { error } = emit('event', JSON.stringify(event))
 *           if (error) {
 *             return stopper.stop(error)
 *           }
 *         } else if (event.type === 'end') {
 *           return stopper.stop()
 *         } else {
 *           return stopper.stop('Unexpected error')
 *         }
 *       })
 *
 *       stopper.push(unsub)
 *
 *       return stopper.onStop
 *     }
 *   })
 * }
 */
export function eventStopper(route_id, emit, lock) {
  /** @type {(() => void)[]} */
  const stopFunctions = []

  return {
    /**
     * Appends a callback to run when the stopper is stopped.
     * @param {() => void} func
     */
    push(func) {
      stopFunctions.push(func)
    },

    /**
     * Calls all functions in the stopper. Expected usage is that this will be\
     * returned at the end of the `start` scope of the `events` function,
     * instead of being called directly.
     */
    onStop() {
      for (const fn of stopFunctions) {
        try {
          console.debug('Stopping SSE @', route_id)
          fn()
        } catch (err) {
          console.error('Error stopping SSE @', route_id, err)
        }
      }
    },

    /**
     * Emits a `stop` event to the client, then locks the connection. If a
     * message is provided, it will be pushed to the client as an error message.
     */
    stop(message = '') {
      // Include timestamp with message to ensure Svelte reactivity
      const { error } = emit('stop', `${new Date().getTime()}: ${message}`)
      if (error && error.message !== 'Client disconnected from the stream.') {
        console.error('Error stopping SSE @', route_id, error)
      }
      lock.set(false)

      return this.onStop
    },
  }
}
