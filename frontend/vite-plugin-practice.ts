import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const PRACTICE_FILE = path.resolve(__dirname, 'data/practice-sessions.json')

function ensureFile() {
  const dir = path.dirname(PRACTICE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(PRACTICE_FILE)) fs.writeFileSync(PRACTICE_FILE, '[]', 'utf-8')
}

export function practicePlugin(): Plugin {
  return {
    name: 'practice-api',
    configureServer(server) {
      server.middlewares.use('/api/practice', (req, res) => {
        ensureFile()

        if (req.method === 'GET') {
          const data = fs.readFileSync(PRACTICE_FILE, 'utf-8')
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
            fs.writeFileSync(PRACTICE_FILE, body, 'utf-8')
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
