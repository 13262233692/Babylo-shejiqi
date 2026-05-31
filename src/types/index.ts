export interface WallData {
  id: string
  type: 'wall'
  startX: number
  startY: number
  endX: number
  endY: number
  thickness: number
  height: number
  color: string
}

export interface DoorData {
  id: string
  type: 'door'
  wallId: string
  position: number
  width: number
  openDirection: 'left' | 'right'
}

export interface WindowData {
  id: string
  type: 'window'
  wallId: string
  position: number
  width: number
  height: number
  sillHeight: number
}

export type FurnitureSubType =
  | 'bed'
  | 'table'
  | 'chair'
  | 'sofa'
  | 'desk'
  | 'cabinet'
  | 'bathtub'
  | 'toilet'
  | 'sink'
  | 'stove'

export interface FurnitureData {
  id: string
  type: 'furniture'
  subType: FurnitureSubType
  x: number
  y: number
  width: number
  depth: number
  rotation: number
  color: string
}

export type FloorPlanObject = WallData | DoorData | WindowData | FurnitureData

export interface CollaboratorCursor {
  userId: string
  name: string
  color: string
  x: number
  y: number
}

export type ToolType = 'select' | 'wall' | 'door' | 'window' | 'furniture' | 'eraser'

export interface FurnitureTemplate {
  subType: FurnitureSubType
  label: string
  defaultWidth: number
  defaultDepth: number
  defaultColor: string
}

export const FURNITURE_TEMPLATES: FurnitureTemplate[] = [
  { subType: 'bed', label: '床', defaultWidth: 2.0, defaultDepth: 1.8, defaultColor: '#6b8fb5' },
  { subType: 'table', label: '餐桌', defaultWidth: 1.2, defaultDepth: 0.8, defaultColor: '#a0855b' },
  { subType: 'chair', label: '椅子', defaultWidth: 0.5, defaultDepth: 0.5, defaultColor: '#8b7355' },
  { subType: 'sofa', label: '沙发', defaultWidth: 2.2, defaultDepth: 0.9, defaultColor: '#7a6e5d' },
  { subType: 'desk', label: '书桌', defaultWidth: 1.4, defaultDepth: 0.7, defaultColor: '#9e8c6c' },
  { subType: 'cabinet', label: '柜子', defaultWidth: 1.0, defaultDepth: 0.5, defaultColor: '#6d5d4b' },
  { subType: 'bathtub', label: '浴缸', defaultWidth: 1.7, defaultDepth: 0.8, defaultColor: '#e0e0e0' },
  { subType: 'toilet', label: '马桶', defaultWidth: 0.4, defaultDepth: 0.7, defaultColor: '#f0f0f0' },
  { subType: 'sink', label: '洗手台', defaultWidth: 0.6, defaultDepth: 0.5, defaultColor: '#d4d4d4' },
  { subType: 'stove', label: '灶台', defaultWidth: 0.8, defaultDepth: 0.6, defaultColor: '#333333' },
]

export const WALL_DEFAULT_COLOR = '#e8e8e8'
export const DOOR_DEFAULT_COLOR = '#8b6914'
export const WINDOW_DEFAULT_COLOR = '#4fc3f7'
