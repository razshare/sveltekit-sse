import { source } from './source.js'
import { event } from './event.js'
import type { Subscriber, Invalidator, Unsubscriber } from 'svelte/store'

export type Producer = (emit: (data: string) => void, ping: () => void) => void | Promise<void>

export type ServerSentEventSource = {
	subscribe: (subscriber: Subscriber<string>, invalidate?: Invalidator<string>) => Unsubscriber
	/**
	 * Execute a callback on error.
	 * @param callback
	 * @returns
	 */
	onError: (callback: (event: MessageEvent) => void | Promise<void>) => ServerSentEventSource
	/**
	 * Wether or not to allow the source to reconnect when an error occurs.
	 * @param reconnect if set to true, the underlying `EventSource` will attempt to reconnect, otherwise the source will be closed immediately after the first error occurs.
	 * @returns
	 */
	setReconnect: (reconnect: boolean) => ServerSentEventSource
}

export { source, event }
