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

// "1.2 GB" + "2.6 GB" -> "1.2 of 2.6 GB" (one unit, as the Vitrine rows show it).
export function rangeText(down, total) {
  if (!total) return down || ''
  if (!down) return total
  const m = /\s([A-Z]+)$/i.exec(down)
  return m && total.toUpperCase().endsWith(m[1].toUpperCase())
    ? `${down.slice(0, -(m[1].length + 1))} of ${total}`
    : `${down} of ${total}`
}

// Bytes of downloads finished since local midnight.
export function finishedTodayBytes(items) {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  return items.reduce(
    (sum, i) => (i.status === 'completed' && i.finishedAt >= midnight.getTime() ? sum + parseSize(i.totalText) : sum),
    0,
  )
}

// Row-sized relative time: "just now", "12m ago", "08:14", "yesterday 22:07", "Oct 20 08:14".
export function whenText(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  const d = new Date(ts)
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (ts >= today.getTime()) return hm
  if (ts >= today.getTime() - 86400000) return `yesterday ${hm}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${hm}`
}

// Group header for the Done list: "Today", "Yesterday", then a compact date.
export function dayLabel(ts) {
  const d = new Date(ts)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(ts)
  day.setHours(0, 0, 0, 0)
  const diff = (today - day) / 86400000
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (d.getFullYear() !== today.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Turn engine stderr into a message that tells the user what to do; unknown errors pass through.
export function friendlyError(msg) {
  const m = String(msg || '')
  const rules = [
    [/unavailable in your region|not available in your region|geo-restricted|country not available/i, 'Not available in your region.'],
    [/private video|this video is private|sign in to confirm your age|age.restricted|members.only/i, 'Private or age-restricted — sign in at the source first.'],
    [/403|forbidden|access denied/i, 'The source refused the download (403) — the link may have expired.'],
    [/404|not found/i, 'Nothing at that address (404) — the link may have expired.'],
    [/no space|enxio|disk full|storage/i, 'Not enough storage space on the device.'],
    [/429|rate limit|too many requests/i, 'The source is rate-limiting requests — wait a minute and retry.'],
    [/network|timed out|connection|econn|unreachable|temporary failure|resolution of/i, 'Network problem — check your connection and retry.'],
    [/unsupported url|not a valid url|unable to extract|no video formats/i, 'That link does not point to a downloadable file.'],
  ]
  for (const [re, text] of rules) if (re.test(m)) return text
  return m
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
