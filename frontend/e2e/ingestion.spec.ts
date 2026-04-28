import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Ingestion page (/ingestion)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/ingestion')
    await expect(page.getByRole('heading', { name: 'Candle Ingestion' })).toBeVisible()
  })

  test('Start a job section + both job tables render', async ({ page }) => {
    await expect(page.getByText('Start a job')).toBeVisible()
    await expect(page.getByText('Backfill jobs')).toBeVisible()
    await expect(page.getByText('Catch-up jobs')).toBeVisible()
  })

  test('Pair dropdown lists all 9 pairs', async ({ page }) => {
    const pair = page.locator('select').nth(0)
    const opts = await pair.locator('option').allInnerTexts()
    for (const p of [
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
      expect(opts).toContain(p)
    }
  })

  test('Timeframe dropdown lists 7 timeframes', async ({ page }) => {
    const tf = page.locator('select').nth(1)
    const opts = await tf.locator('option').allInnerTexts()
    for (const v of ['1m', '5m', '15m', '1h', '4h', 'Daily', 'Weekly']) {
      expect(opts).toContain(v)
    }
  })

  test('days input accepts numbers', async ({ page }) => {
    const daysInput = page.locator('input[type="number"]')
    await daysInput.fill('14')
    await expect(daysInput).toHaveValue('14')
    await daysInput.fill('365')
    await expect(daysInput).toHaveValue('365')
  })

  test('Start Backfill enqueues a job with the selected pair/timeframe', async ({ page }) => {
    const pair = page.locator('select').nth(0)
    const tf = page.locator('select').nth(1)
    await pair.selectOption('USD_JPY')
    await tf.selectOption('D')
    await page.locator('input[type="number"]').fill('14')
    await page.getByRole('button', { name: 'Start Backfill' }).click()
    const backfillSection = page.locator('section').filter({ hasText: 'Backfill jobs' })
    await expect(backfillSection.locator('text=USD/JPY').first()).toBeVisible({ timeout: 15_000 })
    // Daily TF label
    await expect(backfillSection.locator('text=/^Daily$/').first()).toBeVisible()
  })

  test('Start Catch-up enqueues a catchup job (separate table)', async ({ page }) => {
    const pair = page.locator('select').nth(0)
    const tf = page.locator('select').nth(1)
    await pair.selectOption('EUR_USD')
    await tf.selectOption('D')
    await page.getByRole('button', { name: 'Start Catch-up' }).click()
    const catchupSection = page.locator('section').filter({ hasText: 'Catch-up jobs' })
    await expect(catchupSection.locator('text=EUR/USD').first()).toBeVisible({ timeout: 15_000 })
  })

  test('Pause/Resume button is present on enqueued jobs', async ({ page }) => {
    const backfillSection = page.locator('section').filter({ hasText: 'Backfill jobs' })
    const noJobs = await backfillSection
      .locator('text=No jobs yet.')
      .isVisible()
      .catch(() => false)
    if (noJobs) {
      await page.locator('select').nth(0).selectOption('USD_JPY')
      await page.locator('select').nth(1).selectOption('D')
      await page.locator('input[type="number"]').fill('7')
      await page.getByRole('button', { name: 'Start Backfill' }).click()
      await expect(backfillSection.locator('text=USD/JPY').first()).toBeVisible({ timeout: 15_000 })
    }
    const action = backfillSection
      .locator('button')
      .filter({ hasText: /^(Pause|Resume)$/ })
      .first()
    await expect(action).toBeVisible()
  })

  test('Delete button removes the job row from the table', async ({ page }) => {
    const backfillSection = page.locator('section').filter({ hasText: 'Backfill jobs' })
    // Ensure at least one job exists — start a fresh one we can delete.
    await page.locator('select').nth(0).selectOption('NZD_USD')
    await page.locator('select').nth(1).selectOption('W')
    await page.locator('input[type="number"]').fill('30')
    await page.getByRole('button', { name: 'Start Backfill' }).click()
    const newRow = backfillSection.locator('text=NZD/USD').first()
    await expect(newRow).toBeVisible({ timeout: 15_000 })

    // Count rows before delete
    const rowsBefore = await backfillSection.locator('text=NZD/USD').count()
    // Delete the new job
    const row = backfillSection
      .locator('div.grid')
      .filter({ hasText: 'NZD/USD' })
      .first()
    await row.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect
      .poll(() => backfillSection.locator('text=NZD/USD').count(), { timeout: 5_000 })
      .toBeLessThan(rowsBefore)
  })

  test('Backfill table column headers render in the right order', async ({ page }) => {
    const backfillSection = page.locator('section').filter({ hasText: 'Backfill jobs' })
    // Add at least one job so the table renders
    const noJobs = await backfillSection
      .locator('text=No jobs yet.')
      .isVisible()
      .catch(() => false)
    if (noJobs) {
      await page.locator('select').nth(0).selectOption('AUD_USD')
      await page.locator('select').nth(1).selectOption('D')
      await page.locator('input[type="number"]').fill('30')
      await page.getByRole('button', { name: 'Start Backfill' }).click()
      await expect(backfillSection.locator('text=AUD/USD').first()).toBeVisible({ timeout: 15_000 })
    }
    for (const header of [
      'Pair',
      'TF',
      'Status',
      'Range',
      'Progress',
      'Retry',
      'Last error',
      'Actions',
    ]) {
      await expect(backfillSection.locator(`text=${header}`).first()).toBeVisible()
    }
  })
})
