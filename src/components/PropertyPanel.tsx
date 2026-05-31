import { X, Move, RotateCw, Palette } from 'lucide-react'
import { useDesignerStore } from '@/stores/useDesignerStore'
import { CollabBinding } from '@/core/CollabBinding'
import type { FloorPlanObject, WallData, DoorData, WindowData, FurnitureData } from '@/types'

const POSITION_PRECISION = 100

function roundToCm(value: number): number {
  return Math.round(value * POSITION_PRECISION) / POSITION_PRECISION
}

const POSITION_FIELDS = new Set([
  'startX', 'startY', 'endX', 'endY',
  'position', 'x', 'y',
])

interface PropertyPanelProps {
  collabRef: React.MutableRefObject<CollabBinding | null>
}

export default function PropertyPanel({ collabRef }: PropertyPanelProps) {
  const { selectedObjectId, objects, setSelectedObjectId } = useDesignerStore()

  if (!selectedObjectId) return null

  const obj = objects.get(selectedObjectId)
  if (!obj) return null

  const collab = collabRef.current

  const handleChange = (field: string, value: number | string) => {
    if (!collab) return

    const finalValue =
      typeof value === 'number' && POSITION_FIELDS.has(field)
        ? roundToCm(value)
        : value

    collab.updateObject(selectedObjectId, { [field]: finalValue })
  }

  const handleClose = () => {
    setSelectedObjectId(null)
  }

  const renderWallProps = (wall: WallData) => (
    <>
      <PropRow label="起点 X" value={wall.startX} field="startX" onChange={handleChange} step={0.1} />
      <PropRow label="起点 Y" value={wall.startY} field="startY" onChange={handleChange} step={0.1} />
      <PropRow label="终点 X" value={wall.endX} field="endX" onChange={handleChange} step={0.1} />
      <PropRow label="终点 Y" value={wall.endY} field="endY" onChange={handleChange} step={0.1} />
      <PropRow label="厚度" value={wall.thickness} field="thickness" onChange={handleChange} step={0.01} min={0.05} max={1} />
      <PropRow label="高度" value={wall.height} field="height" onChange={handleChange} step={0.1} min={0.5} max={10} />
      <ColorRow label="颜色" value={wall.color} field="color" onChange={handleChange} />
    </>
  )

  const renderDoorProps = (door: DoorData) => (
    <>
      <PropRow label="位置" value={door.position} field="position" onChange={handleChange} step={0.1} />
      <PropRow label="宽度" value={door.width} field="width" onChange={handleChange} step={0.05} min={0.4} max={3} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8899aa]">开向</span>
        <select
          value={door.openDirection}
          onChange={(e) => handleChange('openDirection', e.target.value)}
          className="bg-[#2a3040] text-[#c0c8d4] text-xs rounded px-2 py-1 border border-[#3a4555] focus:border-[#00d4aa] outline-none"
        >
          <option value="left">左开</option>
          <option value="right">右开</option>
        </select>
      </div>
    </>
  )

  const renderWindowProps = (win: WindowData) => (
    <>
      <PropRow label="位置" value={win.position} field="position" onChange={handleChange} step={0.1} />
      <PropRow label="宽度" value={win.width} field="width" onChange={handleChange} step={0.05} min={0.3} max={4} />
      <PropRow label="高度" value={win.height} field="height" onChange={handleChange} step={0.1} min={0.3} max={3} />
      <PropRow label="窗台高" value={win.sillHeight} field="sillHeight" onChange={handleChange} step={0.1} min={0} max={2} />
    </>
  )

  const renderFurnitureProps = (furn: FurnitureData) => (
    <>
      <PropRow label="X" value={furn.x} field="x" onChange={handleChange} step={0.1} />
      <PropRow label="Y" value={furn.y} field="y" onChange={handleChange} step={0.1} />
      <PropRow label="宽度" value={furn.width} field="width" onChange={handleChange} step={0.05} min={0.1} max={10} />
      <PropRow label="深度" value={furn.depth} field="depth" onChange={handleChange} step={0.05} min={0.1} max={10} />
      <PropRow label="旋转" value={furn.rotation} field="rotation" onChange={handleChange} step={0.1} min={0} max={6.28} />
      <ColorRow label="颜色" value={furn.color} field="color" onChange={handleChange} />
    </>
  )

  const typeLabels: Record<string, string> = {
    wall: '墙体',
    door: '门',
    window: '窗',
    furniture: '家具',
  }

  return (
    <div className="w-64 bg-[#1a1d23]/95 backdrop-blur-sm border-l border-[#2a3040] flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-[#2a3040]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00d4aa]" />
          <span className="text-sm font-medium text-[#c0c8d4]">
            {typeLabels[obj.type] || obj.type}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="text-[#667788] hover:text-[#ff8c42] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3 overflow-y-auto">
        <div className="text-xs text-[#667788] font-mono">
          ID: {selectedObjectId.substring(0, 12)}...
        </div>

        {obj.type === 'wall' && renderWallProps(obj as WallData)}
        {obj.type === 'door' && renderDoorProps(obj as DoorData)}
        {obj.type === 'window' && renderWindowProps(obj as WindowData)}
        {obj.type === 'furniture' && renderFurnitureProps(obj as FurnitureData)}
      </div>
    </div>
  )
}

interface PropRowProps {
  label: string
  value: number
  field: string
  onChange: (field: string, value: number | string) => void
  step?: number
  min?: number
  max?: number
}

function PropRow({ label, value, field, onChange, step = 0.1, min, max }: PropRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#8899aa] whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="range"
          value={value}
          min={min ?? -50}
          max={max ?? 50}
          step={step}
          onChange={(e) => onChange(field, parseFloat(e.target.value))}
          className="w-20 h-1 accent-[#00d4aa]"
        />
        <input
          type="number"
          value={Math.round(value * 100) / 100}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
          className="w-16 bg-[#2a3040] text-[#c0c8d4] text-xs text-right rounded px-1.5 py-0.5 border border-[#3a4555] focus:border-[#00d4aa] outline-none font-mono"
        />
      </div>
    </div>
  )
}

interface ColorRowProps {
  label: string
  value: string
  field: string
  onChange: (field: string, value: number | string) => void
}

function ColorRow({ label, value, field, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[#8899aa]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-[#3a4555]"
        />
        <span className="text-xs text-[#667788] font-mono">{value}</span>
      </div>
    </div>
  )
}
