import { IS_BROWSER } from '../constants'

/**
 * @typedef Issue43
 * @property {number} connections
 * @property {number} disconnections
 */

/**
 * @typedef Issue48
 * @property {Array<string>} messages
 * @property {number} connected
 */

/**
 * @typedef PlaywrightState
 * @property {number} counter
 * @property {Issue43} issue43
 * @property {Issue48} issue48
 */

/** @type {PlaywrightState} */
let state = {
  counter: 0,
  issue43: {
    connections: 0,
    disconnections: 0,
  },
  issue48: {
    messages: [],
    connected: 0,
  },
}

if (IS_BROWSER) {
  // @ts-ignore
  document.playwrightState = state
}

export const playwright = {
  get state() {
    return state
  },
  set state(value) {
    state = value
    if (IS_BROWSER) {
      // @ts-ignore
      document.playwrightState = state
    }
  },
}
