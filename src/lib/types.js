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
 * @property {string} id Message identifier, it identifies a message\
 * This value is not globally unique, it is only unique within the current stream's scope.
 * @property {string} event Name of the event.
 * @property {string} data Message data.
 * @property {boolean} isLocal If `true` then this event has been emitted locally, not by the server.
 * @property {number} status The status code of the underlying http response.
 * @property {string} statusText The status text of the underlying http response.
 * @property {Headers} headers The headers of the underlying http response.
 * @property {false|string} xSseId Stream identifier, it identifies a stream
 * ### Insurances
 *  - This value is unique within the scope of the server instance.\
 *    Two streams will never be identified by the same stream identifier at the *same time*.
 *  - This value is generated as an UUID.\
 *    See https://en.wikipedia.org/wiki/Universally_unique_identifier
 *
 * ### Warnings
 * - Although small, there is still a chance for this value to collide with other
 *   values generated separately on other server instances.\
 *   See https://en.wikipedia.org/wiki/Universally_unique_identifier#Collisions
 * - Given a stream `A` that was created at time `T` and closed at time `T+1`, there could be a stream `B` created at time `T+3` using stream `A`'s old identifier.\
 *   In other words, new streams could be assigned identifiers previously assigned to other streams (that are now closed).
 * - This value may sometimes be `false`, specifically when a `close` or `error` event is emitted locally
 *   before the source connects to the server.
 * @property {function():void} connect Connect the stream.
 * @property {Error} [error] Something went wrong.
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
 * @property {function():void} close Close the stream.
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

/**
 * Describes the current parsed json and the previous json values.
 * @template T
 * @typedef JsonPredicatePayload
 * @property {Error} error The error generated by `JSON.parse`.
 * @property {string} raw This is the current raw string value, the one that triggered the error.
 * @property {null|T} previous This is the previous value of the store.
 */

/**
 * @template [T = any]
 * @callback JsonPredicate
 * @param {JsonPredicatePayload<T>} payload
 * @returns {null|T}
 */

/**
 * Options for the underlying http request.
 * @typedef {Pick<import('@microsoft/fetch-event-source').FetchEventSourceInit, "body"|"cache"|"credentials"|"fetch"|"headers"|"integrity"|"keepalive"|"method"|"mode"|"openWhenHidden"|"redirect"|"referrer"|"referrerPolicy"|"window">} Options
 */
