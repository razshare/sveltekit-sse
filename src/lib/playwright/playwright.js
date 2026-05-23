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
 * @property {1|import('$lib/types.external').Source} connection1
 * @property {2|import('$lib/types.external').Source} connection2
 * @property {string} message1
 * @property {string} message2
 */

/**
 * @typedef Issue70
 * @property {number} status
 * @property {import('$lib/types.external').Event[]} onmessage
 */

/**
 * @typedef Issue73
 * @property {number} connections
 * @property {number} disconnections
 * @property {number} abruptDisconnections
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
 * @property {Issue73} issue73
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
    connection1: 1,
    connection2: 2,
    message1: '',
    message2: '',
  },
  issue70: {
    onmessage: [],
    status: -1,
  },
  issue73: {
    connections: 0,
    disconnections: 0,
    abruptDisconnections: 0,
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
