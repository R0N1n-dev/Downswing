<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Link2, ClipboardPaste, Folder, Search, Check, FileUp, X } from 'lucide-vue-next'
import { Clipboard } from '@capacitor/clipboard'
import { YtDlp } from '../services/ytdlp'
import { Aria2 } from '../services/aria2'
import { detectKind, guessName, isMagnet, isInstagram, KIND_LABEL } from '../lib/detect'
import { ensureNotifyPermission } from '../services/notify'
import { useDownloadsStore } from '../stores/downloads'
import { useSettingsStore } from '../stores/settings'
import { QUALITIES, FOLDERS } from '../lib/options'
import { showToast } from '../lib/toast'
import Switch from '../components/Switch.vue'
import FolderAccess from '../components/FolderAccess.vue'
import { formatBytes } from '../lib/format'

const router = useRouter()
const store = useDownloadsStore()
const settings = useSettingsStore().s

const mode = ref('link')
const url = ref('')
const quality = ref(settings.quality)
const audioOnly = ref(false)
const folder = ref(settings.folder)
const startNow = ref(settings.startAuto)
const error = ref('')
const kindChoice = ref('auto')
const torrentFile = ref(null)
const fileInput = ref(null)

const detected = computed(() => (torrentFile.value ? 'torrent' : detectKind(url.value)))
const igHost = computed(() => isInstagram(url.value))
// Magnets and .torrent links are always torrents. Otherwise the user's choice wins over detection.
const kind = computed(() => {
  if (mode.value === 'search') return 'video'
  if (detected.value === 'torrent') return 'torrent'
  return kindChoice.value !== 'auto' ? kindChoice.value : detected.value // null until a link is typed
})
// Torrent file picker. Optional: with no list loaded, everything downloads.
const fileList = ref(null) // { torrentPath, files: [{ index, path, size, on }] }
const inspecting = ref(false)
let inspectId = ''

const chosen = computed(() => (fileList.value ? fileList.value.files.filter((f) => f.on) : []))
const chosenSize = computed(() => chosen.value.reduce((sum, f) => sum + f.size, 0))
watch([url, torrentFile], () => { fileList.value = null })

const showTypePicker = computed(() => mode.value === 'link' && detected.value !== 'torrent')

const query = ref('')
const searching = ref(false)
const results = ref([])
const picked = ref(new Set())

const canAdd = computed(() => (mode.value === 'link' ? !!torrentFile.value || url.value.trim().length > 0 : picked.value.size > 0))

async function paste() {
  try {
    const { value } = await Clipboard.read()
    if (value && (/^https?:\/\//i.test(value.trim()) || isMagnet(value))) {
      url.value = value.trim()
      error.value = ''
    } else {
      showToast('No link on the clipboard')
    }
  } catch {
    showToast('Clipboard is not available')
  }
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(new Error('Could not read that file'))
    r.readAsDataURL(file)
  })
}

async function onPickTorrent(ev) {
  const file = ev.target.files?.[0]
  ev.target.value = ''
  if (!file) return
  error.value = ''
  try {
    const { path } = await Aria2.importTorrent({ base64: await readBase64(file) })
    torrentFile.value = { path, name: file.name.replace(/\.torrent$/i, '') }
    url.value = ''
  } catch (e) {
    error.value = /not implemented/i.test(e?.message) ? 'Torrents only work in the Android app.' : e?.message || 'Could not import the torrent.'
  }
}

async function chooseFiles() {
  error.value = ''
  inspecting.value = true
  inspectId = `i${Date.now()}${Math.random().toString(36).slice(2, 8)}`
  try {
    const res = await Aria2.inspect({ id: inspectId, source: torrentFile.value ? torrentFile.value.path : url.value.trim() })
    if (!res.files.length) throw new Error('No files found in that torrent.')
    fileList.value = { torrentPath: res.torrentPath, files: res.files.map((f) => ({ ...f, on: true })) }
  } catch (e) {
    if (!/cancel/i.test(e?.message || '')) {
      error.value = /not implemented/i.test(e?.message) ? 'Torrents only work in the Android app.' : e?.message || 'Could not read the torrent.'
    }
  } finally {
    inspecting.value = false
  }
}

function cancelInspect() {
  Aria2.cancel({ id: inspectId }).catch(() => {})
}

// "Show Pack/Season 1/ep01.mkv" -> "Show Pack". A single loose file has no folder, so it keeps its own name.
const torrentTitle = (files) => files[0].path.split('/')[0]

async function search() {
  if (!query.value.trim()) return
  searching.value = true
  results.value = []
  picked.value = new Set()
  error.value = ''
  try {
    const res = await YtDlp.search({ query: query.value })
    results.value = res.results
    if (!results.value.length) error.value = 'No results.'
  } catch (e) {
    error.value = /not implemented/i.test(e?.message) ? 'Search only works in the Android app.' : e?.message || 'Search failed.'
  } finally {
    searching.value = false
  }
}

function toggle(i) {
  const next = new Set(picked.value)
  next.has(i) ? next.delete(i) : next.add(i)
  picked.value = next
}

async function submit() {
  error.value = ''
  const base = { quality: quality.value, folder: folder.value, startNow: startNow.value }
  try {
    if (mode.value === 'link') {
      if (fileList.value) {
        if (!chosen.value.length) throw new Error('Select at least one file.')
        const all = chosen.value.length === fileList.value.files.length
        store.add({
          ...base,
          url: fileList.value.torrentPath,
          name: torrentTitle(chosen.value),
          kind: 'torrent',
          audioOnly: false,
          selectFile: all ? '' : chosen.value.map((f) => f.index).join(','),
        })
      } else if (torrentFile.value) {
        store.add({ ...base, url: torrentFile.value.path, name: torrentFile.value.name, kind: 'torrent', audioOnly: false })
      } else {
        const link = url.value.trim()
        if (!isMagnet(link) && !/^https?:\/\//i.test(link)) {
          throw new Error('Enter a link that starts with http(s):// or a magnet link.')
        }
        store.add({ ...base, url: link, name: guessName(link, kind.value), kind: kind.value, audioOnly: kind.value === 'video' && audioOnly.value })
      }
    } else {
      for (const i of picked.value) {
        store.add({ ...base, url: results.value[i].url, name: results.value[i].title, kind: 'video', audioOnly: audioOnly.value })
      }
    }
  } catch (e) {
    error.value = e.message
    return
  }
  ensureNotifyPermission()
  router.replace('/')
}
</script>

<template>
  <header class="top">
    <button class="icon-btn" aria-label="Back" @click="router.back()"><ChevronLeft :size="24" /></button>
    <h1 class="title-sm">Add download</h1>
  </header>

  <section v-if="mode === 'link'" class="block">
    <label class="label" for="url">Link or magnet</label>
    <div class="field">
      <Link2 :size="18" />
      <input id="url" v-model="url" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="https://… (YouTube, Instagram, TikTok) or magnet:?xt=…" :disabled="!!torrentFile" @keydown.enter="submit">
      <button class="inline-btn" aria-label="Paste from clipboard" @click="paste"><ClipboardPaste :size="18" /></button>
    </div>

    <div v-if="torrentFile" class="picked-file">
      <FileUp :size="18" />
      <span class="grow-text">{{ torrentFile.name }}.torrent</span>
      <button class="inline-btn" aria-label="Remove torrent file" @click="torrentFile = null"><X :size="18" /></button>
    </div>
    <button v-else class="link-btn" @click="fileInput.click()"><FileUp :size="16" /> Choose a .torrent file</button>
    <p v-if="kind === 'video' && igHost" class="hint">Instagram posts, reels and stories are supported — private or age-restricted posts need you to be logged in.</p>
    <template v-if="kind === 'torrent'">
      <p class="hint">Torrents download over BitTorrent and stop sharing when they finish.</p>

      <div v-if="inspecting" class="inspect">
        <span>Getting the file list</span>
        <button class="text-btn" @click="cancelInspect">Cancel</button>
      </div>
      <button v-else-if="!fileList" class="link-btn" @click="chooseFiles">Choose which files to download</button>

      <template v-if="fileList">
        <div class="files-head">
          <span class="num">{{ chosen.length }} of {{ fileList.files.length }} selected, {{ formatBytes(chosenSize) }}</span>
          <span>
            <button class="text-btn" @click="fileList.files.forEach((f) => (f.on = true))">All</button>
            <button class="text-btn" @click="fileList.files.forEach((f) => (f.on = false))">None</button>
          </span>
        </div>
        <div class="list picks">
          <button v-for="f in fileList.files" :key="f.index" class="pick" :class="{ on: f.on }" role="checkbox" :aria-checked="f.on" @click="f.on = !f.on">
            <span class="check"><Check v-if="f.on" :size="14" :stroke-width="3" /></span>
            <span class="pick-name">{{ f.path }}</span>
            <span class="num muted">{{ formatBytes(f.size) }}</span>
          </button>
        </div>
      </template>
    </template>
    <input ref="fileInput" type="file" accept=".torrent,application/x-bittorrent" hidden @change="onPickTorrent">
  </section>

  <section v-if="showTypePicker" class="block">
    <span class="label">Type</span>
    <div class="seg" role="radiogroup" aria-label="Download type">
      <button v-for="k in ['auto', 'video', 'file']" :key="k" role="radio" :aria-checked="kindChoice === k" :class="{ on: kindChoice === k }" @click="kindChoice = k">
        {{ k === 'auto' ? 'Auto' : KIND_LABEL[k] }}
      </button>
    </div>
    <p v-if="kind" class="hint">
      {{ kindChoice === 'auto' ? `Detected as ${KIND_LABEL[kind].toLowerCase()}. ` : '' }}{{ kind === 'video' ? 'Video uses yt-dlp for YouTube, Instagram, TikTok and other media sites.' : 'File downloads the link as is, using up to 16 connections.' }}
    </p>
    <button v-if="kind === 'video'" class="link-btn" @click="mode = 'search'"><Search :size="16" /> Search YouTube instead</button>
  </section>

  <section v-if="mode === 'search'" class="block">
    <label class="label" for="q">Search YouTube</label>
    <div class="field">
      <Search :size="18" />
      <input id="q" v-model="query" type="search" placeholder="What are you looking for?" @keydown.enter="search">
      <button class="inline-btn text" :disabled="searching" @click="search">{{ searching ? 'Searching' : 'Search' }}</button>
    </div>
    <div v-if="results.length" class="list picks">
      <button v-for="(r, i) in results" :key="r.url" class="pick" :class="{ on: picked.has(i) }" @click="toggle(i)">
        <span class="check"><Check v-if="picked.has(i)" :size="14" :stroke-width="3" /></span>
        <span class="pick-name">{{ r.title }}</span>
        <span class="num muted">{{ r.duration }}</span>
      </button>
    </div>
    <button class="link-btn" @click="mode = 'link'"><Link2 :size="16" /> Paste a link instead</button>
  </section>

  <section v-if="kind === 'video'" class="block">
    <span class="label">Quality</span>
    <div class="seg five" role="radiogroup" aria-label="Video quality" :class="{ dim: audioOnly }">
      <button v-for="q in QUALITIES" :key="q" role="radio" :aria-checked="quality === q" :disabled="audioOnly" :class="{ on: quality === q }" @click="quality = q">{{ q }}p</button>
    </div>
    <p class="hint">Gets the best stream up to {{ quality }}p. If the video has nothing that low, it takes the closest match.</p>
  </section>

  <section class="block">
    <label class="label" for="folder">Save to</label>
    <div class="field">
      <Folder :size="18" />
      <select id="folder" v-model="folder">
        <option v-for="f in FOLDERS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </div>
  </section>

  <FolderAccess :folder="folder" />

  <div class="group">
    <div v-if="kind === 'video'" class="setting"><span>Audio only (MP3)</span><Switch v-model="audioOnly" label="Audio only" /></div>
    <div class="setting"><span>Start download immediately</span><Switch v-model="startNow" label="Start immediately" /></div>
  </div>

  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <div class="actions">
    <button class="btn ghost" @click="router.back()">Cancel</button>
    <button class="btn primary" :disabled="!canAdd" @click="submit">{{ mode === 'search' && picked.size > 1 ? `Add ${picked.size}` : 'Add' }}</button>
  </div>
</template>
