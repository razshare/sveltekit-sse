import { catName } from './cat-name'
import { orPrevious, reconnectingSource } from './sse-utils'

export async function load() {
  const id = catName()

  const connection = reconnectingSource(`/room`, {
    options: { body: JSON.stringify({ id }) },
  })

  /** @type {import('svelte/store').Readable<import('./mock-db.server').User[] | null>} */
  const usersInRoom = connection.select('usersInRoom').json(orPrevious)

  /** @type {import('svelte/store').Readable<import('./mock-db.server').User[] | null>} */
  const usersInLobby = connection.select('usersInLobby').json(orPrevious)

  return {
    id,
    usersInRoom,
    usersInLobby,
  }
}
