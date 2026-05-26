import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Backtest page (/backtest)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/backtest')
    await expect(page.getByRole('heading', { name: 'Backtest' })).toBeVisible()
  })

  test('config panel + From/To/Interval defaults render', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Run Backtest', exact: true })).toBeVisible()
    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(2)
    await expect(page.locator('select').filter({ hasText: /Every/ })).toBeVisible()
  })

  test('All 9 pair toggle buttons are present', async ({ page }) => {
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
      await expect(page.getByRole('button', { name: pair, exact: true })).toBeVisible()
    }
  })

  test('Pair multi-select toggles between active/inactive', async ({ page }) => {
    const eurusd = page.getByRole('button', { name: 'EUR/USD', exact: true }).first()
    const wasActive = (await eurusd.getAttribute('class'))?.includes('bg-blue-600')
    await eurusd.click()
    expect((await eurusd.getAttribute('class'))?.includes('bg-blue-600')).toBe(!wasActive)
  })

  test('Run Backtest disabled when no pair selected', async ({ page }) => {
    // Default USD/JPY is on; deselect
    const usdjpy = page.getByRole('button', { name: 'USD/JPY', exact: true }).first()
    if ((await usdjpy.getAttribute('class'))?.includes('bg-blue-600')) {
      await usdjpy.click()
    }
    await expect(page.getByRole('button', { name: 'Run Backtest', exact: true })).toBeDisabled()
    // Restore
    await usdjpy.click()
  })

  test('Aggregate stats card renders (from seeded backtests) or empty state', async ({ page }) => {
    const aggregate = page.locator('text=Aggregate (')
    const empty = page.locator('text=No backtest runs yet')
    const aggOk = await aggregate.first().isVisible().catch(() => false)
    const emptyOk = await empty.first().isVisible().catch(() => false)
    expect(aggOk || emptyOk).toBeTruthy()
  })

  test('Estimated cutoff count updates with interval change', async ({ page }) => {
    const intervalSelect = page.locator('select').filter({ hasText: /Every/ })
    await intervalSelect.selectOption('1') // every day
    await expect(page.locator('text=/\\d+ cutoff points/').first()).toBeVisible()
    await intervalSelect.selectOption('30') // every month
    await expect(page.locator('text=/\\d+ cutoff points/').first()).toBeVisible()
  })

  test('All 5 interval options are selectable', async ({ page }) => {
    const intervalSelect = page.locator('select').filter({ hasText: /Every/ })
    for (const v of ['1', '3', '7', '14', '30']) {
      await intervalSelect.selectOption(v)
      await expect(intervalSelect).toHaveValue(v)
    }
  })

  test('Run history: each seeded run is collapsible/expandable', async ({ page }) => {
    const hasRuns = await page.locator('text=/\\d+ total/').first().isVisible().catch(() => false)
    test.skip(!hasRuns, 'No seeded runs available')
    // Click the first run summary to expand
    const firstRun = page.locator('text=/▶/').first()
    if (await firstRun.isVisible().catch(() => false)) {
      await firstRun.click()
      // After expand, the inner predictions table renders cards (Entry / SL / TP)
      // Wait for at least one prediction card to appear
      await expect(
        page.locator('div.rounded-lg.border.border-gray-700').first(),
      ).toBeVisible({ timeout: 5_000 })
      // Collapse again
      await page.locator('text=/▼/').first().click()
    }
  })

  test('Delete button on a run removes the row', async ({ page }) => {
    const hasRuns = await page.locator('text=/\\d+ total/').first().isVisible().catch(() => false)
    test.skip(!hasRuns, 'No seeded runs available')
    const initialRunCount = await page.locator('text=/\\d+ total/').count()
    page.on('dialog', (d) => d.accept().catch(() => {}))
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
    await expect
      .poll(() => page.locator('text=/\\d+ total/').count(), { timeout: 5_000 })
      .toBe(initialRunCount - 1)
  })

  test('Run a tiny real backtest (1 cutoff, 1 pair) and see results', async ({ page }) => {
    test.setTimeout(360_000)
    const runLocator = page.locator('text=/\\d+ total/')
    const initialRuns = await runLocator.count()

    const now = new Date()
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    const start = new Date(now.getTime() - 4 * 86_400_000)
    const end = new Date(now.getTime() - 2 * 86_400_000)
    const dtLocals = page.locator('input[type="datetime-local"]')
    await dtLocals.nth(0).fill(fmt(start))
    await dtLocals.nth(1).fill(fmt(end))
    await page.locator('select').filter({ hasText: /Every/ }).selectOption('1')
    await page.locator('input[placeholder="auto"]').last().fill('1')

    await page.getByRole('button', { name: 'Run Backtest' }).click()

    const errorBanner = page.locator('div.bg-red-500\\/10')
    const progress = page.locator('text=/Cutoff \\d+\\/\\d+/')
    await Promise.race([
      progress.first().waitFor({ state: 'visible', timeout: 60_000 }),
      errorBanner.waitFor({ state: 'visible', timeout: 60_000 }),
    ])
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent()
      throw new Error(`Backtest run returned error: ${text}`)
    }
    await Promise.race([
      progress.first().waitFor({ state: 'hidden', timeout: 300_000 }),
      errorBanner.waitFor({ state: 'visible', timeout: 300_000 }),
    ])
    if (await errorBanner.isVisible().catch(() => false)) {
      const text = await errorBanner.textContent()
      throw new Error(`Backtest run returned error mid-run: ${text}`)
    }
    await expect.poll(() => runLocator.count(), { timeout: 30_000 }).toBeGreaterThan(initialRuns)
  })

  test('Cancel during run aborts the backtest', async ({ page }) => {
    test.setTimeout(120_000)
    const now = new Date()
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    const start = new Date(now.getTime() - 14 * 86_400_000)
    const end = new Date(now.getTime() - 2 * 86_400_000)
    const dtLocals = page.locator('input[type="datetime-local"]')
    await dtLocals.nth(0).fill(fmt(start))
    await dtLocals.nth(1).fill(fmt(end))
    await page.locator('select').filter({ hasText: /Every/ }).selectOption('1')

    await page.getByRole('button', { name: 'Run Backtest' }).click()
    const progress = page.locator('text=/Cutoff \\d+\\/\\d+/')
    await expect(progress.first()).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    // Run Backtest button should be enabled again, progress hidden
    await expect(progress.first()).toBeHidden({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Run Backtest', exact: true })).toBeEnabled()
  })
})
