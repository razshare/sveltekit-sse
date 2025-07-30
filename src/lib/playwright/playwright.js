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
 * @typedef Issue55
 * @property {Array<string>} messages
 */

/**
 * @typedef Issue65
 * @property {string} cpu_usage
 * @property {string} memory
 */

/**
 * @typedef Issue68
 * @property {string} name
 */

/**
 * @typedef PullRequest69
 * @property {string} message1
 * @property {string} message2
 */

/**
 * @typedef Issue70
 * @property {number} status
 * @property {import('$lib/types.external').FetchEventSourceMessage[]} onmessage
 */

/**
 * @typedef PlaywrightState
 * @property {number} counter
 * @property {Issue43} issue43
 * @property {Issue48} issue48
 * @property {Issue55} issue55
 * @property {Issue65} issue65
 * @property {Issue68} issue68
 * @property {PullRequest69} pullRequest69
 * @property {Issue70} issue70
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
  issue55: {
    messages: [],
  },
  issue65: {
    cpu_usage: '',
    memory: '',
  },
  issue68: {
    name: '',
  },
  pullRequest69: {
    message1: '',
    message2: '',
  },
  issue70: {
    onmessage: [],
    status: -1,
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
