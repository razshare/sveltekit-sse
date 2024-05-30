import { produceSSE } from './sse'

export function POST() {
  return produceSSE(['event0', 'event1'])
}
