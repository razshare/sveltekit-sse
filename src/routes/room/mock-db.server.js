import { derived, writable } from 'svelte/store'

/**
 * @typedef {{ id: string, approved?: boolean }} User
 */

/**
 * Users in the room.
 * @type {import('svelte/store').Writable<{ id: string }[]> }
 */
export const room = writable([])

/**
 * Users in the waiting lobby.
 * @type {import('svelte/store').Writable<{ id: string, approved?: boolean }[]> }
 */
export const lobby = writable([])

/**
 * Derived view of the waiting lobby. Only includes users in the lobby who are
 * waiting for approval.
 */
export const lobbyView = derived(lobby, function view($lobby) {
  const waitingForApproval = []

  for (const user of $lobby) {
    if (user.approved == undefined) {
      waitingForApproval.push(user)
    }
  }

  return waitingForApproval
})

/**
 * @param {User[]} users
 * @param {string} id
 */
export function findMatchingId(users, id) {
  return users.find(function same(user) {
    return user.id === id
  })
}

/**
 * @template {{id: string}} T
 * @param {import('svelte/store').Writable<T[]>} store
 * @param {T} update
 */
export function updateStore(store, update) {
  store.update(function upsert(objects) {
    const object = findMatchingId(objects, update.id)
    if (object) {
      Object.assign(object, update)
    } else {
      objects.push(update)
    }
    return objects
  })
}

/**
 * @template {{id: string}} T
 * @param {import('svelte/store').Writable<T[]>} store
 * @param {string} id
 */
export function removeFromStore(store, id) {
  store.update(function removeFrom(objects) {
    return objects.filter(function exceptWithId(object) {
      return object.id !== id
    })
  })
}
