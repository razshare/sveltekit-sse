import { source } from './source'
import { event } from './event'
import type { Subscriber, Invalidator, Unsubscriber } from 'svelte/store'

export type Producer = (emit: (data: string) => void, ping: () => void) => void

export type ServerSentEventSourceOnError = (
	callback: (event: MessageEvent, source: EventSource) => void
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

export { source, event, NonEmptyString }
