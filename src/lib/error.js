/**
 * @param {string|Error|unknown} value
 * @returns {import("./types").Unsafe<void>}
 */
export function error(value) {
  if (value instanceof Error) {
    // @ts-ignore
    return { value: null, error: value }
  }
  // @ts-ignore
  return { value: null, error: new Error(`${value}`) }
}
