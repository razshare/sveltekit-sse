export {}

// Source.

/**
 * A message from the currently connected source.
 * @typedef ConnectableMessage
 * @property {string} id Message identifier.
 * @property {string} eventName Event name.
 * @property {string} data Event data.
 */

/**
 * Connectable features.
 * @typedef ConnectableAugmentations
 * @property {function():void} close Close the current connection.
 */

/**
 * @typedef {false | ConnectableMessage} ConnectableStartPayload
 */

/**
 * @typedef {import('svelte/store').Readable<ConnectableStartPayload> & ConnectableAugmentations} Connectable
 */

// Produce.

/**
 * @typedef CreateEmitterPayload
 * @property {ReadableStreamDefaultController} controller
 * @property {{connected:boolean}} context
 */

/**
 * @typedef ProduceStreamPayload
 * @property {import('./types.external').Start} start
 * @property {number} [ping] The server will ping the client every `interval` milliseconds to check if it's still connected.\
 * If the client has disconnected, the stream will be un`locked` and the connection will terminate.\
 * Defaults to `30_000` milliseconds (`30` seconds).
 * @property {import('svelte/store').Writable<boolean>} lock
 * @property {StreamContext} context
 * @property {import('./types.external').Stop} [stop]
 */

/**
 * @typedef StreamContext
 * @property {boolean} connected
 */

// Consume.

/**
 * @typedef ConsumedStream
 * @property {AbortController} controller
 * @property {string} resource
 */

// FetchEventSource

/**
 * @typedef FetchEventSourceOptions
 * @property {function():void} [onclose] Do something whenever the connection closes.
 * @property {function(Response):void} [onopen] Do something whenever the connection opens.
 * @property {function(Error):void} [onerror] Do something whenever there are errors.
 * @property {function(import("./types.external").Message):void} [onmessage] Do something whenever a message is received.
 * @property {AbortSignal} [signal]
 * @property {string} [method]
 * @property {any} [body]
 * @property {Record<string,string>} [headers]
 * @property {boolean} [openWhenHidden]
 */
