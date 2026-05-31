import { useEffect, useRef } from 'react'
import { SceneManager } from '@/core/SceneManager'
import { CollabBinding } from '@/core/CollabBinding'
import { ObjectFactory } from '@/core/ObjectFactory'
import { useDesignerStore } from '@/stores/useDesignerStore'
import type { FloorPlanObject } from '@/types'

interface CanvasProps {
  sceneManagerRef: React.MutableRefObject<SceneManager | null>
  collabRef: React.MutableRefObject<CollabBinding | null>
}

export default function Canvas({ sceneManagerRef, collabRef }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wallStartRef = useRef<{ x: number; y: number } | null>(null)
  const { tool, furnitureSubType, selectedObjectId, joined, roomId, userName } = useDesignerStore()

  useEffect(() => {
    if (!canvasRef.current) return

    const sm = new SceneManager(canvasRef.current)
    sceneManagerRef.current = sm

    const userId = `user-${Math.random().toString(36).substring(2, 8)}`
    const colors = ['#00d4aa', '#ff8c42', '#e91e63', '#7c4dff', '#00bcd4', '#ff5722', '#8bc34a']
    const userColor = colors[Math.floor(Math.random() * colors.length)]

    const collab = new CollabBinding(userId, userName || '匿名用户', userColor)
    collabRef.current = collab

    sm.onObjectPicked.add((eventData) => {
      if (eventData) {
        useDesignerStore.getState().setSelectedObjectId(eventData.id)
      } else {
        useDesignerStore.getState().setSelectedObjectId(null)
      }
    })

    sm.onSceneClick.add((pos) => {
      if (tool === 'select') return

      if (tool === 'eraser' && selectedObjectId) {
        collab.removeObject(selectedObjectId)
        sm.removeObjectFromScene(selectedObjectId)
        useDesignerStore.getState().setSelectedObjectId(null)
        return
      }

      if (tool === 'wall') {
        if (!wallStartRef.current) {
          wallStartRef.current = { x: pos.x, y: pos.y }
        } else {
          const wallObj = ObjectFactory.createWall(
            wallStartRef.current.x,
            wallStartRef.current.y,
            pos.x,
            pos.y
          )
          collab.addObject(wallObj)
          sm.addObjectToScene(wallObj)
          wallStartRef.current = null
        }
        return
      }

      if (tool === 'door') {
        const doorObj = ObjectFactory.createDoor(pos.x)
        collab.addObject(doorObj)
        sm.addObjectToScene(doorObj)
        return
      }

      if (tool === 'window') {
        const winObj = ObjectFactory.createWindow(pos.x)
        collab.addObject(winObj)
        sm.addObjectToScene(winObj)
        return
      }

      if (tool === 'furniture') {
        const furnObj = ObjectFactory.createFurniture(furnitureSubType, pos.x, pos.y)
        collab.addObject(furnObj)
        sm.addObjectToScene(furnObj)
        return
      }
    })

    sm.onSceneDrag.add((delta) => {
      if (tool === 'select' && selectedObjectId) {
        sm.updateObjectPosition(selectedObjectId, delta.x, delta.y)

        const store = useDesignerStore.getState()
        const obj = store.objects.get(selectedObjectId)
        if (obj) {
          if (obj.type === 'furniture') {
            collab.updateObject(selectedObjectId, {
              x: (obj as any).x + delta.x,
              y: (obj as any).y + delta.y,
            })
          } else if (obj.type === 'wall') {
            collab.updateObject(selectedObjectId, {
              startX: (obj as any).startX + delta.x,
              startY: (obj as any).startY + delta.y,
              endX: (obj as any).endX + delta.x,
              endY: (obj as any).endY + delta.y,
            })
          } else {
            collab.updateObject(selectedObjectId, {
              position: (obj as any).position + delta.x,
            })
          }
        }
      }
    })

    return () => {
      sm.dispose()
      collab.destroy()
      sceneManagerRef.current = null
      collabRef.current = null
    }
  }, [])

  useEffect(() => {
    const sm = sceneManagerRef.current
    if (!sm) return
    if (selectedObjectId) {
      sm.highlightObject(selectedObjectId)
    } else {
      sm.clearHighlights()
    }
  }, [selectedObjectId])

  useEffect(() => {
    const collab = collabRef.current
    if (!collab || !joined || !roomId) return

    collab.connect(roomId)

    const objects = useDesignerStore.getState().objects
    objects.forEach((obj) => {
      sceneManagerRef.current?.addObjectToScene(obj)
    })

    const interval = setInterval(() => {
      const sm = sceneManagerRef.current
      if (sm) {
        const pickResult = sm.getScene().pick(
          sm.getScene().pointerX,
          sm.getScene().pointerY
        )
        if (pickResult?.pickedPoint) {
          collab.updateCursor(pickResult.pickedPoint.x, pickResult.pickedPoint.z)
        }
      }
    }, 100)

    return () => {
      clearInterval(interval)
    }
  }, [joined, roomId])

  useEffect(() => {
    const collab = collabRef.current
    if (!collab) return

    const onObjectsChange = () => {
      const objects = useDesignerStore.getState().objects
      const sm = sceneManagerRef.current
      if (!sm) return

      const currentIds = new Set<string>()
      objects.forEach((obj, id) => {
        currentIds.add(id)
        sm.addObjectToScene(obj)
      })

      sm.objectMeshes.forEach((_, id) => {
        if (!currentIds.has(id)) {
          sm.removeObjectFromScene(id)
        }
      })
    }

    const unsub = useDesignerStore.subscribe(onObjectsChange)
    return unsub
  }, [collabRef.current])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full outline-none"
      style={{ touchAction: 'none' }}
    />
  )
}
