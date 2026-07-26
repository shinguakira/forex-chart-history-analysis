import { expect, test } from '@playwright/test'

// Diagnostic: does the chart actually receive candle data via rspc on the web build?
// If this passes -> Tauri IPC layer is suspect.
// If this fails -> the frontend chart pipeline itself is broken.
test('chart shows candle data after picking a pair (Yahoo via rspc)', async ({ page }) => {
  test.setTimeout(60_000)

  const consoleMsgs: string[] = []
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) {
      consoleMsgs.push(`[${m.type()}] ${m.text()}`)
    }
  })
  page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`))

  // Capture the rspc candles.list response by intercepting fetch / ws traffic.
  const rspcResponses: Array<{ url: string; status: number; preview: string }> = []
  page.on('response', async (r) => {
    if (r.url().includes('rspc') && r.url().toLowerCase().includes('candles')) {
      try {
        const body = await r.text()
        rspcResponses.push({ url: r.url(), status: r.status(), preview: body.slice(0, 400) })
      } catch {}
    }
  })

  await page.goto('/')
  // The chart page lists pairs; pick USDJPY which always exists.
  const usdJpy = page.getByRole('button', { name: /USD.?JPY/i }).first()
  await expect(usdJpy).toBeVisible({ timeout: 10_000 })
  await usdJpy.click()

  // Wait for the lightweight-charts canvas to mount.
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible({ timeout: 15_000 })

  // Give rspc time to fetch + render.
  await page.waitForTimeout(8_000)

  // Save a screenshot regardless of pass/fail for visual confirmation.
  await page.screenshot({ path: 'test-results/chart-debug.png', fullPage: true })

  console.log('--- console errors/warnings ---')
  consoleMsgs.forEach((m) => console.log(m))
  console.log('--- rspc candles responses ---')
  rspcResponses.forEach((r) => console.log(`${r.status} ${r.url} :: ${r.preview}`))

  // Verify by reading the chart's data: lightweight-charts renders bars onto
  // the canvas; we can sniff non-emptiness via querying the page's exposed
  // store. Fall back to inspecting whether the canvas has non-zero painted
  // pixels (rough check).
  const isCanvasPainted = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')
    if (!ctx) return false
    const w = el.width
    const h = el.height
    if (w === 0 || h === 0) return false
    // Sample 200 random pixels: chart pixels won't be uniformly transparent / one color.
    const colors = new Set<string>()
    const data = ctx.getImageData(0, 0, Math.min(w, 800), Math.min(h, 400)).data
    for (let i = 0; i < data.length; i += 4 * 200) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`)
    }
    return colors.size > 3 // >3 distinct colors => something was rendered
  })

  expect(isCanvasPainted, 'canvas appears empty/unpainted — chart did not render data').toBe(true)
})
