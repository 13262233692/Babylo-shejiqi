import { useState } from 'react'
import { LogIn, Users } from 'lucide-react'
import { useDesignerStore } from '@/stores/useDesignerStore'

export default function JoinRoom() {
  const [inputRoom, setInputRoom] = useState('')
  const [inputName, setInputName] = useState('')
  const { setRoomId, setUserName, setJoined } = useDesignerStore()

  const handleJoin = () => {
    const room = inputRoom.trim() || `room-${Math.random().toString(36).substring(2, 6)}`
    const name = inputName.trim() || '匿名用户'
    setRoomId(room)
    setUserName(name)
    setJoined(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin()
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#12141a]">
      <div className="w-[420px] bg-[#1a1d23] border border-[#2a3040] rounded-2xl p-8 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#00d4aa]/10 flex items-center justify-center">
            <Users size={22} className="text-[#00d4aa]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e0e8f0] tracking-wide">ArchCollab</h1>
            <p className="text-xs text-[#667788]">实时协作建筑平面图设计器</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-[#8899aa] mb-1.5">用户名</label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的名字"
              className="w-full bg-[#12141a] text-[#c0c8d4] text-sm rounded-lg px-3 py-2.5 border border-[#2a3040] focus:border-[#00d4aa] outline-none transition-colors placeholder:text-[#4a5568]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8899aa] mb-1.5">房间号</label>
            <input
              type="text"
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入房间号加入，或留空创建新房间"
              className="w-full bg-[#12141a] text-[#c0c8d4] text-sm rounded-lg px-3 py-2.5 border border-[#2a3040] focus:border-[#00d4aa] outline-none transition-colors placeholder:text-[#4a5568]"
            />
          </div>

          <button
            onClick={handleJoin}
            className="mt-2 w-full flex items-center justify-center gap-2 bg-[#00d4aa] hover:bg-[#00eabb] text-[#12141a] font-semibold text-sm py-2.5 rounded-lg transition-all shadow-[0_0_20px_rgba(0,212,170,0.3)] hover:shadow-[0_0_30px_rgba(0,212,170,0.5)]"
          >
            <LogIn size={16} />
            加入房间
          </button>

          <p className="text-xs text-[#4a5568] text-center mt-2">
            支持多人实时协作，所有操作自动同步
          </p>
        </div>
      </div>
    </div>
  )
}
