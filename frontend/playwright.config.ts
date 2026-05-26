import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: resolve(__dirname, '../.env') })

const TEST_DB_URL = 'sqlite://./test.db?mode=rwc'
const BACKEND_PORT = 4001
const FRONTEND_PORT = 5174
const BACKEND_BIND = `127.0.0.1:${BACKEND_PORT}`
const SERVER_URL = `http://${BACKEND_BIND}`
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`

const cargoEnv: Record<string, string> = {
  DATABASE_URL: TEST_DB_URL,
  BIND_ADDR: BACKEND_BIND,
  AI_PROVIDER: 'claude',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  OLLAMA_URL: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? 'plutus',
  RUST_LOG: 'forex_server=info,forex_api=info,forex_ingestor=info',
}

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: resolve(__dirname, './e2e/global-setup.ts'),
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'backend',
      command:
        'cargo run -p forex-server --bin forex-server --features sqlite --no-default-features',
      cwd: resolve(__dirname, '..'),
      env: cargoEnv,
      url: `${SERVER_URL}/healthz`,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'frontend',
      command: `vite --port ${FRONTEND_PORT} --strictPort`,
      cwd: __dirname,
      env: { VITE_SERVER_URL: SERVER_URL },
      url: FRONTEND_URL,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
