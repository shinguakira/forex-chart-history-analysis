import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const PREDICTIONS_FILE = path.resolve(__dirname, 'data/predictions.json')

function ensureFile() {
  const dir = path.dirname(PREDICTIONS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(PREDICTIONS_FILE)) fs.writeFileSync(PREDICTIONS_FILE, '[]', 'utf-8')
}

export function predictionsPlugin(): Plugin {
  return {
    name: 'predictions-api',
    configureServer(server) {
      server.middlewares.use('/api/predictions', (req, res) => {
        ensureFile()

        if (req.method === 'GET') {
          const data = fs.readFileSync(PREDICTIONS_FILE, 'utf-8')
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
            fs.writeFileSync(PREDICTIONS_FILE, body, 'utf-8')
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
