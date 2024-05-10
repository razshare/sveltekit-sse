/**
 *
 * @param {{page:import('@playwright/test').Page}} payload
 * @returns {Promise<import('$lib/playwright/playwright').PlaywrightState>}
 */
export function getPlaywrightState({ page }) {
  return page.evaluate(async function start() {
    // @ts-ignore
    return document.playwrightState
  })
}
