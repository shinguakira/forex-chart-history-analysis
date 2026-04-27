import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const NOTES_FILE = path.resolve(__dirname, 'data/notes.json')

function ensureFile() {
  const dir = path.dirname(NOTES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, '[]', 'utf-8')
}

export function notesPlugin(): Plugin {
  return {
    name: 'notes-api',
    configureServer(server) {
      server.middlewares.use('/api/notes', (req, res) => {
        ensureFile()

        if (req.method === 'GET') {
          const data = fs.readFileSync(NOTES_FILE, 'utf-8')
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
            fs.writeFileSync(NOTES_FILE, body, 'utf-8')
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
