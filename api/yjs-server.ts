import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import * as Y from 'yjs'
import { setupWSConnection, setPersistence, setContentInitial } from 'y-websocket/bin/utils.js'

const docs = new Map<string, Y.Doc>()

function getYDoc(room: string): Y.Doc {
  if (docs.has(room)) return docs.get(room)!
  const doc = new Y.Doc()
  docs.set(room, doc)
  return doc
}

const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = req.url || '/'
  const room = url.slice(1) || 'default'
  const doc = getYDoc(room)
  setupWSConnection(ws, doc, { doc })
})

const WS_PORT = 1234
server.listen(WS_PORT, () => {
  console.log(`Yjs WebSocket server running on ws://localhost:${WS_PORT}`)
})
