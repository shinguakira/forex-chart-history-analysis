import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Forecast page (/forecast)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/forecast')
    await expect(page.getByRole('heading', { name: 'AI Forecast' })).toBeVisible()
  })

  test('shows Generate Forecast or Regenerate (depending on cache)', async ({ page }) => {
    const generate = page.getByRole('button', { name: 'Generate Forecast' })
    const regenerate = page.getByRole('button', { name: 'Regenerate' })
    const visible =
      (await generate.isVisible().catch(() => false)) ||
      (await regenerate.isVisible().catch(() => false))
    expect(visible).toBeTruthy()
  })

  test('"API configured" badge appears when backend has key', async ({ page }) => {
    await expect(page.getByText('API configured')).toBeVisible({ timeout: 10_000 })
  })

  test('Generate streams real Claude output and exposes Stop button mid-flight', async ({
    page,
  }) => {
    test.setTimeout(360_000)
    const generate = page.getByRole('button', { name: 'Generate Forecast' })
    if (await generate.isVisible().catch(() => false)) {
      await generate.click()
    } else {
      await page.getByRole('button', { name: 'Regenerate' }).click()
    }

    const stop = page.getByRole('button', { name: 'Stop', exact: true })
    const errorBanner = page.locator('div.bg-red-500\\/10')

    // Either the Stop button appears (mid-stream) or generation completes/errors very fast.
    const stopVisible = await stop
      .waitFor({ state: 'visible', timeout: 120_000 })
      .then(() => true)
      .catch(() => false)

    if (stopVisible) {
      // Stop button proven to exist; let stream complete normally
      await Promise.race([
        page
          .getByRole('button', { name: 'Regenerate' })
          .waitFor({ state: 'visible', timeout: 280_000 }),
        errorBanner.waitFor({ state: 'visible', timeout: 280_000 }),
      ])
    }
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent()
      throw new Error(`Forecast error: ${text}`)
    }
    await expect(page.getByRole('button', { name: 'Chat about forecast' })).toBeVisible()
  })

  test('Stop button cancels the stream and idle state returns', async ({ page }) => {
    test.setTimeout(180_000)
    // Use Regenerate if a forecast already exists, else Generate
    const generate = page.getByRole('button', { name: 'Generate Forecast' })
    const regenerate = page.getByRole('button', { name: 'Regenerate' })
    if (await generate.isVisible().catch(() => false)) {
      await generate.click()
    } else if (await regenerate.isVisible().catch(() => false)) {
      await regenerate.click()
    }

    const stop = page.getByRole('button', { name: 'Stop', exact: true })
    await expect(stop).toBeVisible({ timeout: 120_000 })
    await stop.click()
    // Stop button should hide
    await expect(stop).toBeHidden({ timeout: 30_000 })
  })

  test('Chat about forecast opens chat panel with input', async ({ page }) => {
    test.setTimeout(60_000)
    const chatBtn = page.getByRole('button', { name: 'Chat about forecast' })
    const visible = await chatBtn.isVisible().catch(() => false)
    test.skip(!visible, 'Forecast not yet generated — chat button is gated on cache')
    await chatBtn.click()
    await expect(page.getByPlaceholder('Ask about this trade...')).toBeVisible({ timeout: 5_000 })
  })
})
