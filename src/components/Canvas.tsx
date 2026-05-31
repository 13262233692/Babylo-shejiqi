import { useEffect, useRef } from 'react'
import { SceneManager } from '@/core/SceneManager'
import { CollabBinding } from '@/core/CollabBinding'
import { ObjectFactory } from '@/core/ObjectFactory'
import { useDesignerStore } from '@/stores/useDesignerStore'
import type { FloorPlanObject } from '@/types'

const POSITION_PRECISION = 100

function roundToCm(value: number): number {
  return Math.round(value * POSITION_PRECISION) / POSITION_PRECISION
}

interface CanvasProps {
  sceneManagerRef: React.MutableRefObject<SceneManager | null>
  collabRef: React.MutableRefObject<CollabBinding | null>
}

export default function Canvas({ sceneManagerRef, collabRef }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wallStartRef = useRef<{ x: number; y: number } | null>(null)

  const draggingObjectIdRef = useRef<string | null>(null)
  const dragStartPositionsRef = useRef<Map<string, any>>(new Map())

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
        const doorObj = ObjectFactory.createDoor(roundToCm(pos.x))
        collab.addObject(doorObj)
        sm.addObjectToScene(doorObj)
        return
      }

      if (tool === 'window') {
        const winObj = ObjectFactory.createWindow(roundToCm(pos.x))
        collab.addObject(winObj)
        sm.addObjectToScene(winObj)
        return
      }

      if (tool === 'furniture') {
        const furnObj = ObjectFactory.createFurniture(
          furnitureSubType,
          roundToCm(pos.x),
          roundToCm(pos.y)
        )
        collab.addObject(furnObj)
        sm.addObjectToScene(furnObj)
        return
      }
    })

    sm.onSceneDrag.add((delta) => {
      if (tool !== 'select' || !selectedObjectId) return

      const store = useDesignerStore.getState()
      const obj = store.objects.get(selectedObjectId)
      if (!obj) return

      if (!draggingObjectIdRef.current) {
        draggingObjectIdRef.current = selectedObjectId
        dragStartPositionsRef.current.set(selectedObjectId, {
          type: obj.type,
          data: JSON.parse(JSON.stringify(obj)),
        })
      }

      sm.updateObjectPosition(selectedObjectId, delta.x, delta.y)
    })

    const handlePointerUp = () => {
      const draggingId = draggingObjectIdRef.current
      if (!draggingId) return

      const store = useDesignerStore.getState()
      const startData = dragStartPositionsRef.current.get(draggingId)
      const currentObj = store.objects.get(draggingId)

      if (startData && currentObj) {
        const sm = sceneManagerRef.current
        const entry = sm?.objectMeshes.get(draggingId)
        if (entry) {
          const mesh = entry.mesh

          if (currentObj.type === 'furniture') {
            const newX = roundToCm(mesh.position.x)
            const newY = roundToCm(mesh.position.y)
            const oldX = roundToCm((currentObj as any).x)
            const oldY = roundToCm((currentObj as any).y)
            if (newX !== oldX || newY !== oldY) {
              collab.updateObject(draggingId, { x: newX, y: newY })
            }
          } else if (currentObj.type === 'wall') {
            const wall = currentObj as any
            const dx = mesh.position.x - (wall.startX + wall.endX) / 2
            const dy = mesh.position.y - (wall.startY + wall.endY) / 2
            const newStartX = roundToCm(wall.startX + dx)
            const newStartY = roundToCm(wall.startY + dy)
            const newEndX = roundToCm(wall.endX + dx)
            const newEndY = roundToCm(wall.endY + dy)
            const oldStartX = roundToCm(wall.startX)
            const oldStartY = roundToCm(wall.startY)
            const oldEndX = roundToCm(wall.endX)
            const oldEndY = roundToCm(wall.endY)
            if (
              newStartX !== oldStartX ||
              newStartY !== oldStartY ||
              newEndX !== oldEndX ||
              newEndY !== oldEndY
            ) {
              collab.updateObject(draggingId, {
                startX: newStartX,
                startY: newStartY,
                endX: newEndX,
                endY: newEndY,
              })
            }
          } else {
            const newPos = roundToCm(mesh.position.x)
            const oldPos = roundToCm((currentObj as any).position)
            if (newPos !== oldPos) {
              collab.updateObject(draggingId, { position: newPos })
            }
          }
        }
      }

      draggingObjectIdRef.current = null
      dragStartPositionsRef.current.delete(draggingId)
    }

    const canvasEl = canvasRef.current
    canvasEl.addEventListener('pointerup', handlePointerUp)
    canvasEl.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvasEl.removeEventListener('pointerup', handlePointerUp)
      canvasEl.removeEventListener('pointerleave', handlePointerUp)
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

    const onObjectsChange = (state: ReturnType<typeof useDesignerStore.getState>) => {
      const objects = state.objects
      const sm = sceneManagerRef.current
      if (!sm) return

      const currentIds = new Set<string>()
      objects.forEach((obj, id) => {
        currentIds.add(id)
        if (draggingObjectIdRef.current !== id) {
          sm.addObjectToScene(obj)
        }
      })

      sm.getObjectIds().forEach((id) => {
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
