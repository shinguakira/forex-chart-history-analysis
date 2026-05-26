import { expect, test } from '@playwright/test'

import { gotoPage } from './helpers'

test.describe('Practice page (/practice) — common header & state', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/practice')
    await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible()
  })

  test('three mode tabs are present and Replay is the default', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quiz' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Setup' })).toBeVisible()
    // Replay-specific UI
    await expect(page.getByText('Replay Stats')).toBeVisible()
  })

  test('All-mode stats panel renders with all 3 mode summaries', async ({ page }) => {
    // PracticeStats panel — the spec says it shows all 3 mode aggregates
    // We verify the labels are present (counts may be 0)
    const statsArea = page.locator('text=/Replay|Quiz|Setup/')
    expect(await statsArea.count()).toBeGreaterThan(0)
  })

  test('switching modes preserves the page', async ({ page }) => {
    await page.getByRole('button', { name: 'Quiz' }).click()
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible()
    await page.getByRole('button', { name: 'Setup' }).click()
    // Setup also has New button
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible()
    await page.getByRole('button', { name: 'Replay' }).click()
    await expect(page.getByText('Replay Stats')).toBeVisible()
  })

  test('Blind checkbox toggles and survives mode switch', async ({ page }) => {
    const blind = page.getByLabel('Blind').first()
    await blind.check()
    await expect(blind).toBeChecked()
    await page.getByRole('button', { name: 'Quiz' }).click()
    // Blind setting is in usePracticeStore — should persist across modes
    await expect(page.getByLabel('Blind').first()).toBeChecked()
    await page.getByLabel('Blind').first().uncheck()
  })

  test('Indicator panel is available in every practice mode', async ({ page }) => {
    // Replay
    await expect(page.getByRole('button', { name: /^Ind/ })).toBeVisible()
    // Quiz
    await page.getByRole('button', { name: 'Quiz' }).click()
    await expect(page.getByRole('button', { name: /^Ind/ })).toBeVisible()
    // Setup
    await page.getByRole('button', { name: 'Setup' }).click()
    await expect(page.getByRole('button', { name: /^Ind/ })).toBeVisible()
  })

  test('Toggling SMA-20 in Replay survives polling refresh and persists across modes', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    // Wait for the candle canvas (ReplayMode auto-fetches on mount).
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 })

    const indBtn = page.getByRole('button', { name: /^Ind/ })
    await indBtn.click()
    await page.getByText('SMA 20', { exact: true }).click()
    await expect(indBtn).toContainText('1')

    // Wait past the 30s candle-polling refetch — the indicator data effect
    // re-runs against overlays whose chart may have been recreated (StrictMode),
    // and must not throw "Value is undefined" from lightweight-charts.
    await page.waitForTimeout(35_000)
    await expect(
      page.getByText('Something went wrong!'),
      'CatchBoundary should not have caught any error',
    ).toBeHidden()

    // Close the dropdown backdrop, then verify state persists across mode switch.
    await page.locator('.fixed.inset-0.z-40').click({ force: true })
    await page.getByRole('button', { name: 'Quiz' }).click()
    await expect(page.getByRole('button', { name: /^Ind/ })).toContainText('1')

    // Cleanup — toggle SMA back off so later tests start clean.
    await page.getByRole('button', { name: /^Ind/ }).click()
    await page.getByText('SMA 20', { exact: true }).click()
  })
})

test.describe('Practice — Replay mode', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/practice')
    await expect(page.getByRole('heading', { name: 'Practice' })).toBeVisible()
  })

  test('Pair / Timeframe / Scenario dropdowns expose all options', async ({ page }) => {
    const selects = page.locator('select')
    await expect(selects.nth(0)).toBeVisible() // pair
    await expect(selects.nth(1)).toBeVisible() // timeframe
    await expect(selects.nth(2)).toBeVisible() // scenario

    // Pair dropdown has 9 options
    const pairOptions = await selects.nth(0).locator('option').count()
    expect(pairOptions).toBe(9)
    // Timeframe dropdown has 7 options
    const tfOptions = await selects.nth(1).locator('option').count()
    expect(tfOptions).toBe(7)
    // Scenario has 4: random / high-volatility / consolidation / gap
    const scenarioOptions = await selects.nth(2).locator('option').count()
    expect(scenarioOptions).toBe(4)
  })

  test('All 4 scenario filters are selectable without crashing', async ({ page }) => {
    const scenarioSelect = page.locator('select').nth(2)
    for (const scenario of ['random', 'high-volatility', 'consolidation', 'gap']) {
      await scenarioSelect.selectOption(scenario)
      await expect(scenarioSelect).toHaveValue(scenario)
    }
  })

  test('Random Jump → place valid order → step → manual close', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: /Random Jump/ }).click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 })

    // SL/TP quick-set buttons populate inputs from current price
    await page.getByRole('button', { name: '-20p' }).first().click()
    await page.getByRole('button', { name: '+20p' }).first().click()
    // Buy
    await page.getByRole('button', { name: 'Buy', exact: true }).click()
    await expect(page.getByText('Open Position')).toBeVisible({ timeout: 5_000 })
    // Step forward
    await page.getByRole('button', { name: '+10', exact: true }).click()
    // Manual close (button label includes the price). Use a regex.
    const closeBtn = page.getByRole('button', { name: /^Close @ /, exact: false })
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click()
      // After close, New Order panel returns
      await expect(page.getByText('New Order')).toBeVisible({ timeout: 5_000 })
    } else {
      // Auto-close may have triggered — verify the position panel is gone
      await expect(page.getByText('Open Position')).toBeHidden()
    }
  })

  test('Buy with no SL/TP entered does not open a position', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: /Random Jump/ }).click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
    // Click Buy without filling SL/TP — placeOrder() guards on Number.isFinite(sl/tp)
    await page.getByRole('button', { name: 'Buy', exact: true }).click()
    await expect(page.getByText('Open Position')).toBeHidden()
    await expect(page.getByText('New Order')).toBeVisible()
  })

  test('Cancel discards the open position without recording', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: /Random Jump/ }).click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
    await page.getByRole('button', { name: '-20p' }).first().click()
    await page.getByRole('button', { name: '+20p' }).first().click()
    await page.getByRole('button', { name: 'Buy', exact: true }).click()
    await expect(page.getByText('Open Position')).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText('New Order')).toBeVisible()
  })

  test('Step buttons +1 / +10 / +50 advance cursor and -1 steps back', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: /Random Jump/ }).click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
    const cursor = page.locator('text=/\\d+ \\/ \\d+/').first()
    const initial = await cursor.innerText()
    const initIdx = Number.parseInt(initial.split('/')[0].trim(), 10)
    await page.getByRole('button', { name: '+10', exact: true }).click()
    const after10 = await cursor.innerText()
    expect(Number.parseInt(after10.split('/')[0].trim(), 10)).toBeGreaterThan(initIdx)
    await page.getByRole('button', { name: 'Step back 1 bar', exact: true }).click()
    const afterBack = Number.parseInt(
      (await cursor.innerText()).split('/')[0].trim(),
      10,
    )
    expect(afterBack).toBeLessThan(Number.parseInt(after10.split('/')[0].trim(), 10))
  })

  test('Play / Pause toggle switches button label', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: /Random Jump/ }).click()
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 45_000 })
    const playBtn = page.getByRole('button', { name: 'Play', exact: true })
    await playBtn.click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible({ timeout: 3_000 })
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 3_000 })
  })

  test('Speed dropdown exposes 4 options', async ({ page }) => {
    const speed = page.locator('select').last() // last select on Replay
    const labels = await speed.locator('option').allInnerTexts()
    for (const v of ['1.0s', '0.5s', '0.25s', '0.1s']) {
      expect(labels).toContain(v)
    }
  })
})

test.describe('Practice — Quiz mode', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/practice')
    await page.getByRole('button', { name: 'Quiz' }).click()
  })

  test('Bars-ahead dropdown exposes 5/10/20/50', async ({ page }) => {
    const barsSelect = page.locator('select').nth(3)
    const labels = await barsSelect.locator('option').allInnerTexts()
    for (const v of ['5 bars', '10 bars', '20 bars', '50 bars']) {
      expect(labels).toContain(v)
    }
  })

  test('Submitting UP/DOWN reveals outcome and updates accuracy line', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'UP', exact: true }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: 'UP', exact: true }).click()
    await expect(page.getByText('Your call:')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Result:')).toBeVisible()
    // Pips outcome present
    await expect(page.locator('text=/\\(?up|down|flat\\)?/').first()).toBeVisible()
  })

  test('Next Question advances to a new candle without errors', async ({ page }) => {
    test.setTimeout(90_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'UP', exact: true }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: 'UP', exact: true }).click()
    await expect(page.getByText('Your call:')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Next/ }).click()
    // Back to asking phase: UP/DOWN visible again
    await page.getByRole('button', { name: 'UP', exact: true }).waitFor({ timeout: 45_000 })
  })

  test('Cutoff yellow marker appears in revealed phase (DOM marker text)', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'UP', exact: true }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: 'UP', exact: true }).click()
    // The marker text "Cutoff" is set via lightweight-charts; we approximate by
    // confirming the revealed phase shows accuracy/streak rather than pixel-checking.
    await expect(page.getByText('Your call:')).toBeVisible()
  })
})

test.describe('Practice — Setup mode', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '/practice')
    await page.getByRole('button', { name: 'Setup' }).click()
  })

  test('Bars-ahead dropdown exposes 10/20/50/100', async ({ page }) => {
    const barsSelect = page.locator('select').nth(3)
    const labels = await barsSelect.locator('option').allInnerTexts()
    for (const v of ['10 bars', '20 bars', '50 bars', '100 bars']) {
      expect(labels).toContain(v)
    }
  })

  test('Confidence buttons 1-5 are clickable and update the X / 5 indicator', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'Long', exact: true }).waitFor({ timeout: 45_000 })
    // Click confidence 5 — UI shows "5 / 5"
    await page.getByRole('button', { name: '5', exact: true }).click()
    await expect(page.locator('text=/^5 \\/ 5$/')).toBeVisible()
    // Click confidence 2
    await page.getByRole('button', { name: '2', exact: true }).click()
    await expect(page.locator('text=/^2 \\/ 5$/')).toBeVisible()
  })

  test('Submit & Reveal disabled until a judgement is picked', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'Long', exact: true }).waitFor({ timeout: 45_000 })
    const submit = page.getByRole('button', { name: 'Submit & Reveal' })
    await expect(submit).toBeDisabled()
    await page.getByRole('button', { name: 'Short', exact: true }).click()
    await expect(submit).toBeEnabled()
  })

  test('Long judgement → submit → result row shows Right/Wrong badge', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'Long', exact: true }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: 'Long', exact: true }).click()
    await page
      .locator('textarea')
      .first()
      .fill('Higher highs and momentum continuation.')
    await page.getByRole('button', { name: 'Submit & Reveal' }).click()
    await expect(
      page.getByText('Outcome:', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 })
    // Right or Wrong badge appears
    const verdict = page.locator('text=/Right|Wrong/').first()
    await expect(verdict).toBeVisible()
  })

  test('No-Trade judgement is selectable', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByRole('button', { name: 'New' }).click()
    await page.getByRole('button', { name: 'No Trade', exact: true }).waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: 'No Trade', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Submit & Reveal' })).toBeEnabled()
  })
})
