import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import * as Y from 'yjs'
import * as map from 'lib0/map'

const docs = new Map<string, Y.Doc>()

function getYDoc(room: string): Y.Doc {
  return map.setIfUndefined(docs, room, () => {
    const doc = new Y.Doc()
    return doc
  })
}

const pingTimeout = 30000

function setupWSConnection(ws: any, doc: Y.Doc) {
  const observer = (update: Uint8Array, origin: any) => {
    if (origin !== ws) {
      ws.send(update)
    }
  }

  doc.on('update', observer)

  const docState = Y.encodeStateAsUpdate(doc)
  if (docState.length > 1) {
    ws.send(docState)
  }

  ws.on('message', (message: Buffer) => {
    try {
      Y.applyUpdate(doc, new Uint8Array(message), ws)
    } catch (e) {
      console.error('Error applying update:', e)
    }
  })

  ws.on('close', () => {
    doc.off('update', observer)
  })
}

const server = createServer()
const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = req.url || '/'
  const room = url.slice(1) || 'default'
  const doc = getYDoc(room)
  setupWSConnection(ws, doc)
})

const WS_PORT = 1234
server.listen(WS_PORT, () => {
  console.log(`Yjs WebSocket server running on ws://localhost:${WS_PORT}`)
})
