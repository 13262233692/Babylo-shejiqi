import { create } from 'zustand'
import type { FloorPlanObject, ToolType, CollaboratorCursor, FurnitureSubType } from '@/types'
import type { ViewMode } from '@/core/SceneManager'
import type { SunPosition, Location } from '@/core/SunCalculator'
import { PRESET_CITIES } from '@/core/SunCalculator'

interface DesignerState {
  tool: ToolType
  setTool: (tool: ToolType) => void
  furnitureSubType: FurnitureSubType
  setFurnitureSubType: (subType: FurnitureSubType) => void
  selectedObjectId: string | null
  setSelectedObjectId: (id: string | null) => void
  objects: Map<string, FloorPlanObject>
  setObjects: (objects: Map<string, FloorPlanObject>) => void
  updateObject: (id: string, data: Partial<FloorPlanObject>) => void
  removeObject: (id: string) => void
  collaborators: CollaboratorCursor[]
  setCollaborators: (cursors: CollaboratorCursor[]) => void
  connected: boolean
  setConnected: (v: boolean) => void
  roomId: string | null
  setRoomId: (id: string | null) => void
  joined: boolean
  setJoined: (v: boolean) => void
  userName: string
  setUserName: (v: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  sunPosition: SunPosition | null
  setSunPosition: (pos: SunPosition | null) => void
  location: Location
  setLocation: (loc: Location) => void
  analysisDateTime: Date
  setAnalysisDateTime: (date: Date) => void
  sunAnalysisEnabled: boolean
  setSunAnalysisEnabled: (v: boolean) => void
  showShadowPanel: boolean
  setShowShadowPanel: (v: boolean) => void
}

export const useDesignerStore = create<DesignerState>((set) => ({
  tool: 'select',
  setTool: (tool) => set({ tool }),
  furnitureSubType: 'bed',
  setFurnitureSubType: (subType) => set({ furnitureSubType: subType }),
  selectedObjectId: null,
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  objects: new Map(),
  setObjects: (objects) => set({ objects }),
  updateObject: (id, data) =>
    set((state) => {
      const newMap = new Map(state.objects)
      const existing = newMap.get(id)
      if (existing) {
        newMap.set(id, { ...existing, ...data } as FloorPlanObject)
      }
      return { objects: newMap }
    }),
  removeObject: (id) =>
    set((state) => {
      const newMap = new Map(state.objects)
      newMap.delete(id)
      return { objects: newMap, selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId }
    }),
  collaborators: [],
  setCollaborators: (cursors) => set({ collaborators: cursors }),
  connected: false,
  setConnected: (v) => set({ connected: v }),
  roomId: null,
  setRoomId: (id) => set({ roomId: id }),
  joined: false,
  setJoined: (v) => set({ joined: v }),
  userName: '',
  setUserName: (v) => set({ userName: v }),
  viewMode: 'plan2d',
  setViewMode: (mode) => set({ viewMode: mode }),
  sunPosition: null,
  setSunPosition: (pos) => set({ sunPosition: pos }),
  location: PRESET_CITIES[0],
  setLocation: (loc) => set({ location: loc }),
  analysisDateTime: new Date(),
  setAnalysisDateTime: (date) => set({ analysisDateTime: date }),
  sunAnalysisEnabled: false,
  setSunAnalysisEnabled: (v) => set({ sunAnalysisEnabled: v }),
  showShadowPanel: false,
  setShowShadowPanel: (v) => set({ showShadowPanel: v }),
}))
