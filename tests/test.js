import { delay } from '$lib/delay'
import { getPlaywrightState } from '$lib/playwright/getPlaywrightState'
import { expect, test } from '@playwright/test'

test('Reading at least 3 cat quotes from `/events` stream.', async function run({
  page,
}) {
  await page.goto('/')
  await delay(3500)
  const { counter } = await getPlaywrightState({ page })
  expect(counter).toBeGreaterThanOrEqual(3)

  // Testing issue 43 https://github.com/razshare/sveltekit-sse/issues/43
  await page.goto('/issue-43')
  await delay(3500)
  const { issue43 } = await getPlaywrightState({ page })
  expect(issue43.connections).toEqual(3)
  expect(issue43.disconnections).toEqual(3)
})

test('Making sure connect() and close() work properly.', async function run({
  page,
}) {
  // Testing issue 43 https://github.com/razshare/sveltekit-sse/issues/43
  await page.goto('/issue-43')
  await delay(3500)
  const { issue43 } = await getPlaywrightState({ page })
  expect(issue43.connections).toEqual(3)
  expect(issue43.disconnections).toEqual(3)
})
