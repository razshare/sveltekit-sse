import { source } from './source.js'
import { event } from './event.js'
import type { Subscriber, Invalidator, Unsubscriber } from 'svelte/store'

export type ProducerOfOneEvent = (emit: (data: string) => void) => void | PromiseLike<void>
export type ProducerOfManyEvents = (emit: (eventName: string, data: string) => void) => void | PromiseLike<void>

export type ServerSentEventSourceOnError = (
	callback: (event: MessageEvent, source: EventSource) => void | PromiseLike<void>
) => ServerSentEventSource

export type ServerSentEventSourceSubscribe = (
	subscriber: Subscriber<string>,
	invalidate?: Invalidator<string>
) => Unsubscriber

export type ServerSentEventSourceSetReconnect = (reconnect: boolean) => ServerSentEventSource

export type ServerSentEventSource = {
	subscribe: ServerSentEventSourceSubscribe
	/**
	 * Execute a callback on error.
	 * @param callback
	 * @returns
	 */
	onError: ServerSentEventSourceOnError
	/**
	 * Wether or not to allow the source to reconnect when an error occurs.
	 * @param reconnect if set to true, the underlying `EventSource` will attempt to reconnect, otherwise the source will be closed immediately after the first error occurs.
	 * @returns
	 */
	setReconnect: ServerSentEventSourceSetReconnect
}

type NonEmptyString<T extends string> = '' extends T ? never : T

export { source, event }
