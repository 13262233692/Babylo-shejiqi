export interface SunPosition {
  altitude: number
  azimuth: number
  declination: number
  hourAngle: number
}

export interface Location {
  lat: number
  lon: number
  tz: number
  name: string
}

export const PRESET_CITIES: Location[] = [
  { name: '北京', lat: 39.9042, lon: 116.4074, tz: 8 },
  { name: '上海', lat: 31.2304, lon: 121.4737, tz: 8 },
  { name: '广州', lat: 23.1291, lon: 113.2644, tz: 8 },
  { name: '深圳', lat: 22.5431, lon: 114.0579, tz: 8 },
  { name: '成都', lat: 30.5728, lon: 104.0668, tz: 8 },
  { name: '杭州', lat: 30.2741, lon: 120.1551, tz: 8 },
  { name: '武汉', lat: 30.5928, lon: 114.3055, tz: 8 },
  { name: '西安', lat: 34.3416, lon: 108.9398, tz: 8 },
  { name: '重庆', lat: 29.4316, lon: 106.9123, tz: 8 },
  { name: '南京', lat: 32.0603, lon: 118.7969, tz: 8 },
  { name: '东京', lat: 35.6762, lon: 139.6503, tz: 9 },
  { name: '新加坡', lat: 1.3521, lon: 103.8198, tz: 8 },
  { name: '伦敦', lat: 51.5074, lon: -0.1278, tz: 0 },
  { name: '纽约', lat: 40.7128, lon: -74.0060, tz: -5 },
  { name: '巴黎', lat: 48.8566, lon: 2.3522, tz: 1 },
]

function degToRad(deg: number): number {
  return deg * Math.PI / 180
}

function radToDeg(rad: number): number {
  return rad * 180 / Math.PI
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

export function calculateSunPosition(
  location: Location,
  date: Date
): SunPosition {
  const lat = location.lat
  const lon = location.lon
  const tz = location.tz

  const dayOfYear = getDayOfYear(date)

  const declination = -23.45 * Math.cos(degToRad(360 / 365 * (dayOfYear + 10)))

  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const decimalHour = hours + minutes / 60 + seconds / 3600

  const lstm = 15 * tz

  const b = degToRad(360 / 365 * (dayOfYear - 81))
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)

  const tc = 4 * (lon - lstm) + eot

  let lst = decimalHour + tc / 60
  if (lst > 24) lst -= 24
  if (lst < 0) lst += 24

  const hourAngle = 15 * (lst - 12)

  const latRad = degToRad(lat)
  const decRad = degToRad(declination)
  const haRad = degToRad(hourAngle)

  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  const altitude = Math.max(0, radToDeg(Math.asin(sinAltitude)))

  let cosAzimuth =
    (Math.sin(decRad) - Math.sin(latRad) * sinAltitude) /
    (Math.cos(latRad) * Math.cos(Math.asin(sinAltitude)))
  cosAzimuth = Math.max(-1, Math.min(1, cosAzimuth))

  let azimuth = radToDeg(Math.acos(cosAzimuth))
  if (hourAngle > 0) {
    azimuth = 360 - azimuth
  }

  return {
    altitude,
    azimuth,
    declination,
    hourAngle,
  }
}

export function getCurrentSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}

export function isSunriseOrSunset(altitude: number): boolean {
  return altitude > 0 && altitude < 6
}

export function getShadowLength(altitude: number, objectHeight: number): number {
  if (altitude <= 0) return Infinity
  return objectHeight / Math.tan(degToRad(altitude))
}

export function getShadowDirection(azimuth: number): number {
  return (azimuth + 180) % 360
}

export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number)
  return { hours: h, minutes: m }
}
