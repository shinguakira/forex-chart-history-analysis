import { expect, test } from '@playwright/test'

import { gotoPage, openSettings } from './helpers'

test.describe('AI Settings dialog', () => {
  test('opens, shows config sections, and reports configured backend', async ({ page }) => {
    await gotoPage(page, '/predictions')
    await openSettings(page)
    await expect(page.getByText('Chart data source')).toBeVisible()
    await expect(page.getByText('AI provider preference')).toBeVisible()
    await expect(page.locator('text=configured').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Test AI Connection succeeds against the real Claude API', async ({ page }) => {
    test.setTimeout(120_000)
    await gotoPage(page, '/predictions')
    await openSettings(page)
    await page.getByRole('button', { name: 'Test AI Connection' }).click()
    await expect(page.locator('text=Connected successfully')).toBeVisible({ timeout: 90_000 })
  })

  test('Toggling chart data source persists via meta.setConfig', async ({ page }) => {
    await gotoPage(page, '/predictions')
    await openSettings(page)
    await page.getByRole('button', { name: 'Database (cached)' }).click()
    await page.getByRole('button', { name: 'Close' }).click()
    // Reopen and the Database button should be active (bg-blue-600)
    await openSettings(page)
    const dbBtn = page.getByRole('button', { name: 'Database (cached)' })
    await expect(dbBtn).toHaveClass(/bg-blue-600/)
    // Reset back to Yahoo for downstream tests
    await page.getByRole('button', { name: 'Yahoo (live)' }).click()
    await page.getByRole('button', { name: 'Close' }).click()
  })

  test('Chart data source default is Yahoo on startup', async ({ page }) => {
    await gotoPage(page, '/predictions')
    await openSettings(page)
    const yahoo = page.getByRole('button', { name: 'Yahoo (live)' })
    await expect(yahoo).toHaveClass(/bg-blue-600/)
    await page.getByRole('button', { name: 'Close' }).click()
  })

  test('AI provider toggle (Claude ↔ Ollama) reflects state across reopen', async ({ page }) => {
    await gotoPage(page, '/predictions')
    await openSettings(page)
    // Start at default (Claude). Switch to Ollama.
    await page.getByRole('button', { name: 'Ollama' }).click()
    await expect(page.getByRole('button', { name: 'Ollama' })).toHaveClass(/bg-blue-600/)
    await page.getByRole('button', { name: 'Close' }).click()
    // Reopen — the Ollama selection should persist (Zustand)
    await openSettings(page)
    await expect(page.getByRole('button', { name: 'Ollama' })).toHaveClass(/bg-blue-600/)
    // Reset to Claude
    await page.getByRole('button', { name: 'Claude' }).click()
    await expect(page.getByRole('button', { name: 'Claude' })).toHaveClass(/bg-blue-600/)
    await page.getByRole('button', { name: 'Close' }).click()
  })

  test('Settings dialog closes via the Close button (and stays closed)', async ({ page }) => {
    await gotoPage(page, '/predictions')
    await openSettings(page)
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden()
    await expect(page.getByText('Chart data source')).toBeHidden()
  })
})
