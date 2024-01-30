import { events } from '$lib/events.js'

/**
 * @typedef Quote
 * @property {string} id
 * @property {string} value
 */

/**
 * @type {Array<string>}
 */
const CAT_QUOTES = [
  '"Cats are connoisseurs of comfort." - James Herriot',
  '"Just watching my cats can make me happy." - Paula Cole',
  '"I\'m not sure why I like cats so much. I mean, they\'re really cute obviously. They are both wild and domestic at the same time." - Michael Showalter',
  '"You can not look at a sleeping cat and feel tense." - Jane Pauley',
  '"The phrase \'domestic cat\' is an oxymoron." - George Will',
  '"One cat just leads to another." - Ernest Hemingway',
]

/**
 *
 * @returns {Quote}
 */
function findCatQuote() {
  const index = Math.floor(Math.random() * CAT_QUOTES.length)
  const quote = CAT_QUOTES[index]
  return { id: `item-${index}`, value: quote }
}

/**
 * @param {number} milliseconds
 * @returns
 */
function delay(milliseconds) {
  return new Promise(function run(resolve) {
    setTimeout(resolve, milliseconds)
  })
}

/**
 * Send some data to the client
 * @param {import('$lib/events.js').Connection} payload
 */
async function dumpData({ emit, lock }) {
  for (let i = 0; i < 10; i++) {
    const catQuote = findCatQuote()
    const stringifiedCatQuote = JSON.stringify(catQuote)
    const { error } = emit('cat-quote', stringifiedCatQuote)
    if (error) {
      console.error(error.message)
      return
    }
    await delay(1000)
  }
  lock.set(false) // release the lock
}

export function POST({ request }) {
  return events({
    request,
    timeout: 3000,
    start(connection) {
      dumpData(connection)
    },
    cancel() {},
  })
}
