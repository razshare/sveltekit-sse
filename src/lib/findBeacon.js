/**
 * @typedef BeaconPayload
 * @property {Request} request
 */

/**
 * Find an sse stream beacon from a request.
 * @param {BeaconPayload} payload
 * @returns {false|import("./types").Beacon} The beacon.
 */
export function findBeacon({ request }) {
  const search = request.url.split('?')[1] ?? ''

  if (search.length > 0) {
    const params = new URLSearchParams(search)
    if (params.has('x-sse-id')) {
      const xSseId = params.get('x-sse-id') ?? ''
      if ('' === xSseId) {
        return false
      }
      return { xSseId }
    }
  }

  return false
}
