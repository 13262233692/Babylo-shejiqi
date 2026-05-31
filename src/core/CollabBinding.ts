import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { FloorPlanObject, CollaboratorCursor } from '@/types'
import { useDesignerStore } from '@/stores/useDesignerStore'

export class CollabBinding {
  private doc: Y.Doc
  private provider: WebsocketProvider | null = null
  private objectsMap: Y.Map<Record<string, unknown>>
  private cursorsMap: Y.Map<Record<string, unknown>>
  private userId: string
  private userColor: string
  private userName: string

  constructor(userId: string, userName: string, userColor: string) {
    this.userId = userId
    this.userColor = userColor
    this.userName = userName
    this.doc = new Y.Doc()
    this.objectsMap = this.doc.getMap('objects') as Y.Map<Record<string, unknown>>
    this.cursorsMap = this.doc.getMap('cursors') as Y.Map<Record<string, unknown>>
  }

  connect(roomId: string, wsUrl: string = 'ws://localhost:1234') {
    this.provider = new WebsocketProvider(wsUrl, roomId, this.doc, {
      connect: true,
    })

    this.provider.on('status', (event: { status: string }) => {
      useDesignerStore.getState().setConnected(event.status === 'connected')
    })

    this.objectsMap.observe(() => {
      this.syncObjectsToStore()
    })

    this.cursorsMap.observe(() => {
      this.syncCursorsToStore()
    })

    this.syncObjectsToStore()
    this.syncCursorsToStore()
  }

  private syncObjectsToStore() {
    const objects = new Map<string, FloorPlanObject>()
    this.objectsMap.forEach((value, key) => {
      objects.set(key, value as unknown as FloorPlanObject)
    })
    useDesignerStore.getState().setObjects(objects)
  }

  private syncCursorsToStore() {
    const cursors: CollaboratorCursor[] = []
    this.cursorsMap.forEach((value) => {
      const cursor = value as unknown as CollaboratorCursor
      if (cursor.userId !== this.userId) {
        cursors.push(cursor)
      }
    })
    useDesignerStore.getState().setCollaborators(cursors)
  }

  addObject(obj: FloorPlanObject) {
    this.doc.transact(() => {
      this.objectsMap.set(obj.id, obj as unknown as Record<string, unknown>)
    })
  }

  updateObject(id: string, data: Partial<FloorPlanObject>) {
    const existing = this.objectsMap.get(id) as unknown as FloorPlanObject | undefined
    if (!existing) return
    this.doc.transact(() => {
      this.objectsMap.set(id, { ...existing, ...data } as unknown as Record<string, unknown>)
    })
  }

  removeObject(id: string) {
    this.doc.transact(() => {
      this.objectsMap.delete(id)
    })
  }

  updateCursor(x: number, y: number) {
    this.doc.transact(() => {
      this.cursorsMap.set(this.userId, {
        userId: this.userId,
        name: this.userName,
        color: this.userColor,
        x,
        y,
      } as unknown as Record<string, unknown>)
    })
  }

  getDoc() {
    return this.doc
  }

  getObjectsMap() {
    return this.objectsMap
  }

  destroy() {
    this.cursorsMap.delete(this.userId)
    if (this.provider) {
      this.provider.destroy()
    }
    this.doc.destroy()
  }
}
