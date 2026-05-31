import {
  Sun,
  MapPin,
  Clock,
  CloudSun,
  SunDim,
  Layers,
  Download,
  X,
  Play,
  Pause,
  Sunrise,
  Sunset,
} from 'lucide-react'
import { useDesignerStore } from '@/stores/useDesignerStore'
import {
  calculateSunPosition,
  PRESET_CITIES,
  formatTime,
  getShadowLength,
  getCurrentSeason,
  isSunriseOrSunset,
  type Location,
} from '@/core/SunCalculator'
import { SceneManager } from '@/core/SceneManager'
import { useEffect, useRef, useState } from 'react'

interface SunAnalysisPanelProps {
  sceneManagerRef: React.MutableRefObject<SceneManager | null>
}

export default function SunAnalysisPanel({ sceneManagerRef }: SunAnalysisPanelProps) {
  const {
    sunAnalysisEnabled,
    setSunAnalysisEnabled,
    showShadowPanel,
    setShowShadowPanel,
    location,
    setLocation,
    analysisDateTime,
    setAnalysisDateTime,
    sunPosition,
    setSunPosition,
    viewMode,
    setViewMode,
  } = useDesignerStore()

  const [isPlaying, setIsPlaying] = useState(false)
  const playIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const pos = calculateSunPosition(location, analysisDateTime)
    setSunPosition(pos)

    const sm = sceneManagerRef.current
    if (sm && (viewMode === 'perspective3d' || viewMode === 'shadowMap' || sunAnalysisEnabled)) {
      sm.updateSunPosition(pos)
    }
  }, [location, analysisDateTime, sceneManagerRef.current])

  useEffect(() => {
    const sm = sceneManagerRef.current
    if (!sm) return

    if (sunAnalysisEnabled && viewMode === 'plan2d') {
      sm.updateSunPosition(sunPosition!)
    } else if (!sunAnalysisEnabled && viewMode === 'plan2d') {
      sm.setViewMode('plan2d')
    }
  }, [sunAnalysisEnabled, viewMode, sunPosition])

  useEffect(() => {
    const sm = sceneManagerRef.current
    if (!sm) return
    sm.setViewMode(viewMode)
    if (sunPosition && (viewMode === 'perspective3d' || viewMode === 'shadowMap')) {
      sm.updateSunPosition(sunPosition)
    }
  }, [viewMode])

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        const newDate = new Date(analysisDateTime.getTime() + 5 * 60 * 1000)
        if (newDate.getDate() !== analysisDateTime.getDate()) {
          newDate.setHours(6, 0, 0, 0)
        }
        setAnalysisDateTime(newDate)
      }, 100)
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [isPlaying, analysisDateTime])

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = PRESET_CITIES.find((c) => c.name === e.target.value)
    if (city) setLocation(city)
  }

  const handleTimeChange = (hours: number, minutes: number) => {
    const newDate = new Date(analysisDateTime)
    newDate.setHours(hours, minutes, 0, 0)
    setAnalysisDateTime(newDate)
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number)
    const newDate = new Date(analysisDateTime)
    newDate.setFullYear(year, month - 1, day)
    setAnalysisDateTime(newDate)
  }

  const handleExportShadow = async () => {
    const sm = sceneManagerRef.current
    if (!sm) return
    const timeStr = formatTime(analysisDateTime)
    const cityStr = location.name
    await sm.exportShadowMap(`shadow-${cityStr}-${timeStr.replace(':', '')}.png`)
  }

  const setPresetTime = (type: 'sunrise' | 'noon' | 'sunset' | 'night') => {
    const newDate = new Date(analysisDateTime)
    if (type === 'sunrise') newDate.setHours(6, 0, 0, 0)
    if (type === 'noon') newDate.setHours(12, 0, 0, 0)
    if (type === 'sunset') newDate.setHours(18, 0, 0, 0)
    if (type === 'night') newDate.setHours(22, 0, 0, 0)
    setAnalysisDateTime(newDate)
  }

  const season = getCurrentSeason(analysisDateTime)
  const seasonLabels: Record<string, string> = {
    spring: '春季',
    summer: '夏季',
    autumn: '秋季',
    winter: '冬季',
  }

  const alt = sunPosition?.altitude ?? 0
  const shadowLen = alt > 0 ? getShadowLength(alt, 2.8).toFixed(2) : '∞'
  const goldenHour = isSunriseOrSunset(alt)

  if (!showShadowPanel) {
    return (
      <button
        onClick={() => setShowShadowPanel(true)}
        className="fixed top-16 right-4 z-50 bg-[#1a1d23]/95 backdrop-blur-sm border border-[#2a3040] rounded-lg px-3 py-2 flex items-center gap-2 text-[#c0c8d4] hover:text-[#00d4aa] hover:border-[#00d4aa]/50 transition-all"
      >
        <Sun size={16} className="text-[#ff8c42]" />
        <span className="text-xs">日光分析</span>
      </button>
    )
  }

  return (
    <div className="fixed top-16 right-4 z-50 w-72 bg-[#1a1d23]/95 backdrop-blur-sm border border-[#2a3040] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-[#2a3040]">
        <div className="flex items-center gap-2">
          <Sun size={16} className="text-[#ff8c42]" />
          <span className="text-sm font-medium text-[#e0e8f0]">日光分析</span>
        </div>
        <button
          onClick={() => setShowShadowPanel(false)}
          className="text-[#667788] hover:text-[#ff8c42] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-3 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-[#8899aa] cursor-pointer">
            <input
              type="checkbox"
              checked={sunAnalysisEnabled}
              onChange={(e) => setSunAnalysisEnabled(e.target.checked)}
              className="accent-[#00d4aa]"
            />
            启用阴影渲染
          </label>
          <span className="text-xs px-2 py-0.5 rounded bg-[#2a3040] text-[#8899aa]">
            {seasonLabels[season]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {(['plan2d', 'perspective3d', 'shadowMap'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-all
                ${viewMode === mode
                  ? 'bg-[#00d4aa]/15 text-[#00d4aa]'
                  : 'text-[#667788] hover:text-[#c0c8d4] hover:bg-[#2a3040]'
                }
              `}
            >
              <Layers size={14} />
              {mode === 'plan2d' ? '2D平面' : mode === 'perspective3d' ? '3D透视' : '阴影图'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1.5 text-xs text-[#8899aa]">
            <MapPin size={12} />
            地理位置
          </label>
          <select
            value={location.name}
            onChange={handleLocationChange}
            className="bg-[#12141a] text-[#c0c8d4] text-sm rounded-lg px-3 py-2 border border-[#2a3040] focus:border-[#00d4aa] outline-none transition-colors"
          >
            {PRESET_CITIES.map((city: Location) => (
              <option key={city.name} value={city.name}>
                {city.name} ({city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°)
              </option>
            ))}
          </select>
          <div className="flex gap-1.5 text-[10px] text-[#4a5568]">
            <span>纬度: {location.lat.toFixed(4)}°</span>
            <span>经度: {location.lon.toFixed(4)}°</span>
            <span>时区: UTC{location.tz >= 0 ? '+' : ''}{location.tz}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-[#8899aa]">
              <Clock size={12} />
              日期时间
            </label>
            <div className="flex gap-1">
              {['sunrise', 'noon', 'sunset', 'night'].map((type) => (
                <button
                  key={type}
                  onClick={() => setPresetTime(type as any)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a3040] text-[#667788] hover:text-[#00d4aa] hover:bg-[#2a3040]/80 transition-colors"
                >
                  {type === 'sunrise' ? <Sunrise size={10} /> : type === 'noon' ? <Sun size={10} /> : type === 'sunset' ? <Sunset size={10} /> : <SunDim size={10} />}
                </button>
              ))}
            </div>
          </div>
          <input
            type="date"
            value={analysisDateTime.toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="bg-[#12141a] text-[#c0c8d4] text-sm rounded-lg px-3 py-2 border border-[#2a3040] focus:border-[#00d4aa] outline-none transition-colors"
          />
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1439}
              value={analysisDateTime.getHours() * 60 + analysisDateTime.getMinutes()}
              onChange={(e) => {
                const total = parseInt(e.target.value)
                handleTimeChange(Math.floor(total / 60), total % 60)
              }}
              className="flex-1 accent-[#ff8c42]"
            />
            <span className="text-xs font-mono text-[#00d4aa] w-12 text-right">
              {formatTime(analysisDateTime)}
            </span>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-7 h-7 flex items-center justify-center rounded ${isPlaying ? 'bg-[#ff8c42] text-white' : 'bg-[#2a3040] text-[#8899aa] hover:text-[#ff8c42]'} transition-colors`}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            </button>
          </div>
        </div>

        <div className="p-3 bg-[#12141a] rounded-lg border border-[#2a3040]">
          <div className="flex items-center gap-2 mb-2">
            <CloudSun size={14} className={goldenHour ? 'text-[#ff8c42]' : 'text-[#4fc3f7]'} />
            <span className="text-xs font-medium text-[#c0c8d4]">太阳位置参数</span>
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <div className="flex justify-between">
              <span className="text-[#667788]">高度角</span>
              <span className={`font-mono ${alt <= 0 ? 'text-[#667788]' : 'text-[#e0e8f0]'}`}>
                {alt.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667788]">方位角</span>
              <span className="font-mono text-[#e0e8f0]">
                {sunPosition?.azimuth.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667788]">赤纬角</span>
              <span className="font-mono text-[#e0e8f0]">
                {sunPosition?.declination.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667788]">时角</span>
              <span className="font-mono text-[#e0e8f0]">
                {sunPosition?.hourAngle.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between col-span-2 pt-1 border-t border-[#2a3040]">
              <span className="text-[#667788]">2.8m墙阴影长</span>
              <span className={`font-mono ${alt <= 0 ? 'text-[#667788]' : 'text-[#ff8c42]'}`}>
                {shadowLen} m
              </span>
            </div>
          </div>
          {goldenHour && (
            <div className="mt-2 text-[10px] text-[#ff8c42] text-center py-1 bg-[#ff8c42]/10 rounded">
              ✨ 黄金时刻 - 柔和长阴影
            </div>
          )}
        </div>

        {viewMode === 'shadowMap' && (
          <button
            onClick={handleExportShadow}
            className="w-full flex items-center justify-center gap-2 bg-[#00d4aa] hover:bg-[#00eabb] text-[#12141a] font-semibold text-sm py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(0,212,170,0.3)]"
          >
            <Download size={14} />
            导出阴影范围图
          </button>
        )}

        <div className="text-[10px] text-[#4a5568] text-center">
          {sunAnalysisEnabled && viewMode !== 'plan2d'
            ? '旋转3D视图查看建筑阴影投射效果'
            : viewMode === 'shadowMap'
            ? '俯视角度查看地面阴影分布'
            : '切换到3D透视或阴影图模式查看实时阴影'}
        </div>
      </div>
    </div>
  )
}
