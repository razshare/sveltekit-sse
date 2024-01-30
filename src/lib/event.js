import { events } from './events.js'

/**
 * Send data to the client.
 * @callback EmitterOfOneEvent
 * @param {string} data Data to send.
 * @throws When `data` is not of type `string`.
 * @returns {void}
 */

/**
 * @typedef StartPayload
 * @property {EmitterOfOneEvent} emit Emit events to the client.
 * @property {import("svelte/store").Writable<boolean>} lock Set this store to false in order to terminate the event.
 * @property {UnderlyingDefaultSource<string>} source
 */

/**
 * @callback Start
 * @param {StartPayload} payload
 * @returns {void|PromiseLike<void>}
 */

/**
 * @callback Cancel
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * test
 * @typedef EventPayload
 * @property {Start} start
 * @property {Cancel} [cancel]
 */

/**
 * Create one stream and emit multiple server sent events.
 * @param {EventPayload} payload
 */

/**
 *
 * @param {EventPayload} payload
 * @returns
 */
export function event({ start, cancel }) {
  return events({
    cancel,
    start({ emit, lock, source }) {
      return start({
        lock,
        source,
        emit(data) {
          emit('message', data)
        },
      })
    },
  })
}
