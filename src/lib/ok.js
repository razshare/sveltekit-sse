/**
 * @template [T=void]
 * @param {T} [value]
 * @returns {import("./types").Unsafe<T>}
 */
export function ok(value) {
  // @ts-ignore
  return { value, error: false }
}
