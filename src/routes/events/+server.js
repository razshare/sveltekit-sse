import { events } from '$lib/events.js'
import { get, writable } from 'svelte/store'

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
 * @returns {Array<Quote>}
 */
function findAThousandCatQuotes() {
  return Array(1000)
    .fill(0)
    .map(function pass(_, index) {
      const key = Math.floor(Math.random() * CAT_QUOTES.length)
      const quote = CAT_QUOTES[key]
      return { id: `item-${index}`, value: quote }
    })
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
 * @param {{emit:import('$lib/types').EmitterOfManyEvents}} payload
 */
async function dumpData({ emit }) {
  for (let i = 0; i < 10; i++) {
    console.log('fake emitting...')
    const catQuotes = findAThousandCatQuotes()
    const stringifiedCatQuote = JSON.stringify(catQuotes)
    try {
      emit('thousands-of-cat-quotes', stringifiedCatQuote)
    } catch {
      return
    }
    await delay(1000)
  }
}

export function POST({ request }) {
  const locked = writable(true)
  locked.subscribe(function run() {
    console.log('locked', get(locked))
  })

  events({
    start({ emit }) {
      emit('asd', 'asd')
    },
    cancel() {},
  })

  return events(async function run(emit) {
    await new Promise(function start(stop) {
      dumpData({ emit }).then(stop)
    })
  })
    .expectBeacon(3000)
    .toResponse(request)
}
