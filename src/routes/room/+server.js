import { produce } from '$lib'
import { room, lobbyView, updateStore, removeFromStore } from './mock-db.server'
import { eventStopper } from './sse-utils.server'

export async function POST({ route, request }) {
  /** @type {string} */
  let id

  if (request.body) {
    id = (await request.json()).id
  }

  return produce(function start({ emit, lock }) {
    const stopper = eventStopper(route.id, emit, lock)

    const unsubRoom = room.subscribe(function notify(value) {
      const { error } = emit('usersInRoom', JSON.stringify(value))
      if (error) {
        console.error(error)
        lock.set(false)
      }
    })
    stopper.push(unsubRoom)

    const unsubLobby = lobbyView.subscribe(function notify(value) {
      const { error } = emit('usersInLobby', JSON.stringify(value))
      if (error) {
        console.error(error)
        lock.set(false)
      }
    })
    stopper.push(unsubLobby)

    updateStore(room, { id })
    stopper.push(function leaveRoom() {
      removeFromStore(room, id)
    })

    return stopper.onStop
  })
}
