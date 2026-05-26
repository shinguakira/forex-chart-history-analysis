import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

const ALL_PAIRS = [
  'USD/JPY',
  'EUR/USD',
  'EUR/JPY',
  'USD/CAD',
  'CAD/JPY',
  'AUD/USD',
  'AUD/JPY',
  'NZD/USD',
  'NZD/JPY',
]

test.describe('Chart page (/) — sidebar pair list', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/')
    await expect(page.getByText('Currency Pairs')).toBeVisible()
  })

  test('sidebar lists all 9 configured pairs', async ({ page }) => {
    for (const pair of ALL_PAIRS) {
      await expect(
        page.locator('aside').getByRole('button', { name: pair, exact: true }).first(),
      ).toBeVisible()
    }
  })

  test('default canvas shows the empty placeholder', async ({ page }) => {
    await expect(page.getByText('Select a currency pair to open a chart')).toBeVisible()
  })

  test('clicking a pair shows the "open" suffix on its sidebar item', async ({ page }) => {
    const usd = page.locator('aside').getByRole('button').filter({ hasText: 'USD/JPY' }).first()
    await usd.click()
    await expect(usd.locator('text=open').first()).toBeVisible()
  })

  test('clicking a pair already open just focuses (does not duplicate)', async ({ page }) => {
    await page.locator('aside').getByText('USD/JPY', { exact: true }).first().click()
    await expect(page.locator('[data-window]')).toHaveCount(1)
    // Click again — same pair, should not add a 2nd window
    await page.locator('aside').getByText('USD/JPY', { exact: true }).first().click()
    await expect(page.locator('[data-window]')).toHaveCount(1)
  })

  test('opening multiple distinct pairs creates multiple windows', async ({ page }) => {
    await page.locator('aside').getByText('USD/JPY', { exact: true }).first().click()
    await page.locator('aside').getByText('EUR/USD', { exact: true }).first().click()
    await page.locator('aside').getByText('EUR/JPY', { exact: true }).first().click()
    await expect(page.locator('[data-window]')).toHaveCount(3)
  })
})

test.describe('Chart page (/) — chart window', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/')
    await page.locator('aside').getByText('USD/JPY', { exact: true }).first().click()
    await expect(page.locator('[data-window]').first()).toBeVisible()
  })

  test('window title bar shows pair name', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    await expect(win.getByText('USD/JPY', { exact: true }).first()).toBeVisible()
  })

  test('lightweight-charts canvas mounts', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    await expect(win.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  })

  test('all 7 timeframe buttons toggle without crashing the canvas', async ({ page }) => {
    test.setTimeout(120_000)
    const win = page.locator('[data-window]').first()
    for (const tf of ['1m', '5m', '15m', '1H', '4H', '1D', '1W']) {
      await win.getByRole('button', { name: tf, exact: true }).click()
      // Loading or canvas; chart window must still be alive
      await expect(win).toBeVisible()
    }
    // After the loop the chart should still have a canvas
    await expect(win.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  })

  test('Period selector renders only allowed periods for the timeframe', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    // The TF row has justify-between (Row 2 of ChartWindow); period row has gap-2 (Row 3).
    const tfRow = win.locator('div.flex.items-center.justify-between')
    const periodRow = win.locator('div.flex.items-center.gap-2.border-b')

    // Default timeframe is 1m → period selector shows only 1D, 5D
    await tfRow.getByRole('button', { name: '1m', exact: true }).click()
    const allowedFor1m = await periodRow
      .getByRole('button')
      .allInnerTexts()
    // Allowed periods for 1m TF are 1D / 5D, so 1Y / 5Y / 10Y must be absent.
    expect(allowedFor1m).not.toContain('1Y')
    expect(allowedFor1m).not.toContain('5Y')
    expect(allowedFor1m).not.toContain('10Y')
    // The period row should still expose 1D and 5D
    expect(allowedFor1m).toContain('1D')
    expect(allowedFor1m).toContain('5D')

    // Switch to 1D timeframe — broader period options appear
    await tfRow.getByRole('button', { name: '1D', exact: true }).click()
    const allowedForDaily = await periodRow.getByRole('button').allInnerTexts()
    expect(allowedForDaily).toContain('1Y')
    expect(allowedForDaily).toContain('5Y')
  })

  test('selecting a different period highlights it (active emerald state)', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    const tfRow = win.locator('div.flex.items-center.justify-between')
    const periodRow = win.locator('div.flex.items-center.gap-2.border-b')
    await tfRow.getByRole('button', { name: '1D', exact: true }).click()
    const periodBtn = periodRow.getByRole('button', { name: '6M', exact: true })
    await periodBtn.click()
    // Active period uses bg-emerald-600
    await expect(periodBtn).toHaveClass(/bg-emerald-600/)
  })

  test('Indicator dropdown lists all 8 indicators', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    await win.getByRole('button', { name: /^Ind/ }).click()
    await expect(page.getByText('Technical Indicators')).toBeVisible()
    for (const label of [
      'SMA 20',
      'SMA 50',
      'SMA 200',
      'EMA 12',
      'EMA 26',
      'RSI (14)',
      'MACD (12,26,9)',
      'Bollinger Bands (20,2)',
    ]) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
    }
  })

  test('toggling 3 indicators shows the badge count', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    await win.getByRole('button', { name: /^Ind/ }).click()
    await page.getByRole('button', { name: 'SMA 20', exact: true }).click()
    await page.getByRole('button', { name: 'EMA 12', exact: true }).click()
    await page.getByRole('button', { name: 'RSI (14)', exact: true }).click()
    // Close the dropdown (click outside)
    await page.locator('body').click({ position: { x: 10, y: 10 } })
    await expect(win.getByRole('button', { name: /Ind\s*3/ })).toBeVisible()
  })

  test('toggling an indicator twice removes it from the count', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    await win.getByRole('button', { name: /^Ind/ }).click()
    await page.getByRole('button', { name: 'SMA 20', exact: true }).click()
    await page.getByRole('button', { name: 'SMA 20', exact: true }).click() // toggle off
    await page.locator('body').click({ position: { x: 10, y: 10 } })
    // Badge should not show a "1" — just "Ind"
    await expect(win.getByRole('button', { name: /^Ind$/ })).toBeVisible()
  })

  test('Trade overlay toggle activates yellow style', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    const tradesBtn = win.getByRole('button', { name: 'Trades', exact: true })
    await tradesBtn.click()
    await expect(tradesBtn).toHaveClass(/bg-yellow-600/)
    // Toggle off
    await tradesBtn.click()
    await expect(tradesBtn).not.toHaveClass(/bg-yellow-600/)
  })

  test('Go-to-date input accepts a date and Latest button restores live mode', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    const tfRow = win.locator('div.flex.items-center.justify-between')
    // Switch to 1D so Yahoo can satisfy the request
    await tfRow.getByRole('button', { name: '1D', exact: true }).click()
    const dateInput = win.locator('input[type="datetime-local"]')
    await dateInput.fill('2024-06-01T09:00')
    await win.getByRole('button', { name: 'Go', exact: true }).click()
    await expect(win.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
    await win.getByRole('button', { name: 'Latest', exact: true }).click()
    await expect(win.locator('canvas').first()).toBeVisible()
  })

  test('Go-to-date Enter key submits same as Go button', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    const tfRow = win.locator('div.flex.items-center.justify-between')
    await tfRow.getByRole('button', { name: '1D', exact: true }).click()
    const dateInput = win.locator('input[type="datetime-local"]')
    await dateInput.fill('2024-03-15T09:00')
    await dateInput.press('Enter')
    await expect(win.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  })

  test('Close (✕) button in title bar closes the window', async ({ page }) => {
    const win = page.locator('[data-window]').first()
    // The first button inside the title bar is the close button (svg ✕)
    await win.locator('button').first().click()
    await expect(page.getByText('Select a currency pair to open a chart')).toBeVisible()
  })
})

test.describe('Chart page (/) — sidebar trade panel', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/')
  })

  test('Trades header shows count and ¥ total', async ({ page }) => {
    await expect(page.locator('text=/^Trades \\(\\d+\\)$/').first()).toBeVisible({
      timeout: 15_000,
    })
    // The ¥ total spans is also in the header button
    await expect(page.locator('aside').locator('span', { hasText: /¥/ }).first()).toBeVisible()
  })

  test('Clicking the Trades header expands the list with All/Long/Short filters', async ({
    page,
  }) => {
    const tradesHeader = page.locator('aside').getByRole('button').filter({
      hasText: /^Trades \(\d+\)/,
    })
    await tradesHeader.click()
    // Filter buttons appear inside the sidebar
    await expect(
      page.locator('aside').getByRole('button', { name: 'All', exact: true }),
    ).toBeVisible()
    await expect(
      page.locator('aside').getByRole('button', { name: 'Long', exact: true }),
    ).toBeVisible()
    await expect(
      page.locator('aside').getByRole('button', { name: 'Short', exact: true }),
    ).toBeVisible()
  })

  test('Long filter limits trades to bull direction (no S badge visible)', async ({ page }) => {
    await page
      .locator('aside')
      .getByRole('button')
      .filter({ hasText: /^Trades \(\d+\)/ })
      .click()
    await page.locator('aside').getByRole('button', { name: 'Long', exact: true }).click()
    // The L/S badge inside trade rows; with Long filter, there should be no S
    const sBadges = page.locator('aside').locator('span.bg-red-900', { hasText: /^S$/ })
    expect(await sBadges.count()).toBe(0)
  })

  test('clicking a trade row opens that pair window', async ({ page }) => {
    await page
      .locator('aside')
      .getByRole('button')
      .filter({ hasText: /^Trades \(\d+\)/ })
      .click()
    // Click first trade row (any pair)
    const firstRow = page
      .locator('aside')
      .locator('div.cursor-pointer')
      .first()
    await firstRow.click()
    // A chart window must have appeared
    await expect(page.locator('[data-window]').first()).toBeVisible()
  })
})
