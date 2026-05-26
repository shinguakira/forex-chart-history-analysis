import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Notes page (/notes)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/notes')
    await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible()
  })

  test('renders the seeded note from notes.json fixture', async ({ page }) => {
    await expect(page.locator('text=Loading...')).toBeHidden({ timeout: 10_000 })
    const empty = page.locator('text=No notes yet.')
    expect(await empty.count()).toBe(0)
  })

  test('Add button creates a note that appears at the top', async ({ page }) => {
    const stamp = `e2e add ${Date.now()}`
    const textarea = page.getByPlaceholder('Write a note... (Ctrl+Enter to save)')
    await textarea.fill(stamp)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.locator(`text=${stamp}`).first()).toBeVisible()
    await expect(textarea).toHaveValue('')
  })

  test('Ctrl+Enter saves a new note', async ({ page }) => {
    const stamp = `e2e ctrl-enter ${Date.now()}`
    const textarea = page.getByPlaceholder('Write a note... (Ctrl+Enter to save)')
    await textarea.fill(stamp)
    await textarea.press('Control+Enter')
    await expect(page.locator(`text=${stamp}`).first()).toBeVisible()
  })

  test('newest note is rendered first (createdAt desc)', async ({ page }) => {
    const older = `older ${Date.now()}`
    const newer = `newer ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(older)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.locator(`text=${older}`).first()).toBeVisible()
    // Force a 1-second gap so createdAt differs by ≥1ms
    await page.waitForTimeout(1100)
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(newer)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.locator(`text=${newer}`).first()).toBeVisible()

    // The first note card in the list should contain `newer`, not `older`
    const firstCardText = await page
      .locator('div.rounded-lg.border.border-gray-800')
      .first()
      .innerText()
    expect(firstCardText).toContain(newer)
    expect(firstCardText).not.toContain(older)
  })

  test('multiline text preserves line breaks (whitespace-pre-wrap)', async ({ page }) => {
    const ts = Date.now()
    const multiline = `line1-${ts}\nline2-${ts}`
    const textarea = page.getByPlaceholder('Write a note... (Ctrl+Enter to save)')
    await textarea.fill(multiline)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const card = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: `line1-${ts}` })
      .first()
    await expect(card).toBeVisible()
    // The rendered <div className="whitespace-pre-wrap"> should contain the literal newline
    const innerText = await card
      .locator('div.whitespace-pre-wrap')
      .first()
      .innerText()
    expect(innerText).toBe(multiline)
  })

  test('timestamp uses YYYY/MM/DD HH:MM format', async ({ page }) => {
    const stamp = `ts-format ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(stamp)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const card = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: stamp })
      .first()
    await expect(card).toBeVisible()
    const tsText = await card.locator('span.text-\\[10px\\]').first().innerText()
    expect(tsText).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/)
  })

  test('empty input does not create a note', async ({ page }) => {
    const before = await page.locator('div.rounded-lg.border.border-gray-800').count()
    const textarea = page.getByPlaceholder('Write a note... (Ctrl+Enter to save)')
    await textarea.fill('   ')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await page.waitForTimeout(300)
    const after = await page.locator('div.rounded-lg.border.border-gray-800').count()
    expect(after).toBe(before)
  })

  test('Edit + Save updates the note text', async ({ page }) => {
    const initial = `e2e edit-source ${Date.now()}`
    const updated = `e2e edit-target ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(initial)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const note = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: initial })
      .first()
    await expect(note).toBeVisible()
    await note.getByRole('button', { name: 'Edit' }).click()
    const editing = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ has: page.locator('textarea') })
      .first()
    await editing.locator('textarea').fill(updated)
    await editing.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator(`text=${updated}`).first()).toBeVisible()
    await expect(page.locator(`text=${initial}`)).toHaveCount(0)
  })

  test('Edit then Cancel button preserves original text', async ({ page }) => {
    const initial = `e2e cancel-edit ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(initial)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const note = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: initial })
      .first()
    await note.getByRole('button', { name: 'Edit' }).click()
    const editing = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ has: page.locator('textarea') })
      .first()
    await editing.locator('textarea').fill('SHOULD-NOT-PERSIST')
    await editing.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator(`text=${initial}`).first()).toBeVisible()
    await expect(page.locator('text=SHOULD-NOT-PERSIST')).toHaveCount(0)
  })

  test('Edit then Escape key also cancels', async ({ page }) => {
    const initial = `e2e esc-cancel ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(initial)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const note = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: initial })
      .first()
    await note.getByRole('button', { name: 'Edit' }).click()
    const editing = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ has: page.locator('textarea') })
      .first()
    await editing.locator('textarea').fill('NOT-PERSISTED')
    await editing.locator('textarea').press('Escape')
    // Edit mode should close, original text restored
    await expect(page.locator(`text=${initial}`).first()).toBeVisible()
    await expect(page.locator('text=NOT-PERSISTED')).toHaveCount(0)
  })

  test('Ctrl+Enter inside the edit textarea also saves', async ({ page }) => {
    const initial = `e2e edit-ce ${Date.now()}`
    const updated = `e2e edit-ce-target ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(initial)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const note = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: initial })
      .first()
    await note.getByRole('button', { name: 'Edit' }).click()
    const editing = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ has: page.locator('textarea') })
      .first()
    await editing.locator('textarea').fill(updated)
    await editing.locator('textarea').press('Control+Enter')
    await expect(page.locator(`text=${updated}`).first()).toBeVisible()
    await expect(page.locator(`text=${initial}`)).toHaveCount(0)
  })

  test('saving an edit with empty text deletes the note', async ({ page }) => {
    const initial = `e2e delete-via-empty ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(initial)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const note = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: initial })
      .first()
    await note.getByRole('button', { name: 'Edit' }).click()
    const editing = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ has: page.locator('textarea') })
      .first()
    await editing.locator('textarea').fill('')
    await editing.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator(`text=${initial}`)).toHaveCount(0)
  })

  test('Delete button removes a note (no confirm dialog)', async ({ page }) => {
    const initial = `e2e delete-button ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(initial)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const note = page
      .locator('div.rounded-lg.border.border-gray-800')
      .filter({ hasText: initial })
      .first()
    await expect(note).toBeVisible()
    // No native confirm dialog should fire — set up a fail handler if one does
    page.on('dialog', (d) => {
      throw new Error(`Unexpected dialog: ${d.message()}`)
    })
    await note.getByRole('button', { name: 'Delete' }).click()
    await expect(page.locator(`text=${initial}`)).toHaveCount(0)
  })

  test('notes persist across reload (rspc round-trip to backend)', async ({ page }) => {
    const stamp = `e2e persistence ${Date.now()}`
    await page.getByPlaceholder('Write a note... (Ctrl+Enter to save)').fill(stamp)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.locator(`text=${stamp}`).first()).toBeVisible()
    await page.reload()
    await expect(page.locator(`text=${stamp}`).first()).toBeVisible()
  })
})
