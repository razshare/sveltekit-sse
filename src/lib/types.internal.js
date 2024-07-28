export {}

// Source.

/**
 * @typedef ConnectablePayload
 * @property {string} resource Path to the stream.
 * @property {import('./types.external').Options} options Options for the underlying http request.
 * @property {import('./types.external').EventListener} onError
 * @property {import('./types.external').EventListener} onClose
 * @property {import('./types.external').EventListener} onOpen
 */

/**
 * A message from the currently connected source.
 * @typedef ConnectableMessage
 * @property {string} id Message identifier.
 * @property {string} event Event name.
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
 * @typedef StreamEvents
 * @property {Array<import('./types.external').EventListener>} onError
 * @property {Array<import('./types.external').EventListener>} onClose
 * @property {Array<import('./types.external').EventListener>} onMessage
 * @property {Array<import('./types.external').EventListener>} onOpen
 */

/**
 * @typedef ConsumePayload
 * @property {string} resource
 * @property {import('./types.external').Options} options
 * @property {import('./types.external').EventListener} onMessage
 * @property {import('./types.external').EventListener} onError
 * @property {import('./types.external').EventListener} onClose
 * @property {import('./types.external').EventListener} onOpen
 */

/**
 * @typedef ConsumedStream
 * @property {AbortController} controller
 * @property {string} resource
 */
