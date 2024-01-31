export {}

/**
 * @template T
 * @typedef {{value:T,error:false|Error}} Unsafe
 */

/**
 * @typedef ClosePayload
 * @property {string} [reason]
 */

/**
 * Describes an event before being serialized.
 * @typedef Event
 * @property {string} id Message identifier.
 * @property {string} event Name of the event.
 * @property {string} data Message data.
 * @property {Error} [error] Something went wrong.
 * @property {function():void} connect Connect the stream.
 * > **Note**\
 * > You can use this whenever the stream disconnects for any reason in order to reconnect.
 *
 * ## Example
 * ```js
 * const connection = source('/custom-event')
 * connection.onClose(function run({ connect }) {
 *   console.log('stream closed')
 *   connect()
 * })
 * ```
 * @property {function(ClosePayload):void} close Close the stream.
 */

/**
 * @typedef {(event:import('./types').Event)=>void} EventListener
 */
