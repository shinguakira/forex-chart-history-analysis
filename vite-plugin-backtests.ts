import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const BACKTESTS_FILE = path.resolve(__dirname, 'data/backtests.json')

function ensureFile() {
  const dir = path.dirname(BACKTESTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(BACKTESTS_FILE)) fs.writeFileSync(BACKTESTS_FILE, '[]', 'utf-8')
}

export function backtestsPlugin(): Plugin {
  return {
    name: 'backtests-api',
    configureServer(server) {
      server.middlewares.use('/api/backtests', (req, res) => {
        ensureFile()

        if (req.method === 'GET') {
          const data = fs.readFileSync(BACKTESTS_FILE, 'utf-8')
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
          return
        }

        if (req.method === 'PUT') {
          let body = ''
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            fs.writeFileSync(BACKTESTS_FILE, body, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end('{"ok":true}')
          })
          return
        }

        res.statusCode = 405
        res.end('Method not allowed')
      })
    },
  }
}
