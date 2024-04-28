/**
 * @typedef BeaconPayload
 * @property {Request} request
 */

/**
 * Check if a request is a sveltekit-sse beacon request.
 * @param {BeaconPayload} payload
 * @returns {false|string} The beacon's _x-sse-id_ if the request is a beacon, `false` otherwise.\
 * Empty _x-sse-id_ values are treated as invalid, thus this function will always return `false` when an empty _x-sse-id_ is detected.
 */
export function beacon({ request }) {
  const search = request.url.split('?')[1] ?? ''

  if (search.length > 0) {
    const params = new URLSearchParams(search)
    if (params.has('x-sse-id')) {
      const id = params.get('x-sse-id') ?? ''
      if ('' === id) {
        return false
      }
      return id
    }
  }

  return false
}
