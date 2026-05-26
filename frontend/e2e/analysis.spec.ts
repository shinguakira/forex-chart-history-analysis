import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Analysis page (/analysis)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/analysis')
    await expect(page.getByRole('heading', { name: 'Trade Analysis' })).toBeVisible()
  })

  test('renders trade count and the analysis sections', async ({ page }) => {
    await expect(page.locator('text=/^\\d+ trades$/').first()).toBeVisible({ timeout: 15_000 })
    for (const heading of [
      'Cumulative P/L',
      'Monthly Breakdown',
      'Pair Performance',
      'Direction Analysis',
      'Time Analysis',
      'Trade Duration',
      'Position Size',
      'Streak Analysis',
      'Drawdown Analysis',
      'Risk / Reward',
      'Consistency',
      'Recent Performance Trend',
    ]) {
      await expect(
        page.getByRole('heading', { name: new RegExp(heading) }).first(),
      ).toBeVisible()
    }
  })

  test('Summary cards expose all 8 metrics', async ({ page }) => {
    for (const label of [
      'Total Trades',
      'Net P/L',
      'Win Rate',
      'Profit Factor',
      'Avg Win',
      'Avg Loss',
      'Expectancy',
      'Long / Short',
    ]) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible()
    }
  })

  test('preset filter buttons recompute trade count', async ({ page }) => {
    const counter = page.locator('text=/^\\d+ trades$/').first()
    const initial = (await counter.textContent()) ?? ''
    const initialCount = Number(initial.split(' ')[0])

    await page.getByRole('button', { name: '1M', exact: true }).click()
    await page.waitForTimeout(300)
    const oneM = (await counter.textContent()) ?? ''
    expect(Number(oneM.split(' ')[0])).toBeLessThanOrEqual(initialCount)

    await page.getByRole('button', { name: 'All', exact: true }).click()
    await page.waitForTimeout(300)
    expect(Number(((await counter.textContent()) ?? '').split(' ')[0])).toBe(initialCount)
  })

  test('every preset button is reachable without errors', async ({ page }) => {
    for (const preset of ['1M', '3M', '6M', '1Y', '2Y']) {
      await page.getByRole('button', { name: preset, exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Trade Analysis' })).toBeVisible()
    }
  })

  test('Custom date range filters when both From and To are filled', async ({ page }) => {
    const counter = page.locator('text=/^\\d+ trades$/').first()
    const all = Number(((await counter.textContent()) ?? '').split(' ')[0])

    await page.getByRole('button', { name: 'Custom', exact: true }).click()
    const dates = page.locator('input[type="date"]')
    await dates.nth(0).fill('2024-01-01')
    await dates.nth(1).fill('2024-12-31')
    await page.waitForTimeout(300)
    const custom = Number(((await counter.textContent()) ?? '').split(' ')[0])
    expect(custom).toBeLessThan(all)
    expect(custom).toBeGreaterThan(0)
  })

  test('Pair Performance card lists at least USD/JPY (the dominant pair)', async ({ page }) => {
    const pairCard = page
      .locator('h3')
      .filter({ hasText: 'Pair Performance' })
      .locator('..')
    await expect(pairCard.locator('text=USD/JPY').first()).toBeVisible()
  })

  test('Direction Analysis shows Long and Short blocks', async ({ page }) => {
    await expect(page.locator('text=/^Long \\(\\d+\\)$/').first()).toBeVisible()
    await expect(page.locator('text=/^Short \\(\\d+\\)$/').first()).toBeVisible()
  })

  test('Streak Analysis exposes Longest Win / Longest Loss / Avg Win / Avg Loss streak', async ({
    page,
  }) => {
    for (const label of [
      'Longest Win Streak',
      'Longest Loss Streak',
      'Avg Win Streak',
      'Avg Loss Streak',
    ]) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible()
    }
  })

  test('Drawdown card shows Max Drawdown + Current Drawdown', async ({ page }) => {
    await expect(page.locator('text=Max Drawdown').first()).toBeVisible()
    await expect(page.locator('text=Current Drawdown').first()).toBeVisible()
  })
})
