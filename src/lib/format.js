const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(n) {
  if (!n || n <= 0) return '0 B'
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), 4)
  const v = n / 1024 ** i
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${UNITS[i]}`
}

// "10.50MiB" -> bytes
export function parseSize(str) {
  const m = /([\d.]+)\s*([KMGT]?)i?B/i.exec(str || '')
  if (!m) return 0
  const power = { '': 0, K: 1, M: 2, G: 3, T: 4 }[m[2].toUpperCase()]
  return parseFloat(m[1]) * 1024 ** power
}

export function formatEta(s) {
  if (s == null || s < 0 || !isFinite(s)) return ''
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${Math.round(s % 60)}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function basename(p) {
  return (p || '').split('/').pop()
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const KINDS = {
  video: ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', '3gp'],
  audio: ['mp3', 'm4a', 'opus', 'ogg', 'flac', 'wav', 'aac'],
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
}

export function fileKind(name, audioOnly, source) {
  const ext = (name.split('.').pop() || '').toLowerCase()
  for (const [kind, list] of Object.entries(KINDS)) if (list.includes(ext)) return kind
  if (source === 'torrent') return 'torrent'
  if (source === 'file') return 'doc'
  return audioOnly ? 'audio' : 'video'
}
