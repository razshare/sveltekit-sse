import { catName } from '../cat-name'
import { orPrevious, reconnectingSource } from '../sse-utils'

export function load() {
  const id = catName()

  const connection = reconnectingSource(`/room/waiting-lobby`, {
    body: JSON.stringify({ id }),
  })

  /** @type {import('svelte/store').Readable<import('../mock-db.server').User | null>} */
  const waitingUser = connection.select('waitingUser').json(orPrevious)

  return { id, waitingUser, connection }
}
