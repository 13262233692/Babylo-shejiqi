import type { FloorPlanObject, WallData, DoorData, WindowData, FurnitureData, FurnitureSubType } from '@/types'
import { WALL_DEFAULT_COLOR, DOOR_DEFAULT_COLOR, WINDOW_DEFAULT_COLOR, FURNITURE_TEMPLATES } from '@/types'

let idCounter = 0

function generateId(): string {
  idCounter++
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 8)}`
}

export class ObjectFactory {
  static createWall(startX: number, startY: number, endX: number, endY: number): WallData {
    return {
      id: generateId(),
      type: 'wall',
      startX: Math.round(startX * 10) / 10,
      startY: Math.round(startY * 10) / 10,
      endX: Math.round(endX * 10) / 10,
      endY: Math.round(endY * 10) / 10,
      thickness: 0.24,
      height: 2.8,
      color: WALL_DEFAULT_COLOR,
    }
  }

  static createDoor(position: number, width: number = 0.9): DoorData {
    return {
      id: generateId(),
      type: 'door',
      wallId: '',
      position,
      width,
      openDirection: 'left',
    }
  }

  static createWindow(position: number, width: number = 1.2): WindowData {
    return {
      id: generateId(),
      type: 'window',
      wallId: '',
      position,
      width,
      height: 1.5,
      sillHeight: 0.9,
    }
  }

  static createFurniture(subType: FurnitureSubType, x: number, y: number): FurnitureData {
    const template = FURNITURE_TEMPLATES.find((t) => t.subType === subType)
    return {
      id: generateId(),
      type: 'furniture',
      subType,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: template?.defaultWidth || 1.0,
      depth: template?.defaultDepth || 1.0,
      rotation: 0,
      color: template?.defaultColor || '#7a6e5d',
    }
  }

  static createFromType(type: FloorPlanObject['type'], x: number, y: number, subType?: FurnitureSubType): FloorPlanObject | null {
    switch (type) {
      case 'wall': {
        return ObjectFactory.createWall(x, y, x + 3, y)
      }
      case 'door': {
        return ObjectFactory.createDoor(x)
      }
      case 'window': {
        return ObjectFactory.createWindow(x)
      }
      case 'furniture': {
        return ObjectFactory.createFurniture(subType || 'bed', x, y)
      }
      default:
        return null
    }
  }
}
