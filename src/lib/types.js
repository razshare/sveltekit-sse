export {}
/**
 * @template T
 * @typedef {{[K in keyof T]:T[K]} & {}} Pretty
 */

/**
 * State of the stream.\
 * It can be
 * - `CONNECTING` = `0`
 * - `OPEN` = `1`
 * - `CLOSED` = `2`
 * @typedef {0|1|2} StreamState
 */

/**
 * Options for the underlying http request.
 * @typedef {Pick<import('@microsoft/fetch-event-source').FetchEventSourceInit, "body"|"cache"|"credentials"|"fetch"|"headers"|"integrity"|"keepalive"|"method"|"mode"|"openWhenHidden"|"redirect"|"referrer"|"referrerPolicy"|"timeout"|"window"> & {beacon:?number}} Options
 */

/**
 * Describes a json parse error.
 * @template T
 * @typedef OnJsonParseErrorPayload
 * @property {Error} error What went wrong.
 * @property {string} currentRawValue This raw string value that triggered this error.
 * @property {null|T} previousParsedValue This is the previous value of the store.
 */

/**
 * Do something when a error occurs during json parsing and return a substitute new value of the store.
 * @template T
 * @callback OnJsonParseError<T>
 * @param {OnJsonParseErrorPayload<T>} payload
 * @returns {null|T|PromiseLike<null|T>} This value will be assigned to the `Readable<T>` store.
 */

/**
 * Connect the stream.
 * @callback ConnectStream
 */

/**
 * Close the stream.
 * @callback CloseStream
 * @param {false|string} reason A short description explaining the reason for closing the stream.
 */

/**
 * Describes an event before being serialized.
 * @typedef Event
 * @property {string} id Message identifier.
 * @property {string} event Name of the event.
 * @property {string} data Message data.
 * @property {false|Error} error Something went wrong.
 * @property {ConnectStream} connect Connect the stream.
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
 * @property {CloseStream} close Close the stream.
 */

/**
 * @typedef {function(Event):void} ListenerCallback
 */

/**
 * Subscribe to the event.
 * @callback Subscribe
 * @param {import('svelte/store').Subscriber<string>} callback Callback to inform of a value updates.
 * @param {import('svelte/store').Invalidator<string>} [invalidate] Cleanup logic callback.
 * @returns {import('svelte/store').Unsubscriber} Unsubscribes from value updates.
 * @throws When `callback` is not of type `function`.
 */

/**
 * Close the source connection.
 * @callback CloseConnection
 * @returns {Promise<void>}
 */

/**
 * Invoke `callback` whenever an error occurs.
 * @callback OnError
 * @param {ListenerCallback} callback
 * @returns {Pretty<Source>} Consume a server sent event as a readable store.
 * @throws When `callback` is not of type `function`.
 */

/**
 * Invoke `callback` whenever the connection closes.
 * @callback OnClose
 * @param {ListenerCallback} callback
 * @returns {Pretty<Source>} Consume a server sent event as a readable store.
 * @throws When `callback` is not of type `function`.
 */

/**
 * Name of the event.
 * @typedef {string} EventName
 */

/**
 * Add a server sent event listener.
 * @callback StreamedAddEventListener
 * @param {EventName} eventName Name of the event.
 * @param {ListenerCallback} listener Callback to add.
 */

/**
 * Remove a server sent event listener.
 * @callback StreamedRemoveEventListener
 * @param {EventName} eventName Name of the event.
 * @param {ListenerCallback} listener Callback to remove.
 */

/**
 * Close the stream.
 * @callback StreamedClose
 * @param {false|string} [reason] A short description explaining the reason for closing the stream.
 * @returns
 */

/**
 * Stream has been established and this is information regarding the connection.
 * @typedef Streamed
 * @property {string} url The URL the stream is connecting to.
 * @property {StreamState} readyState State of the stream.\
 * It can be
 * - `CONNECTING` = `0`
 * - `OPEN` = `1`
 * - `CLOSED` = `2`
 * @property {StreamedAddEventListener} addEventListener Add a server sent event listener.
 * @property {StreamedRemoveEventListener} removeEventListener Remove a server sent event listener.
 * @property {StreamedClose} close Close the stream.
 */

/**
 * Stream an http request (using `fetch` underneath) as if it were an `EventSource`.\
 * This will allow you to set custom http headers for the request, which the standard `EventSource` does not permit.
 * @callback Stream
 * @param {RequestInfo|URL} resource This defines the resource that you wish to fetch. This can either be:
 * - A string or any other object with a [stringifier](https://developer.mozilla.org/en-US/docs/Glossary/Stringifier) — including a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object — that provides the URL of the resource you want to fetch.
 * - A [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.
 * @param {false|import('./types').Options} options An object containing any custom settings that you want to apply to the request. The possible options are:
 * - `method`\
 *   The request method, e.g., `"GET"`, `"POST"`.\
 *   The default is `"GET"`.
 * - `headers`\
 *   Any headers you want to add to your request, contained within a [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object or an object literal with [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String) values.
 * > **Note**\
 * > [some names are forbidden](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name).
 * - `body`\
 *   Any body that you want to add to your request: this can be a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob), an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), a [TypedArray](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), a [DataView](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView), a [FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData), a [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams), string object or literal, or a [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) object. This latest possibility is still experimental; check the [compatibility information](https://developer.mozilla.org/en-US/docs/Web/API/Request#browser_compatibility) to verify you can use it.
 * > **Note**\
 * > a request using the GET or HEAD method cannot have a body.
 * @param {false|((id:string)=>void)} [onIdFound]
 * @returns {Streamed}
 */

/**
 * Connection established.
 * @typedef Connected
 * @property {Streamed} eventSource Stream has been established and this is information regarding the connection.
 * @property {number} connectionsCounter How many other clients are connected to the stream.
 * @property {()=>void} stopBeacon
 */

/**
 * Close the source connection `resource`.
 * @callback ConnectToSource
 * @param {RequestInfo|URL} resource Path to the stream.
 * @param {false|Options} options Options for the underlying http request.
 * @returns {Connected} Connection established.
 */

/**
 * Close the source connection `resource`. This will trigger onClose.
 * @callback DisconnectFromSource
 * @param {RequestInfo|URL} resource Path to the stream.
 */

/**
 * @template [T=any]
 * @callback TransformerCallback
 * @param {ReadableStream<string>} stream
 * @returns {import('svelte/store').Readable<T>}
 */

/**
 * Parse each message of the selected event and manually convert them into a `Readable<T>` store.
 * @template [T=any]
 * @callback Transform
 * @param {TransformerCallback<T>} callback
 * @returns {import('svelte/store').Readable<T>}
 */

/**
 * @template T
 * @callback CreateTransformer
 * @param {RequestInfo|URL} resource Path to the stream.
 * @param {false|Options} options Options for the underlying http request.
 * @param {EventName} eventName Name of the event.
 * @return {Transform<T>} Parse each message of the selected event and manually convert them into a `Readable<T>` store.
 */

/**
 * State of the source.
 * @typedef SourceState
 * @property {number} eventsCounter How many events are currently using the stream.
 */

/**
 * @callback CreateStore
 * @param {RequestInfo|URL} resource path to the stream.
 * @param {false|Options} options options for the underlying http request.
 * @param {EventName} eventName
 * @param {Map<string, import('svelte/store').Readable<string>>} readables
 * @param {SourceState} state State of the source.
 */

/**
 * Parse each message of the selected event as `JSON` and wrap them in a `Readable<T>` store.
 * @template [T=any]
 * @callback Json
 * @param {false|OnJsonParseError<T>} [onJsonParseError] A callback that will be invoked whenever an error occurs while parsing the `JSON`.
 * @returns {import("svelte/store").Readable<null|T>} A readable store that will emit the parsed `JSON` or `null` whenever an error occurs while parsing the `JSON`.
 */

/**
 * Selected event.
 * @template [T=any]
 * @typedef Selected
 * @property {Subscribe} subscribe Subscribe to the selected event.
 * @property {Transform<T>} transform Parse each message of the selected event and manually convert them into a `Readable<T>` store.
 * @property {Json<T>} json Parse each message of the selected event as `JSON` and wrap them in a `Readable<T>` store.
 */

/**
 * Select an event from the stream.
 * @callback Select
 * @param {EventName} eventName Name of the event.
 * @returns {Pretty<Selected>} Selected event.
 * @throws When `eventName` is not of type `string`.
 * @throws When `eventName` is not found.
 * @throws When `eventName` contains new lines (`\n`).
 */

/**
 * Source connected.
 * @template [T=any]
 * @typedef Sourced
 * @property {Subscribe} subscribe Subscribe to the default `message` event.
 * @property {CloseConnection} close Close the source connection.
 * This will trigger `onClose`.
 * @property {OnError} onError Invoke `callback` whenever an error occurs.
 * ## Example
 * ```js
 * source('/api/events').onError(function run(event) {
 *  console.log('Something went wrong!', event.error)
 * })
 * ```
 * @property {OnClose} onClose Invoke `callback` whenever the connection closes.
 * ## Example
 * ```js
 * source('/api/events').onClose(function run(event){
 *  console.log("Connection closed, reconnecting...")
 *  event.connect()
 * })
 * ```
 * @property {Transform<T>} transform Parse each message of the selected event and manually convert them into a `Readable<T>` store.
 * > ## Example
 * > ```js
 * > source('/api/events').transform(function run(stream) {
 * >    return readable('', function start(set) {
 * >      async function produce() {
 * >        const reader = stream.getReader()
 * >        let message: undefined | string
 * >        let ok = true
 * >        do {
 * >          message = (await reader.read()).value
 * >
 * >          if (undefined === message) {
 * >            ok = false
 * >            continue
 * >          }
 * >
 * >          set(message.toLocaleUpperCase())
 * >        } while (ok)
 * >      }
 * >      produce()
 * >    })
 * >  })
 * > ```
 * @property {Json<T>} json Parse each message of the selected event as `JSON` and wrap them in a `Readable<T>` store.
 * @property {Select} select Select an event from the stream.
 */

/**
 * Consume a server sent event as a readable store.
 *
 * > **Note**\
 * > Calling this multiple times using the same `resource` string will not
 * > create multiple streams, instead the same stream will be reused for all exposed
 * > events on the given `resource`.
 * @template [T=any]
 * @callback Source
 * @param {string} resource path to the stream.
 * @param {false|Options} [options] Options for the underlying http request.
 * @returns {Sourced<T>} Source connected.
 */

/**
 * @typedef EventsOptions
 * @property {false|import("svelte/store").Writable<boolean>} locked
 */

/**
 * @callback ProducerOfOneEvent
 * @param {EmitterOfOneEvent} emit
 * @returns {boolean} `false` if the stream has been canceled, otherwise `true`.
 */

/**
 * @callback ProducerOfManyEvents
 * @param {EmitterOfManyEvents} emit
 * @returns {void|PromiseLike<void>}
 */

/**
 * @callback OnCancelCallback
 * @param {UnderlyingDefaultSource<string>} stream
 * @returns {void|PromiseLike<void>}
 */

/**
 * Send data to the client.
 * @callback EmitterOfOneEvent
 * @param {string} data Data to send.
 * @throws When `data` is not of type `string`.
 * @returns {void}
 */

/**
 * Send data to the client.
 * @callback EmitterOfManyEvents
 * @param {string} eventName Name of the event.
 * @param {string} data Data to send.
 * @throws When `eventname` or `data` are not of type `string`.
 * @returns {boolean} `false` if the stream has been canceled, otherwise `true`.
 */

/**
 * @callback CreateEmitter
 * @param {ReadableStreamDefaultController} controller
 * @param {{canceled:boolean}} streamInfo
 * @returns {EmitterOfManyEvents}
 */

/**
 * @callback CreateStream
 * @param {ProducerOfManyEvents} producer A callback that will be provided an `emit()` function which you can use to send data to the client.
 * @param {string} id
 * @param {number} expectBeacon
 * @param {Array<OnCancelCallback>} onCancel Do something when the stream is canceled.
 * @param {EventsOptions} options
 * @returns {ReadableStream<string>} Options for the event.
 */

/**
 * Create one stream and emit multiple server sent events.
 * @callback CreatorOfManyEventsGateway
 * @param {ProducerOfManyEvents} producer A callback that will be provided an `emit()` function which you can use to send data to the client.
 * @param {EventsOptions} [options] Options for the event.
 * @returns {EventsGateway}
 */

/**
 * Create one stream and emit one server sent event.
 *
 * > **Note**\
 * > This will use the default event, which is `message`.
 * @callback CreatorOfOneEventGateway
 * @param {ProducerOfOneEvent} producer A callback that will be provided an `emit()` function which you can use to send data to the client.
 * @param {EventsOptions} [options] Options for the event.
 * @returns {EventsGateway}
 */

/**
 * Set the a time before a beacon is expected.
 * Once this time is exceeded, the stream will close on the server side.
 * @callback SetExpectBeacon
 * @param {number} milliseconds
 * @returns {EventsGateway}
 */

/**
 * @typedef EventsGateway
 * @property {SetHeader} setHeader Set a response header.
 *
 * ### Note
 * The following headers are set by default for all events:
 * ```json
 * {
 *   "Cache-Control": "no-store",
 *   "Content-Type": "text/event-stream",
 *   "Connection": "keep-alive",
 * }
 * ```
 *
 * ### Warning
 * Overwriting the default headers is allowed.
 *
 * Overwriting header `Content-Type` to something other than `text/event-stream` will break the SSE contract and the event will stop working as intended.
 * @property {OnCancel} onCancel Do something after the stream has been canceled.
 * @property {GetStream} getStream Get the underlying stream used by the event.
 * @property {SetExpectBeacon} expectBeacon Set the a time before a beacon is expected in `milliseconds`.
 * Once this time is exceeded, the stream will close on the server side.
 * @property {ToResponse} toResponse Build a `Response`.
 */

/**
 * Set a response header.
 *
 * ### Note
 * The following headers are set by default for all events:
 * ```json
 * {
 *   "Cache-Control": "no-store",
 *   "Content-Type": "text/event-stream",
 *   "Connection": "keep-alive",
 * }
 * ```
 *
 * ### Warning
 * Overwriting the default headers is allowed.
 *
 * Overwriting header `Content-Type` to something other than `text/event-stream` will break the SSE contract and the event will stop working as intended.
 * @callback SetHeader
 * @param {string} key
 * @param {string} value
 * @returns {EventsGateway}
 */

/**
 * Do something after the stream has been canceled.
 * @callback OnCancel
 * @param {import("./types").OnCancelCallback} callback
 * @returns {EventsGateway}
 */

/**
 * Get the underlying stream used by the event.
 * @callback GetStream
 * @param {string} id
 * @returns {ReadableStream<string>}
 */

/**
 * Build a `Response`.
 * @callback ToResponse
 * @param {Request} request
 * @returns {Response}
 */
