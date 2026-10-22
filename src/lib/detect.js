// Extensions that mean "this link is a file", not a video page.
const FILE_EXT = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'iso', 'img', 'bin', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'xapk', 'exe', 'msi', 'appimage',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'epub', 'mobi', 'txt', 'csv', 'json', 'xml', 'sql',
  'mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'm4v', 'wmv', 'ts', '3gp',
  'mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'psd',
])

export const KIND_LABEL = { video: 'Video', file: 'File', torrent: 'Torrent' }

export const isMagnet = (v) => /^magnet:\?/i.test(v.trim())

// Posts, reels, stories and profile links all go through yt-dlp's Instagram extractor.
export function isInstagram(input) {
  try {
    const host = new URL((input || '').trim()).hostname.toLowerCase()
    return /(^|\.)instagram\.com$/.test(host) || /(^|\.)instagr\.am$/.test(host)
  } catch {
    return false
  }
}

export function detectKind(input) {
  const v = (input || '').trim()
  if (!v) return null
  if (isMagnet(v)) return 'torrent'
  if (!/^https?:\/\//i.test(v)) return null
  try {
    const url = new URL(v)
    // Instagram pages are media even when the post code looks like a file name.
    if (isInstagram(v) && !/\.(mp4|mov|webm|jpg|jpeg|png|webp|gif)$/i.test(url.pathname)) return 'video'
    const path = url.pathname
    const ext = path.includes('.') ? path.split('.').pop().toLowerCase() : ''
    if (ext === 'torrent') return 'torrent'
    return FILE_EXT.has(ext) ? 'file' : 'video'
  } catch {
    return null
  }
}

export function guessName(input, kind) {
  const v = input.trim()
  try {
    if (isMagnet(v)) {
      const dn = new URLSearchParams(v.slice(v.indexOf('?') + 1)).get('dn')
      return dn || 'Magnet link'
    }
    const u = new URL(v)
    if (kind === 'video' && isInstagram(v)) {
      if (/\/stories\//.test(u.pathname)) return 'Instagram story'
      if (/\/reel[s]?\//.test(u.pathname)) return 'Instagram reel'
      if (/(\/p\/|\/tv\/)/.test(u.pathname)) return 'Instagram post'
      return 'Instagram download'
    }
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '')
    if (kind === 'torrent') return last.replace(/\.torrent$/i, '') || u.hostname
    return last || u.hostname.replace(/^www\./, '')
  } catch {
    return v.slice(0, 60)
  }
}
