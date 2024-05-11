/**
 * Create a random value between `floor` (inclusive) and `ceiling` (inclusive).
 * @param {number} floor The minimum value.
 * @param {number} ceiling The maximum value.
 * @returns
 */
export function createRandomValue(floor, ceiling) {
  return Math.floor(Math.random() * (ceiling - floor + 1) + floor)
}
