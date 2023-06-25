import { source } from './source'
import { event } from './event'
import type { Subscriber, Invalidator, Unsubscriber } from 'svelte/store'

export type Producer = (emit: (data: string) => void, ping: () => void) => void | Promise<void>

export type ServerSentEventSource = {
	subscribe: (subscriber: Subscriber<string>, invalidate?: Invalidator<string>) => Unsubscriber
	onError: (callback: (event: MessageEvent) => void | Promise<void>) => ServerSentEventSource
}

export { source, event }
