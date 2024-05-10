import { browser } from '$app/environment'

let cat = ''

/**
 * Retrieves an existing cat name from session storage, or generate a new one
 * whenever a new tab is opened.
 */
export function catName() {
  if (cat || !browser) return cat

  cat = sessionStorage.getItem('catname') || ''
  sessionStorage.tabsopened++ // keep track of tab count to avoid duplicate names

  if (!cat || sessionStorage.tabsopened >= 1) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const name = names[Math.floor(Math.random() * names.length)]
    cat = `${adjective} ${name}`
    sessionStorage.setItem('catname', cat)
    sessionStorage.setItem('tabsopened', '0')
  }

  return cat
}

if (browser) {
  // decrement tab count, so name is persisted on refresh
  window.addEventListener('beforeunload', function countUnloads() {
    sessionStorage.tabsopened--
  })
}

const adjectives = [
  'Sleek',
  'Elegant',
  'Graceful',
  'Majestic',
  'Agile',
  'Cuddly',
  'Curious',
  'Playful',
  'Independent',
  'Affectionate',
  'Gentle',
  'Mysterious',
  'Adorable',
  'Regal',
  'Sociable',
  'Furry',
  'Mellow',
  'Charming',
  'Mischievous',
  'Sphinxlike',
  'Lithe',
  'Fluffy',
  'Agile',
  'Alert',
  'Quick',
  'Proud',
  'Inquisitive',
  'Agile',
  'Energetic',
  'Nimble',
  'Vivacious',
  'Clever',
  'Noble',
  'Sophisticated',
  'Soft',
  'Agreeable',
  'Feline',
  'Sassy',
  'Spry',
  'Stealthy',
  'Sly',
  'Whiskered',
  'Sly',
  'Quiet',
  'Sharp-eyed',
  'Fuzzy',
  'Slender',
  'Lithe',
]

const names = [
  'Whiskers',
  'Mittens',
  'Shadow',
  'Luna',
  'Simba',
  'Tigger',
  'Felix',
  'Cleo',
  'Smokey',
  'Oreo',
  'Gizmo',
  'Milo',
  'Bella',
  'Leo',
  'Oliver',
  'Loki',
  'Charlie',
  'Chloe',
  'Max',
  'Lucy',
  'Salem',
  'Nala',
  'Jasper',
  'Coco',
  'Misty',
  'Socks',
  'Toby',
  'Princess',
  'Garfield',
  'Pumpkin',
  'Shadow',
  'Ziggy',
  'Sapphire',
  'Marbles',
  'Muffin',
  'Peanut',
  'Tinkerbell',
  'Midnight',
  'Cinnamon',
  'Socks',
  'Snuggles',
  'Fluffy',
  'Angel',
  'Ginger',
  'Fuzzy',
  'Boots',
  'Socks',
  'Snowball',
]
