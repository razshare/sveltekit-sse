/**
 * @param {number} milliseconds
 * @returns
 */
export function delay(milliseconds) {
  return new Promise(function run(resolve) {
    setTimeout(resolve, milliseconds)
  })
}
