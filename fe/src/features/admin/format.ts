export const formatNumber = (value: number) => value.toLocaleString('vi-VN')
export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${formatNumber(Math.max(bytes ? 1 : 0, Math.round(bytes / 1024)))} KB`
}
export function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400), hours = Math.floor(seconds % 86400 / 3600), minutes = Math.floor(seconds % 3600 / 60)
  return days ? `${days} ngày ${hours} giờ` : hours ? `${hours} giờ ${minutes} phút` : `${minutes} phút`
}
/** "2026-10-13" → "13/10" (or "T2, 13/10" when long). The value is already a local product day. */
export function formatDay(day: string, long = false) {
  const date = new Date(`${day}T12:00:00Z`)
  const short = `${date.getUTCDate()}/${date.getUTCMonth() + 1}`
  return long ? `${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getUTCDay()]}, ${short}` : short
}
