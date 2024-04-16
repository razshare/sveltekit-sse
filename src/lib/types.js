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
 * const quote = source('/events', {
 *    close({ connect }) {
 *     console.log('reconnecting...')
 *     connect()
 *   }
 * })
 * ```
 * @property {function(ClosePayload):void} close Close the stream.
 */

/**
 * @typedef {(event:import('./types').Event)=>void} EventListener
 */

/**
 * @typedef {(eventName:string,data:string)=>import('./types').Unsafe<void>} EmitterOfManyEvents
 */

/**
 * @typedef Connection
 * @property {(eventName:string,data:string)=>import('./types').Unsafe<void>} emit Emit events to the client.\
 * The `Unsafe<void>` wrapper may contain an error
 * ## Example
 * ```js
 * const {error} = emit('message', 'hello world')
 * if(error){
 *  console.error(error)
 *  lock.set(false)
 *  return
 * }
 * ```
 * @property {import("svelte/store").Writable<boolean>} lock This store is initialized with `true`,
 * it prevents the underlying `Response` from resolving automatically.\
 * Set it to `false` in order to unlock the `Response` and end the stream immediately.
 *
 * > **Note**\
 * > You shouldn't `emit` any more events after setting the lock to `false`.\
 * > Attempting to emit more data afterwards will result into an error.
 * > ```js
 * > lock.set(false)
 * > const {error} = emit('message', 'hello world')
 * > if(error){
 * >  console.error(error) // "Client disconnected from the stream."
 * >  return
 * > }
 * > ```
 * @property {UnderlyingDefaultSource<string>} source
 */
