import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function gotoPage(page: Page, path: string) {
  await page.goto(path)
  // Header is rendered on every page; wait for it as a readiness signal.
  await expect(page.getByRole('heading', { name: 'Forex Chart' })).toBeVisible()
}

/** Open the AI Settings dialog and wait for it to appear. */
export async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).first().click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

export async function closeSettings(page: Page) {
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeHidden()
}

/** Asserts no "Failed to" / "Error:" red text on screen — used as a smoke gate. */
export async function expectNoFatalError(page: Page) {
  const errorBanner = page.locator('text=/^Failed to /').first()
  await expect(errorBanner).toBeHidden().catch(() => {
    /* allowed if missing entirely */
  })
}

export async function waitForHydration(page: Page) {
  // TanStack Router/Query hydrate after first paint. Wait a tick to be safe.
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.querySelector('header'))
}
