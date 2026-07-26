// Standalone Playwright script (no test runner, no webServer interference).
// Attaches to the running Tauri WebView2 via CDP and verifies chart renders.
import { chromium } from '@playwright/test'

const CDP = 'http://127.0.0.1:9223'

const browser = await chromium.connectOverCDP(CDP)
const contexts = browser.contexts()
if (!contexts.length) {
  console.error('no CDP contexts')
  process.exit(1)
}

// Pick the page whose URL contains the app (skip the DevTools page).
let page = null
for (const ctx of contexts) {
  for (const p of ctx.pages()) {
    const url = p.url()
    console.log('candidate page:', url)
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('tauri://')) {
      if (!url.startsWith('devtools://')) {
        page = p
        break
      }
    }
  }
  if (page) break
}

if (!page) {
  console.error('no app page found')
  process.exit(1)
}

console.log('attached to:', page.url())

const consoleMsgs = []
page.on('console', (m) => {
  const t = m.text()
  if (['error', 'warning'].includes(m.type()) || t.includes('rspc-tauri') || t.includes('rspc')) {
    consoleMsgs.push(`[${m.type()}] ${t}`)
  }
})
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`))

// Click USD/JPY
try {
  const usdJpy = page.getByRole('button', { name: /USD.?JPY/i }).first()
  await usdJpy.waitFor({ state: 'visible', timeout: 15_000 })
  await usdJpy.click()
  console.log('clicked USD/JPY')
} catch (e) {
  console.error('could not click USD/JPY:', e.message)
}

const canvas = page.locator('canvas').first()
try {
  await canvas.waitFor({ state: 'visible', timeout: 15_000 })
  console.log('canvas visible')
} catch (e) {
  console.error('canvas not visible:', e.message)
}

// Let rspc IPC complete
await page.waitForTimeout(8000)

await page.screenshot({ path: 'test-results/tauri-chart.png', fullPage: true })

const painted = await canvas.evaluate((el) => {
  const ctx = el.getContext('2d')
  if (!ctx) return { painted: false, w: el.width, h: el.height, reason: 'no 2d ctx' }
  const w = el.width
  const h = el.height
  if (w === 0 || h === 0) return { painted: false, w, h, reason: 'zero size' }
  const data = ctx.getImageData(0, 0, Math.min(w, 800), Math.min(h, 400)).data
  const colors = new Set()
  for (let i = 0; i < data.length; i += 4 * 200) {
    colors.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`)
  }
  return { painted: colors.size > 3, w, h, colorCount: colors.size }
}).catch((e) => ({ painted: false, err: e.message }))

console.log('--- canvas paint check ---', painted)
console.log('--- console errors/warnings ---')
consoleMsgs.forEach((m) => console.log(m))

await browser.close()
process.exit(painted.painted ? 0 : 1)
