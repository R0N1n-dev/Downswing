import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { Network } from '@capacitor/network'
import { YtDlp } from '../services/ytdlp'
import { Aria2 } from '../services/aria2'
import { Downly } from '../services/downly'
import { showToast } from '../lib/toast'
import { notify } from '../services/notify'
import { useSettingsStore } from './settings'
import { formatFor } from '../lib/options'
import { formatBytes, formatEta, parseSize, basename, hostOf } from '../lib/format'

const KEY = 'downly.downloads'
const LIVE = ['downloading']
let counter = 0

const RE_STAT = /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\s*[KMGT]?i?B)(?:\s+at\s+([\d.]+\s*[KMGT]?i?B\/s))?/
const RE_DEST = /\[download\] Destination: (.+)$/
const RE_MERGE = /\[Merger\] Merging formats into "(.+)"/
const RE_AUDIO = /\[ExtractAudio\] Destination: (.+)$/
const RE_FORMATS = /Downloading \d+ format\(s\): (\S+)/

// yt-dlp errors arrive as a wall of stderr. Keep the ERROR line.
function tidy(msg) {
  const m = /ERROR:[^\n]*/.exec(msg || '')
  return (m ? m[0] : msg || 'Download failed').slice(0, 300)
}

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    // A download that was running when the app died is resumable, not running.
    return list.map((i) => ({ kind: 'video', peers: '', ...i, ...(LIVE.includes(i.status) ? { status: 'paused', speed: '', eta: '' } : {}) }))
  } catch {
    return []
  }
}

export const useDownloadsStore = defineStore('downloads', () => {
  const items = ref(load())
  const settings = useSettingsStore().s
  let listening = false
  let saveTimer

  const engineOf = (item) => (item.kind === 'file' || item.kind === 'torrent' ? Aria2 : YtDlp)
  const byId = (id) => items.value.find((i) => i.id === id)
  const byJob = (jobId) => items.value.find((i) => i.jobId === jobId)

  function save() {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const clean = items.value.map((i) => Object.fromEntries(Object.entries(i).filter(([k]) => !k.startsWith('_'))))
      try { localStorage.setItem(KEY, JSON.stringify(clean)) } catch { /* storage full */ }
    }, 800)
  }
  watch(items, save, { deep: true })

  // Tell the native side how much work is pending so the foreground service outlives the screen.
  watch(
    () => items.value.filter((i) => i.status === 'queued' || i.status === 'downloading').length,
    (count) => Downly.setPending({ count }).catch(() => {}),
    { immediate: true },
  )

  function fail(item, message) {
    item.status = 'error'
    item.jobId = null
    item.speed = ''
    item.eta = ''
    item.error = /not implemented/i.test(message) ? 'Downloads only work in the Android app.' : tidy(message)
    if (settings.notifyFail) notify('Download failed', `${item.name}: ${item.error}`)
    pump()
  }

  function complete(item, path, name) {
    item.status = 'completed'
    item.progress = 100
    item.jobId = null
    item.speed = ''
    item.eta = ''
    item.peers = ''
    item.finishedAt = Date.now()
    if (name) item.name = name
    item.filePath = path || item.filePath || ''
    if (settings.notifyComplete) notify('Download complete', item.name)
    pump()
  }

  async function init() {
    if (listening) return
    listening = true
    try {
      await YtDlp.addListener('downloadProgress', onProgress)
      await YtDlp.addListener('downloadComplete', (e) => {
        const item = byJob(e.id)
        if (item) complete(item, item.filePath || e.outputPath)
      })
      await YtDlp.addListener('downloadError', (e) => {
        const item = byJob(e.id)
        if (item) fail(item, e.message || 'Download failed')
      })

      await Aria2.addListener('aria2Progress', onAriaProgress)
      await Aria2.addListener('aria2Complete', (e) => {
        const item = byJob(e.id)
        if (item) complete(item, e.outputPath, e.name)
      })
      await Aria2.addListener('aria2Error', (e) => {
        const item = byJob(e.id)
        if (item) fail(item, e.message || 'Download failed')
      })
    } catch {
      // No native plugins (browser preview). Adding a download will surface a clear error instead.
      listening = false
    }
  }

  function onAriaProgress(e) {
    const item = byJob(e.id)
    if (!item || item.status !== 'downloading') return
    if (e.name) item.name = e.name
    if (e.progress >= 0) item.progress = Math.min(99, e.progress)
    if (e.total > 0) {
      item.totalText = formatBytes(e.total)
      item.downloadedText = formatBytes(e.downloaded)
    }
    item.speed = e.speed > 0 ? `${formatBytes(e.speed)}/s` : ''
    item.eta = e.eta >= 0 ? formatEta(e.eta) : ''
    if (item.kind === 'torrent') {
      const peers = `${e.connections} ${e.connections === 1 ? 'peer' : 'peers'}`
      item.peers = e.total > 0 ? peers : `Getting torrent info (${peers})`
    }
  }

  function onProgress(e) {
    const item = byJob(e.id)
    if (!item || item.status !== 'downloading') return
    const line = e.line || ''

    const fmt = RE_FORMATS.exec(line)
    if (fmt) item._streams = fmt[1].split('+').length

    const dest = RE_DEST.exec(line)
    if (dest) {
      item._stream = (item._stream ?? -1) + 1
      item.filePath = dest[1].trim()
      item.name = basename(item.filePath)
    }
    const merged = RE_MERGE.exec(line) || RE_AUDIO.exec(line)
    if (merged) {
      item.filePath = merged[1].trim()
      item.name = basename(item.filePath)
    }

    const stat = RE_STAT.exec(line)
    let pct = e.progress >= 0 ? e.progress : stat ? parseFloat(stat[1]) : -1
    if (pct >= 0) {
      const streams = item._streams || 1
      const done = Math.max(item._stream ?? 0, 0)
      item.progress = Math.min(99, Math.round(((done * 100 + pct) / streams)))
    }
    if (stat) {
      const total = parseSize(stat[2])
      item.totalText = formatBytes(total)
      item.downloadedText = formatBytes((total * parseFloat(stat[1])) / 100)
      if (stat[3]) item.speed = `${formatBytes(parseSize(stat[3]))}/s`
    }
    if (e.etaSeconds >= 0) item.eta = formatEta(e.etaSeconds)
  }

  async function start(item) {
    item.status = 'downloading'
    item.error = ''
    item.startedAt = item.startedAt || Date.now()
    item._stream = -1
    item._streams = item.audioOnly ? 1 : 2
    item.peers = ''
    try {
      if (settings.wifiOnly) {
        const net = await Network.getStatus()
        if (net.connectionType === 'cellular') throw new Error('Wi-Fi only is on and you are on mobile data.')
      }
      const res = item.kind === 'video'
        ? await YtDlp.start({
            url: item.url,
            outputDir: item.folder,
            format: formatFor(item.quality, item.audioOnly),
            convertAudio: item.audioOnly,
            audioFormat: 'mp3',
            rateLimitKb: settings.maxSpeedKb,
          })
        : await Aria2.start({
            source: item.url,
            outputDir: item.folder,
            rateLimitKb: settings.maxSpeedKb,
            selectFile: item.selectFile || '',
          })
      if (item.status !== 'downloading') {
        // Paused or cancelled while the job was starting.
        engineOf(item).cancel({ id: res.id }).catch(() => {})
        return
      }
      item.jobId = res.id
      item.saveTo = res.outputDir
      if (item.folder && res.outputDir !== item.folder) {
        showToast('That folder is not writable, so this went to the app folder.', 4200)
      }
    } catch (err) {
      fail(item, err?.message || String(err))
    }
  }

  function pump() {
    const max = Math.max(1, settings.maxSimultaneous)
    let active = items.value.filter((i) => i.status === 'downloading').length
    for (const item of items.value) {
      if (active >= max) break
      if (item.status === 'queued') {
        start(item)
        active++
      }
    }
  }

  function add({ url, name, quality, audioOnly, folder, startNow, kind = 'video', selectFile = '' }) {
    const dup = items.value.find((i) => i.url === url && ['queued', 'downloading', 'paused'].includes(i.status))
    if (dup) throw new Error('That link is already in your list.')
    const item = {
      id: `d${Date.now().toString(36)}${counter++}`,
      jobId: null,
      kind,
      selectFile,
      peers: '',
      url,
      name: name || hostOf(url),
      quality,
      audioOnly,
      folder,
      saveTo: '',
      filePath: '',
      status: startNow ? 'queued' : 'paused',
      progress: 0,
      eta: '',
      speed: '',
      downloadedText: '',
      totalText: '',
      error: '',
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
    }
    items.value.unshift(item)
    pump()
    return item.id
  }

  async function stopJob(item) {
    const jobId = item.jobId
    item.jobId = null
    item.speed = ''
    item.eta = ''
    if (jobId) await engineOf(item).cancel({ id: jobId }).catch(() => {})
  }

  async function pause(id) {
    const item = byId(id)
    if (!item || !['downloading', 'queued'].includes(item.status)) return
    item.status = 'paused'
    await stopJob(item)
    pump()
  }

  function resume(id) {
    const item = byId(id)
    if (!item || !['paused', 'error'].includes(item.status)) return
    item.status = 'queued'
    pump()
  }

  // Skip the line: start now even if the simultaneous limit is reached.
  function startNow(id) {
    const item = byId(id)
    if (!item || !['paused', 'queued', 'error'].includes(item.status)) return
    start(item)
  }

  async function cancel(id) {
    const item = byId(id)
    if (!item) return
    item.status = 'paused'
    await stopJob(item)
    items.value = items.value.filter((i) => i.id !== id)
    pump()
  }

  function remove(id) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clearFinished(kind) {
    const drop = kind === 'failed' ? ['error'] : kind === 'completed' ? ['completed'] : ['completed', 'error']
    items.value = items.value.filter((i) => !drop.includes(i.status))
  }

  function move(id, dir) {
    const waiting = items.value.filter((i) => ['queued', 'paused'].includes(i.status))
    const at = waiting.findIndex((i) => i.id === id)
    const other = waiting[at + dir]
    if (at < 0 || !other) return
    const a = items.value.indexOf(waiting[at])
    const b = items.value.indexOf(other)
    ;[items.value[a], items.value[b]] = [items.value[b], items.value[a]]
  }

  return { items, byId, init, add, pause, resume, startNow, cancel, remove, clearFinished, move, pump }
})
