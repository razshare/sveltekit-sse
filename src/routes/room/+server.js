import { events } from '$lib'
import { room, lobbyView, updateStore } from './mock-db.server'

export async function POST({ request }) {
  /** @type {string} */
  let id

  if (request.body) {
    id = (await request.json()).id
  }

  return events({
    request,
    start({ emit, lock }) {
      const unsubRoom = room.subscribe(function notify(value) {
        const { error } = emit('usersInRoom', JSON.stringify(value))
        if (error) {
          console.error(error)
          lock.set(false)
        }
      })

      const unsubLobby = lobbyView.subscribe(function notify(value) {
        const { error } = emit('usersInLobby', JSON.stringify(value))
        if (error) {
          console.error(error)
          lock.set(false)
        }
      })

      updateStore(room, { id })

      return function cancel() {
        unsubRoom()
        unsubLobby()
        room.update(function leave(participants) {
          return participants.filter(function notMe(participants) {
            return participants.id !== id
          })
        })
      }
    },
  })
}
