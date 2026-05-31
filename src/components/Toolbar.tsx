import {
  MousePointer2,
  Square,
  DoorOpen,
  AppWindow,
  Armchair,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react'
import { useDesignerStore } from '@/stores/useDesignerStore'
import { FURNITURE_TEMPLATES } from '@/types'
import type { ToolType, FurnitureSubType } from '@/types'
import { CollabBinding } from '@/core/CollabBinding'

interface ToolbarProps {
  collabRef: React.MutableRefObject<CollabBinding | null>
}

const TOOLS: { type: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择' },
  { type: 'wall', icon: Square, label: '墙体' },
  { type: 'door', icon: DoorOpen, label: '门' },
  { type: 'window', icon: AppWindow, label: '窗' },
  { type: 'furniture', icon: Armchair, label: '家具' },
  { type: 'eraser', icon: Eraser, label: '删除' },
]

export default function Toolbar({ collabRef }: ToolbarProps) {
  const { tool, setTool, furnitureSubType, setFurnitureSubType } = useDesignerStore()

  const handleUndo = () => {
    const collab = collabRef.current
    if (collab) {
      collab.getDoc().transact(() => {
        try {
          collab.getDoc().undo()
        } catch {
          // no undo stack
        }
      })
    }
  }

  const handleRedo = () => {
    const collab = collabRef.current
    if (collab) {
      collab.getDoc().transact(() => {
        try {
          collab.getDoc().redo()
        } catch {
          // no redo stack
        }
      })
    }
  }

  return (
    <div className="flex flex-col gap-1 p-2 bg-[#1a1d23]/95 backdrop-blur-sm border-r border-[#2a3040]">
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <div key={type}>
          <button
            onClick={() => setTool(type)}
            className={`
              w-10 h-10 flex items-center justify-center rounded-lg
              transition-all duration-200 group relative
              ${tool === type
                ? 'bg-[#00d4aa]/20 text-[#00d4aa] shadow-[0_0_12px_rgba(0,212,170,0.3)]'
                : 'text-[#8899aa] hover:text-[#00d4aa] hover:bg-[#2a3040]'
              }
            `}
            title={label}
          >
            <Icon size={18} strokeWidth={2} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#2a2d35] text-xs text-[#c0c8d4] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {label}
            </span>
          </button>
          {type === 'furniture' && tool === 'furniture' && (
            <div className="ml-1 mt-1 flex flex-col gap-0.5 max-h-60 overflow-y-auto scrollbar-thin">
              {FURNITURE_TEMPLATES.map((t) => (
                <button
                  key={t.subType}
                  onClick={() => setFurnitureSubType(t.subType as FurnitureSubType)}
                  className={`
                    text-xs px-2 py-1 rounded text-left truncate transition-all
                    ${furnitureSubType === t.subType
                      ? 'bg-[#00d4aa]/15 text-[#00d4aa]'
                      : 'text-[#8899aa] hover:text-[#c0c8d4] hover:bg-[#2a3040]'
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="mt-2 border-t border-[#2a3040] pt-2 flex flex-col gap-1">
        <button
          onClick={handleUndo}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8899aa] hover:text-[#00d4aa] hover:bg-[#2a3040] transition-all"
          title="撤销"
        >
          <Undo2 size={18} strokeWidth={2} />
        </button>
        <button
          onClick={handleRedo}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[#8899aa] hover:text-[#00d4aa] hover:bg-[#2a3040] transition-all"
          title="重做"
        >
          <Redo2 size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
