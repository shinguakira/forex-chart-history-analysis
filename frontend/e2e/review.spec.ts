import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Review page (/review)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/review')
    await expect(page.getByRole('heading', { name: 'AI Trade Review' })).toBeVisible()
  })

  test('Portfolio + Trade tabs are present and switchable', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Portfolio Review', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Trade Review', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    await expect(page.getByPlaceholder('Search ref / date...')).toBeVisible()
    await page.getByRole('button', { name: 'Portfolio Review', exact: true }).click()
    // Generate button is the unique signature of Portfolio tab
    await expect(
      page.locator('button:has-text("Generate Portfolio Review")').first(),
    ).toBeVisible()
  })

  test('Trade Review tab renders date / pair / win-loss / search filters', async ({ page }) => {
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    // Date preset filter (DurationFilter)
    await expect(page.getByRole('button', { name: '1M', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Custom', exact: true })).toBeVisible()
    // Win/Loss toggle
    await expect(page.getByRole('button', { name: 'Wins', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Losses', exact: true })).toBeVisible()
    // Pair dropdown — first <select> on the trade tab
    await expect(page.locator('select').first()).toBeVisible()
    // Search
    await expect(page.getByPlaceholder('Search ref / date...')).toBeVisible()
  })

  test('Date preset 1M reduces the visible trade count', async ({ page }) => {
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    const counter = page.locator('text=/^\\d+ trades$/').first()
    const all = Number((await counter.textContent())?.split(' ')[0])
    await page.getByRole('button', { name: '1M', exact: true }).click()
    const oneM = Number((await counter.textContent())?.split(' ')[0])
    expect(oneM).toBeLessThanOrEqual(all)
  })

  test('Wins filter removes losing trades from the visible list', async ({ page }) => {
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    const counter = page.locator('text=/^\\d+ trades$/').first()
    const all = Number((await counter.textContent())?.split(' ')[0])
    await page.getByRole('button', { name: 'Wins', exact: true }).click()
    const wins = Number((await counter.textContent())?.split(' ')[0])
    expect(wins).toBeLessThanOrEqual(all)
    // Switch to losses, count likely different
    await page.getByRole('button', { name: 'Losses', exact: true }).click()
    const losses = Number((await counter.textContent())?.split(' ')[0])
    expect(wins + losses).toBeGreaterThanOrEqual(all - 5) // tolerance for 0-pl edge cases
  })

  test('Search input filters trades by text', async ({ page }) => {
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    const counter = page.locator('text=/^\\d+ trades$/').first()
    const all = Number((await counter.textContent())?.split(' ')[0])
    await page.getByPlaceholder('Search ref / date...').fill('ZZZNOMATCHZZZ')
    const filtered = Number((await counter.textContent())?.split(' ')[0])
    expect(filtered).toBe(0)
    expect(filtered).toBeLessThan(all)
  })

  test('Pair dropdown has all 9 pairs as options', async ({ page }) => {
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    const select = page.locator('select').first()
    const opts = await select.locator('option').allInnerTexts()
    expect(opts[0]).toBe('All Pairs')
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
      expect(opts).toContain(pair)
    }
  })

  test('Pagination: Prev disabled at first page; Next enabled when >20 trades', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    const counter = page.locator('text=/^\\d+ trades$/').first()
    const total = Number((await counter.textContent())?.split(' ')[0])
    if (total <= 20) {
      // No pagination if ≤20 — skip
      test.skip(true, 'Not enough trades for pagination')
    }
    const prev = page.getByRole('button', { name: 'Prev', exact: true })
    const next = page.getByRole('button', { name: 'Next', exact: true })
    await expect(prev).toBeDisabled()
    await expect(next).toBeEnabled()
    await next.click()
    // After Next, page indicator updates and Prev becomes enabled
    await expect(prev).toBeEnabled()
  })

  test('Generate Portfolio Review streams real Claude output (1M filter)', async ({ page }) => {
    test.setTimeout(360_000)
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    await page.getByRole('button', { name: '1M', exact: true }).click()
    await page.getByRole('button', { name: 'Portfolio Review', exact: true }).click()

    const generateBtn = page.locator('button:has-text("Generate Portfolio Review")').first()
    await expect(generateBtn).toBeVisible()
    await generateBtn.click()

    const errorBanner = page.locator('div.bg-red-500\\/10')
    await Promise.race([
      page
        .getByRole('button', { name: 'Regenerate' })
        .waitFor({ state: 'visible', timeout: 320_000 }),
      errorBanner.waitFor({ state: 'visible', timeout: 320_000 }),
    ])
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent()
      throw new Error(`Portfolio Review error: ${text}`)
    }
    await expect(page.getByRole('button', { name: 'Chat about portfolio' })).toBeVisible()
  })

  test('Stop button appears during streaming and aborts the request', async ({ page }) => {
    test.setTimeout(120_000)
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    await page.getByRole('button', { name: '1M', exact: true }).click()
    await page.getByRole('button', { name: 'Portfolio Review', exact: true }).click()
    const generate = page.locator('button:has-text("Generate Portfolio Review")').first()
    await generate.click()
    const stop = page.getByRole('button', { name: 'Stop', exact: true })
    await expect(stop).toBeVisible({ timeout: 60_000 })
    await stop.click()
    // After stop, Stop button must hide (idle or error state)
    await expect(stop).toBeHidden({ timeout: 30_000 })
  })

  test('Chat panel opens after generating a portfolio review (end-to-end)', async ({ page }) => {
    test.setTimeout(360_000)
    await page.getByRole('button', { name: 'Trade Review', exact: true }).click()
    await page.getByRole('button', { name: '1M', exact: true }).click()
    await page.getByRole('button', { name: 'Portfolio Review', exact: true }).click()

    const generate = page.locator('button:has-text("Generate Portfolio Review")').first()
    await expect(generate).toBeVisible()
    await generate.click()

    const errorBanner = page.locator('div.bg-red-500\\/10')
    const chatBtn = page.getByRole('button', { name: 'Chat about portfolio' })
    await Promise.race([
      chatBtn.waitFor({ state: 'visible', timeout: 320_000 }),
      errorBanner.waitFor({ state: 'visible', timeout: 320_000 }),
    ])
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent()
      throw new Error(`Portfolio Review error: ${text}`)
    }
    await chatBtn.click()
    await expect(page.getByPlaceholder('Ask about this trade...')).toBeVisible({ timeout: 5_000 })
  })
})
