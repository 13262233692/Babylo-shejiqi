import { Wifi, WifiOff, Users } from 'lucide-react'
import { useDesignerStore } from '@/stores/useDesignerStore'

export default function CollabBar() {
  const { connected, roomId, collaborators, userName } = useDesignerStore()

  return (
    <div className="h-10 bg-[#1a1d23]/95 backdrop-blur-sm border-b border-[#2a3040] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-[#00d4aa]">
            ArchCollab
          </span>
          <span className="text-xs text-[#4a5568]">|</span>
          <span className="text-xs text-[#8899aa] font-mono">
            房间: {roomId || '-'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {connected ? (
            <Wifi size={14} className="text-[#00d4aa]" />
          ) : (
            <WifiOff size={14} className="text-[#ff8c42]" />
          )}
          <span className={`text-xs ${connected ? 'text-[#00d4aa]' : 'text-[#ff8c42]'}`}>
            {connected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-[#8899aa]" />
          <span className="text-xs text-[#8899aa]">{collaborators.length + 1} 人在线</span>
        </div>

        <div className="flex items-center gap-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#1a1d23]"
            style={{ backgroundColor: '#00d4aa' }}
          >
            {(userName || '你')[0]}
          </div>
          {collaborators.map((c) => (
            <div
              key={c.userId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#1a1d23]"
              style={{ backgroundColor: c.color }}
              title={c.name}
            >
              {c.name[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
