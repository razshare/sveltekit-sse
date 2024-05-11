import { delay } from '$lib/delay.js'
import { produce } from '$lib/produce.js'

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
 * @type {Array<string>}
 */
const FRASI_GATTO = [
  '"I gatti sono intenditori del comfort." - James Herriot',
  '"Guardare i miei gatti può farmi felice." - Paula Cole',
  '"Non sono sicuro del perché mi piacciano così tanto i gatti. Voglio dire, sono ovviamente molto carini. Sono sia selvatici che domestici allo stesso tempo." - Michael Showalter',
  '"Non puoi guardare un gatto che dorme e sentirti teso." - Jane Pauley',
  '"La frase \'gatto domestico\' è un ossimoro." - George Will',
  '"Un gatto porta ad un altro." - Ernest Hemingway',
]

/** @type {Record<string, string[]> } */
const LANGUAGE_MAP = {
  en: CAT_QUOTES,
  it: FRASI_GATTO,
}

/**
 * @param {string | null} [language]
 * @returns {Quote}
 */
function findCatQuote(language) {
  language = language || 'en'
  const quotes = LANGUAGE_MAP[language] || CAT_QUOTES
  const index = Math.floor(Math.random() * quotes.length)
  return { id: `item-${index}-${language}`, value: quotes[index] }
}

/**
 * Send some data to the client
 * @param {string} lang
 * @param {import('$lib/types.js').Connection} payload
 */
async function dumpData(lang, { emit, lock }) {
  for (let i = 0; i < 10; i++) {
    const catQuote = findCatQuote(lang)
    const stringifiedCatQuote = JSON.stringify(catQuote)

    const { error } = emit('cat-quote', i === 9 ? 'qw___' : stringifiedCatQuote)
    if (error) {
      lock.set(false)
      return function cancel() {
        console.error(error.message)
      }
    }
    await delay(1000)
  }
  lock.set(false)
  return function cancel() {
    console.log('Stream canceled.')
  }
}

export function POST({ url }) {
  return produce(function start(connection) {
    const lang = url.searchParams.get('lang') || 'en'
    return dumpData(lang, connection)
  })
}
