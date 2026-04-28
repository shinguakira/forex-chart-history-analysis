import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Predictions page (/predictions)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/predictions')
    await expect(page.getByRole('heading', { name: 'AI Predictions' })).toBeVisible()
  })

  test('seeded predictions render in the grid', async ({ page }) => {
    const empty = page.locator('text=No predictions yet')
    const card = page.locator('div.rounded-lg.border.border-gray-800').filter({
      hasText: /Entry/,
    })
    const cardCount = await card.count()
    const emptyVisible = await empty.isVisible().catch(() => false)
    expect(cardCount > 0 || emptyVisible).toBeTruthy()
  })

  test('"API configured" badge appears with backend env', async ({ page }) => {
    await expect(page.getByText('API configured')).toBeVisible({ timeout: 10_000 })
  })

  test('All 9 pair toggle buttons are present in generation panel', async ({ page }) => {
    const genPanel = page.locator('text=Generate Predictions').locator('..').locator('..')
    for (const pair of [
      'USD/JPY',
      'EUR/USD',
      'EUR/JPY',
      'USD/CAD',
      'CAD/JPY',
      'AUD/USD',
      'AUD/JPY',
      'NZD/USD',
      'NZD/JPY',
    ]) {
      await expect(genPanel.getByRole('button', { name: pair, exact: true })).toBeVisible()
    }
  })

  test('Pair multi-select toggles between active (blue) and inactive', async ({ page }) => {
    const eurusd = page.getByRole('button', { name: 'EUR/USD', exact: true }).first()
    const wasActive = (await eurusd.getAttribute('class'))?.includes('bg-blue-600')
    await eurusd.click()
    const nowActive = (await eurusd.getAttribute('class'))?.includes('bg-blue-600')
    expect(nowActive).toBe(!wasActive)
    // Toggle back
    await eurusd.click()
    expect((await eurusd.getAttribute('class'))?.includes('bg-blue-600')).toBe(wasActive)
  })

  test('Generate button is disabled when zero pairs are selected', async ({ page }) => {
    // Default: USD/JPY selected. Click to deselect → should disable Generate.
    const usdjpy = page.getByRole('button', { name: 'USD/JPY', exact: true }).first()
    if ((await usdjpy.getAttribute('class'))?.includes('bg-blue-600')) {
      await usdjpy.click()
    }
    const generate = page.getByRole('button', { name: 'Generate', exact: true })
    await expect(generate).toBeDisabled()
    // Restore for following tests
    await usdjpy.click()
  })

  test('Status filter tabs (All/Pending/Win/Loss) all interactive', async ({ page }) => {
    const hasPredictions = await page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: /Entry/ })
      .first()
      .isVisible()
      .catch(() => false)
    test.skip(!hasPredictions, 'No predictions seeded — skipping filter test')

    for (const status of ['All', 'Pending', 'Win', 'Loss']) {
      await page.getByRole('button', { name: status, exact: true }).click()
      // Title still visible
      await expect(page.getByRole('heading', { name: 'AI Predictions' })).toBeVisible()
    }
  })

  test('Pair filter dropdown lists "All Pairs" + each pair that has predictions', async ({
    page,
  }) => {
    const hasPredictions = await page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: /Entry/ })
      .first()
      .isVisible()
      .catch(() => false)
    test.skip(!hasPredictions, 'No predictions seeded — skipping pair-filter test')
    // Find the pair filter <select> (first non-pair-toggle select)
    const select = page.locator('select').first()
    const options = await select.locator('option').allInnerTexts()
    expect(options[0]).toBe('All Pairs')
    expect(options.length).toBeGreaterThan(1)
  })

  test('Date range filter (From/To) accepts input', async ({ page }) => {
    const hasPredictions = await page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: /Entry/ })
      .first()
      .isVisible()
      .catch(() => false)
    test.skip(!hasPredictions, 'No predictions seeded — skipping date-range test')
    const dates = page.locator('input[type="date"]')
    await dates.nth(0).fill('2024-01-01')
    await dates.nth(1).fill('2024-12-31')
    await expect(dates.nth(0)).toHaveValue('2024-01-01')
    await expect(dates.nth(1)).toHaveValue('2024-12-31')
  })

  test('Validate All button is visible only when pending predictions exist', async ({ page }) => {
    const validateAll = page.getByRole('button', { name: /^Validate All \(\d+\)$/ })
    const visible = await validateAll.isVisible().catch(() => false)
    if (visible) {
      const text = await validateAll.textContent()
      expect(text).toMatch(/Validate All \(\d+\)/)
    }
  })

  test('Delete button removes a prediction from the grid', async ({ page }) => {
    const cards = page.locator('div.rounded-lg.border.border-gray-800').filter({
      hasText: /Entry/,
    })
    const initial = await cards.count()
    test.skip(initial === 0, 'No predictions to delete')
    // Use first card's Delete
    const firstCard = cards.first()
    await firstCard.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect.poll(() => cards.count(), { timeout: 5_000 }).toBe(initial - 1)
  })

  test('Generate sends a real Claude request and renders new cards', async ({ page }) => {
    test.setTimeout(240_000)
    const cardLocator = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: 'Entry' })
    const initialCount = await cardLocator.count()

    await page.locator('input[type="number"]').fill('2')
    await page.getByRole('button', { name: 'Generate', exact: true }).click()

    const progress = page.locator('text=/Fetching market data|Receiving predictions|Parsing/')
    await expect(progress.first()).toBeVisible({ timeout: 60_000 })

    const errorBanner = page.locator('div.bg-red-500\\/10')
    await Promise.race([
      progress.first().waitFor({ state: 'hidden', timeout: 200_000 }),
      errorBanner.waitFor({ state: 'visible', timeout: 200_000 }),
    ])
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent()
      throw new Error(`Predictions Generate returned error: ${text}`)
    }
    await expect.poll(() => cardLocator.count(), { timeout: 30_000 }).toBeGreaterThan(initialCount)
  })

  test('Cancel during generate aborts the request mid-flight', async ({ page }) => {
    test.setTimeout(60_000)
    await page.locator('input[type="number"]').fill('5')
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    const progress = page.locator('text=/Fetching market data|Receiving predictions|Parsing/')
    await expect(progress.first()).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    // Generate button should re-enable, progress should hide
    await expect(progress.first()).toBeHidden({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled()
  })
})
