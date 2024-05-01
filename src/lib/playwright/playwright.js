import { IS_BROWSER } from '../constants'

/**
 * @typedef PlaywrightState
 * @property {number} counter
 */

/** @type {PlaywrightState} */
let state = {
  counter: 0,
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
