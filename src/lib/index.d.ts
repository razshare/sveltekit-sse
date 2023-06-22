import { source } from './source'
import { event } from './event'

export type Producer = (emit: (data: string) => void, ping: () => void) => void | Promise<void>

export { source, event }
