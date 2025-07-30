import { delay } from '$lib/delay'
import { getPlaywrightState } from '$lib/playwright/getPlaywrightState'
import { expect, test } from '@playwright/test'

test('Reading at least 3 cat quotes from `/events` stream.', async function run({
  page,
}) {
  await page.goto('/')
  await delay(5000)
  const { counter } = await getPlaywrightState({ page })
  expect(counter).toBeGreaterThanOrEqual(3)

  // Testing issue 43 https://github.com/razshare/sveltekit-sse/issues/43
  await page.goto('/issue-43')
  await delay(5000)
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

test('Making sure internal readable store is cached between subscribes when pointing to the same source.', async function run({
  page,
}) {
  // Testing issue 48 https://github.com/razshare/sveltekit-sse/issues/48
  await page.goto('/issue-48')
  await delay(3500)
  const { issue48 } = await getPlaywrightState({ page })
  console.log(issue48)
  expect(issue48.connected).toBe(2)
  expect(issue48.messages.length).toBe(7)
  expect(issue48.messages[0]).toBe('')
  expect(issue48.messages[1]).toBe('')
  expect(issue48.messages[2]).toBe('')
  let time = issue48.messages[3]
  expect(time).toBeTruthy()
})

test('Making sure GET producers and GET sources work properly.', async function run({
  page,
}) {
  // Testing issue 55 https://github.com/razshare/sveltekit-sse/issues/55
  await page.goto('/issue-55')
  await delay(3500)
  const { issue55 } = await getPlaywrightState({ page })
  expect(issue55.messages.length).toBeGreaterThanOrEqual(3)
})

test('Making sure http headers work properly.', async function run({ page }) {
  // Testing changes made in response to issue 68 https://github.com/razshare/sveltekit-sse/issues/68
  await page.goto('/issue-68')
  await delay(2000)
  const { issue68 } = await getPlaywrightState({ page })
  expect(issue68.name).toContain('Hello World, the time is ')
})

test('Making sure connection gets cached using non Latin1 characters.', async function run({
  page,
}) {
  // Testing changes made in PR 69 https://github.com/razshare/sveltekit-sse/pull/69
  await page.goto('/pr-69')
  await delay(1000)
  const { pullRequest69 } = await getPlaywrightState({ page })
  expect(pullRequest69.message1).toBe(pullRequest69.message2)
  expect(pullRequest69.message1).toContain('hello 猫')
})

test('Making sure onmessage event is triggered on the source object.', async function run({
  page,
}) {
  // Testing changes made in response to issue 70 https://github.com/razshare/sveltekit-sse/issues/70
  await page.goto('/issue-70')
  await delay(1000)
  const { issue70 } = await getPlaywrightState({ page })
  expect(issue70.status).toBe(200)
  expect(issue70.onmessage.length).toBeGreaterThan(0)
  expect(issue70.onmessage[0].event).toBe('message')
  expect(issue70.onmessage[0].id).toBe('1')
})
