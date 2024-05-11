import { events } from '$lib'
import {
  findMatchingId,
  lobby,
  removeFromStore,
  updateStore,
} from '../mock-db.server'
import { eventStopper } from '../sse-utils.server'

export async function POST({ route, request }) {
  /** @type {string} */
  let id

  if (request.body) {
    id = (await request.json()).id
  }

  return events({
    request,
    start({ emit, lock }) {
      const stopper = eventStopper(route.id, emit, lock)

      updateStore(lobby, { id, approved: undefined })
      stopper.push(function leaveLobby() {
        removeFromStore(lobby, id)
      })

      const unsub = lobby.subscribe(function notify(guests) {
        const guest = findMatchingId(guests, id)

        if (!guest) {
          // already disconnected
          return lock.set(false)
        }

        const { error } = emit('waitingUser', JSON.stringify(guest))
        if (error) {
          console.error(error)
          lock.set(false)
        } else if (guest.approved === true || guest.approved === false) {
          stopper.stop()
        }
      })
      stopper.push(unsub)

      const { error } = emit('waitingUser', JSON.stringify({ id }))
      if (error) {
        console.error(error)
        lock.set(false)
      }

      return stopper.onStop
    },
  })
}
