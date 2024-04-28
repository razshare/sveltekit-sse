/**
 * @typedef BeaconPayload
 * @property {Request} request
 */

/**
 * Try to resolve the request into an sse stream beacon.\
 * If the request is indeed a beacon, get the stream's identifier.
 * @param {BeaconPayload} payload
 * @returns {false|string} The stream's identifier if the request is a beacon, `false` otherwise.\
 * The stream identifier is obtained from the request's `x-sse-id` query.\
 * Empty identifiers are not valid, thus this function will always return `false` when an empty identifiers is detected.
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
