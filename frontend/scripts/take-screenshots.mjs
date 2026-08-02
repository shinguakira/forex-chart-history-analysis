// Screenshot capture for docs/CHANGES.md.
// Walks the running Vite dev server (http://localhost:5173) and the running
// forex-server backend (http://localhost:4000) and saves a PNG for each
// change point I shipped this session. Run with:
//     cd frontend && node scripts/take-screenshots.mjs
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'http://localhost:5173'
// frontend/scripts/take-screenshots.mjs → ../../docs/screenshots
const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(HERE, '../../docs/screenshots')
await mkdir(DIR, { recursive: true })

const browser = await chromium.launch()

async function shot(name, viewport, fn) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  try {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    await fn(page)
    await page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: false })
    console.log('saved', name)
  } finally {
    await ctx.close()
  }
}

const MOBILE = { width: 375, height: 812 }
const DESKTOP = { width: 1280, height: 800 }

// ── Mobile audit (Header / MainLayout / ChartWindow) ──────────────────────
await shot('01-header-mobile-collapsed', MOBILE, async (p) => {
  // root route, hamburger collapsed
})

await shot('02-header-mobile-menu', MOBILE, async (p) => {
  await p.locator('button[aria-label="Open menu"]').click()
})

await shot('03-mainlayout-mobile-fab', MOBILE, async (p) => {
  // sidebar drawer toggle FAB visible bottom-left
})

await shot('04-mainlayout-mobile-drawer', MOBILE, async (p) => {
  await p.locator('button[aria-label="Open pairs sidebar"]').click()
  await p.waitForTimeout(150)
})

await shot('05-chart-mobile-fullcanvas', MOBILE, async (p) => {
  await p.locator('button[aria-label="Open pairs sidebar"]').click()
  await p.locator('aside.fixed button:has-text("USD/JPY")').first().click()
  await p.waitForTimeout(1500)
})

// ── Practice history CSV/JSON export ──────────────────────────────────────
await shot('06-practice-history-export', DESKTOP, async (p) => {
  await p.goto(BASE + '/practice')
  await p.waitForLoadState('networkidle').catch(() => {})
  await p.locator('header ~ * button:has-text("History"), button:has-text("History")').first().click().catch(async () => {
    await p.getByRole('button', { name: 'History' }).first().click()
  })
  await p.waitForTimeout(400)
})

// ── Notes markdown rendering ──────────────────────────────────────────────
await shot('07-notes-markdown', DESKTOP, async (p) => {
  await p.goto(BASE + '/notes')
  await p.waitForLoadState('networkidle').catch(() => {})
  const md = [
    '# Trading journal',
    '',
    '**EUR/USD** broke through 1.08 — *bullish*.',
    '',
    '- watch for retest',
    '- [x] reduce JPY exposure',
    '- [ ] set alert at 1.085',
    '',
    '> "Markets can stay irrational longer than you can stay solvent."',
    '',
    '| Pair | Bias |',
    '|------|------|',
    '| USD/JPY | range |',
    '| EUR/USD | long |',
    '',
    '```',
    'PRAGMA journal_mode=DELETE',
    '```',
  ].join('\n')
  await p.locator('textarea').first().fill(md)
  await p.keyboard.press('ControlOrMeta+Enter')
  await p.waitForTimeout(800)
})

// ── Practice mobile sticky bars + 60vh chart (per mode) ───────────────────
async function clickTab(p, label) {
  // Practice tabs live in a header row; first match is the right one.
  await p.getByRole('button', { name: label, exact: true }).first().click()
}

await shot('08-practice-quiz-mobile', MOBILE, async (p) => {
  await p.goto(BASE + '/practice')
  await p.waitForLoadState('networkidle').catch(() => {})
  await clickTab(p, 'Quiz')
  await p.getByRole('button', { name: 'New' }).click()
  await p.waitForTimeout(2000)
})

await shot('09-practice-quiz-revealed-mobile', MOBILE, async (p) => {
  await p.goto(BASE + '/practice')
  await p.waitForLoadState('networkidle').catch(() => {})
  await clickTab(p, 'Quiz')
  await p.getByRole('button', { name: 'New' }).click()
  await p.waitForTimeout(2000)
  // Click sticky-bottom UP — last UP-labeled button on the page
  const ups = await p.getByRole('button', { name: 'UP' }).all()
  await ups[ups.length - 1].click()
  await p.waitForTimeout(500)
})

await shot('10-practice-setup-mobile', MOBILE, async (p) => {
  await p.goto(BASE + '/practice')
  await p.waitForLoadState('networkidle').catch(() => {})
  await clickTab(p, 'Setup')
  await p.getByRole('button', { name: 'New' }).click()
  await p.waitForTimeout(2000)
  // Pick the sticky-bar Long chip (last one on the page)
  const longs = await p.getByRole('button', { name: 'Long', exact: true }).all()
  if (longs.length) await longs[longs.length - 1].click()
  await p.waitForTimeout(200)
})

await shot('11-practice-replay-mobile', MOBILE, async (p) => {
  await p.goto(BASE + '/practice')
  await p.waitForLoadState('networkidle').catch(() => {})
  await clickTab(p, 'Replay')
  await p.getByRole('button', { name: 'Random Jump' }).click()
  await p.waitForTimeout(2000)
})

// ── Desktop comparison shots ─────────────────────────────────────────────
await shot('12-header-desktop', DESKTOP, async (p) => {
  // full nav row visible
})

await shot('13-practice-replay-desktop', DESKTOP, async (p) => {
  await p.goto(BASE + '/practice')
  await p.waitForLoadState('networkidle').catch(() => {})
  await clickTab(p, 'Replay')
  await p.getByRole('button', { name: 'Random Jump' }).click()
  await p.waitForTimeout(2000)
})

await browser.close()
console.log('Done.')
