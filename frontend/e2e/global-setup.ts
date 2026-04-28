import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const TEST_DB_PATH = resolve(REPO_ROOT, 'test.db')
const TEST_DB_URL = 'sqlite://./test.db?mode=rwc'

function run(cmd: string, args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (exit ${result.status})`)
  }
}

async function globalSetup() {
  console.log('[e2e] global-setup: resetting test DB')

  // Wipe any old test.db (and SQLite WAL/SHM siblings)
  for (const f of ['test.db', 'test.db-wal', 'test.db-shm', 'test.db-journal']) {
    const p = resolve(REPO_ROOT, f)
    if (existsSync(p)) {
      try {
        rmSync(p)
      } catch (e) {
        console.warn(`[e2e] could not remove ${p}: ${(e as Error).message}`)
      }
    }
  }
  void TEST_DB_PATH

  // Seed via the migrate-from-json importer (it also runs migrations).
  console.log('[e2e] global-setup: seeding fixtures from frontend/data')
  run(
    'cargo',
    [
      'run',
      '-p',
      'forex-migrate',
      '--features',
      'sqlite',
      '--no-default-features',
      '--',
      '--db-url',
      TEST_DB_URL,
      '--data-dir',
      'frontend/data',
    ],
    { DATABASE_URL: TEST_DB_URL },
  )

  console.log('[e2e] global-setup: done')
}

export default globalSetup
