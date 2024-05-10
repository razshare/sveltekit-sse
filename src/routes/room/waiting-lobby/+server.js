import { events } from '$lib'
import { findMatchingId, lobby, updateStore } from '../mock-db.server'

export async function POST({ request }) {
  /** @type {string} */
  let id

  if (request.body) {
    id = (await request.json()).id
  }

  return events({
    request,
    start({ emit, lock }) {
      updateStore(lobby, { id, approved: undefined })

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
          lock.set(false)
        }
      })

      const { error } = emit('waitingUser', JSON.stringify({ id }))
      if (error) {
        console.error(error)
        lock.set(false)
      }

      return function cancel() {
        unsub()
        lobby.update(function leave(guests) {
          return guests.filter(function notMe(guest) {
            return guest.id !== id
          })
        })
      }
    },
  })
}
