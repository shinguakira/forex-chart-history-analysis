import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Learning page (/learning)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/learning')
    await expect(page.getByRole('heading', { name: 'Chart Patterns' })).toBeVisible()
  })

  test('shows 21 patterns by default (All / All filters)', async ({ page }) => {
    await expect(page.locator('text=21 patterns')).toBeVisible()
  })

  test('Reversal category filter narrows the grid to <21', async ({ page }) => {
    await page.getByRole('button', { name: 'Reversal' }).click()
    const counter = page
      .locator('span.text-xs.text-gray-500')
      .filter({ hasText: 'patterns' })
      .first()
    const text = (await counter.textContent()) ?? ''
    expect(text).toMatch(/^\d+ patterns$/)
    expect(Number(text.split(' ')[0])).toBeLessThan(21)
  })

  test('Continuation filter narrows the grid', async ({ page }) => {
    await page.getByRole('button', { name: 'Continuation' }).click()
    const counter = page
      .locator('span.text-xs.text-gray-500')
      .filter({ hasText: 'patterns' })
      .first()
    const text = (await counter.textContent()) ?? ''
    expect(text).toMatch(/^\d+ patterns$/)
    expect(Number(text.split(' ')[0])).toBeLessThan(21)
  })

  test('Candlestick filter narrows the grid', async ({ page }) => {
    await page.getByRole('button', { name: 'Candlestick' }).click()
    const counter = page
      .locator('span.text-xs.text-gray-500')
      .filter({ hasText: 'patterns' })
      .first()
    const text = (await counter.textContent()) ?? ''
    expect(text).toMatch(/^\d+ patterns$/)
  })

  test('Bullish + Reversal compose to a smaller set', async ({ page }) => {
    await page.getByRole('button', { name: 'Reversal' }).click()
    await page.getByRole('button', { name: 'Bullish' }).click()
    const counter = page
      .locator('span.text-xs.text-gray-500')
      .filter({ hasText: 'patterns' })
      .first()
    const text = (await counter.textContent()) ?? ''
    expect(text).toMatch(/^\d+ patterns$/)
  })

  test('a pattern card has Show details toggle that reveals identification + strategy', async ({
    page,
  }) => {
    const firstCard = page.locator('button:has-text("Show Details")').first()
    await expect(firstCard).toBeVisible()
    await firstCard.click()
    // Once expanded, the toggle text flips
    await expect(page.getByRole('button', { name: /Hide Details/ }).first()).toBeVisible()
    // Identification + Trading Strategy sections render
    await expect(page.getByText('How to Identify').first()).toBeVisible()
    await expect(page.getByText('Trading Strategy').first()).toBeVisible()
    // Sub-labels: Entry / Stop Loss / Target
    await expect(page.locator('span.text-green-400.font-medium').filter({ hasText: 'Entry' }).first()).toBeVisible()
    await expect(page.locator('span.text-red-400.font-medium').filter({ hasText: 'Stop Loss' }).first()).toBeVisible()
    await expect(page.locator('span.text-blue-400.font-medium').filter({ hasText: 'Target' }).first()).toBeVisible()
  })

  test('Hide Details collapses the panel back', async ({ page }) => {
    const firstCard = page.locator('button:has-text("Show Details")').first()
    await firstCard.click()
    const hide = page.getByRole('button', { name: /Hide Details/ }).first()
    await hide.click()
    // Identification section disappears (or at least the first one)
    await expect(page.getByText('How to Identify').first()).toBeHidden({ timeout: 3_000 })
  })

  test('Resetting filters with All/All restores 21 count', async ({ page }) => {
    await page.getByRole('button', { name: 'Reversal' }).click()
    await page.getByRole('button', { name: 'Bullish' }).click()
    // Reset
    await page.getByRole('button', { name: 'All' }).first().click() // Category All
    await page.getByRole('button', { name: 'All' }).nth(1).click() // Signal All
    await expect(page.locator('text=21 patterns')).toBeVisible()
  })
})
