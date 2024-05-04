import { delay } from '$lib/delay'
import { getPlaywrightState } from '$lib/playwright/getPlaywrightState'
import { expect, test } from '@playwright/test'

test('reading at least 3 cat quotes from `/events` stream.', async function run({
  page,
}) {
  await page.goto('/')
  await delay(3500)
  const { counter } = await getPlaywrightState({ page })
  expect(counter).toBeGreaterThanOrEqual(3)
})
