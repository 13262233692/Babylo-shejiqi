import { useRef } from 'react'
import { useDesignerStore } from '@/stores/useDesignerStore'
import Canvas from '@/components/Canvas'
import Toolbar from '@/components/Toolbar'
import PropertyPanel from '@/components/PropertyPanel'
import CollabBar from '@/components/CollabBar'
import JoinRoom from '@/components/JoinRoom'
import SunAnalysisPanel from '@/components/SunAnalysisPanel'
import { SceneManager } from '@/core/SceneManager'
import { CollabBinding } from '@/core/CollabBinding'

export default function Home() {
  const { joined, tool, sunAnalysisEnabled, viewMode } = useDesignerStore()
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const collabRef = useRef<CollabBinding | null>(null)

  if (!joined) {
    return <JoinRoom />
  }

  const toolCursors: Record<string, string> = {
    select: 'default',
    wall: 'crosshair',
    door: 'crosshair',
    window: 'crosshair',
    furniture: 'crosshair',
    eraser: 'pointer',
  }

  return (
    <div className="w-full h-screen flex flex-col bg-[#12141a] overflow-hidden" style={{ cursor: toolCursors[tool] || 'default' }}>
      <CollabBar />
      <div className="flex-1 flex overflow-hidden">
        <Toolbar collabRef={collabRef} />
        <div className="flex-1 relative">
          <Canvas sceneManagerRef={sceneManagerRef} collabRef={collabRef} />
          <div className="absolute bottom-4 left-4 bg-[#1a1d23]/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-[#667788] border border-[#2a3040]">
            {tool === 'wall' && '点击画布设置墙体起点，再次点击设置终点'}
            {tool === 'select' && (viewMode === 'plan2d' ? '点击选中物体，拖拽移动' : '鼠标拖拽旋转视图')}
            {tool === 'door' && '点击画布放置门'}
            {tool === 'window' && '点击画布放置窗'}
            {tool === 'furniture' && '点击画布放置家具'}
            {tool === 'eraser' && '点击物体删除'}
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-[#1a1d23]/80 backdrop-blur-sm rounded-lg border border-[#2a3040]">
              <span className="text-[10px] text-[#667788]">视图:</span>
              <span className="text-xs text-[#00d4aa] font-mono">
                {viewMode === 'plan2d' ? '2D' : viewMode === 'perspective3d' ? '3D' : '阴影'}
              </span>
              {sunAnalysisEnabled && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#ff8c42]/20 text-[#ff8c42] rounded">
                  阴影
                </span>
              )}
            </div>
            <button
              onClick={() => {
                const sm = sceneManagerRef.current
                if (sm) {
                  sm.getEngine().resize()
                }
              }}
              className="bg-[#1a1d23]/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-[#667788] border border-[#2a3040] hover:text-[#00d4aa] hover:border-[#00d4aa]/50 transition-all"
            >
              重置视图
            </button>
          </div>
          <SunAnalysisPanel sceneManagerRef={sceneManagerRef} />
        </div>
        <PropertyPanel collabRef={collabRef} />
      </div>
    </div>
  )
}
