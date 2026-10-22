<script setup>
import { ref, computed, onMounted } from 'vue'
import { Folder } from 'lucide-vue-next'
import { YtDlp } from '../services/ytdlp'
import { useSettingsStore } from '../stores/settings'
import { QUALITIES, FOLDERS } from '../lib/options'
import { PALETTES, paletteById } from '../lib/themes'
import { showToast } from '../lib/toast'
import Switch from '../components/Switch.vue'
import SectionHeader from '../components/SectionHeader.vue'
import Stepper from '../components/Stepper.vue'
import FolderAccess from '../components/FolderAccess.vue'

const engine = ref('Checking')
const updating = ref(false)

onMounted(async () => {
  try {
    const { version } = await YtDlp.getEngineVersion()
    engine.value = version || 'Bundled build (Nov 2025)'
  } catch {
    engine.value = 'Android app only'
  }
})

async function updateEngine() {
  updating.value = true
  try {
    const res = await YtDlp.updateEngine()
    engine.value = res.version || engine.value
    showToast(res.status === 'DONE' ? 'yt-dlp updated' : 'yt-dlp is already up to date')
  } catch (e) {
    showToast(`Update failed: ${(e?.message || e).toString().slice(0, 140)}`, 6000)
  } finally {
    updating.value = false
  }
}

const store = useSettingsStore()
const s = store.s

// Group palettes for the picker: base first, then dual, then triple.
const paletteGroups = computed(() => [
  { label: 'Base', items: PALETTES.filter((p) => p.group === 'base') },
  { label: 'Dual color', items: PALETTES.filter((p) => p.group === 'dual') },
  { label: 'Triple color', items: PALETTES.filter((p) => p.group === 'triple') },
].filter((g) => g.items.length))
const currentPalette = computed(() => paletteById(s.palette))

const speed = (kb) => (kb === 0 ? 'No limit' : kb >= 1024 ? `${(kb / 1024).toFixed(kb % 1024 ? 1 : 0)} MB/s` : `${kb} KB/s`)

function reset() {
  if (confirm('Reset all settings to defaults?')) {
    store.reset()
    showToast('Settings reset')
  }
}
</script>

<template>
  <SectionHeader title="Settings" />

  <h2 class="section-title">Downloads</h2>
  <div class="group">
    <label class="setting stack">
      <span class="s-label"><Folder :size="18" /> Download folder</span>
      <select v-model="s.folder" class="plain">
        <option v-for="f in FOLDERS" :key="f.value" :value="f.value">{{ f.label }}</option>
      </select>
    </label>
    <div class="pad-block"><FolderAccess :folder="s.folder" /></div>
    <p class="hint pad">The app folder lives under Android/data and is hard to browse. Pick Download or another shared folder to see files in your file manager.</p>
    <div class="setting"><span>Default quality</span>
      <select v-model.number="s.quality" class="plain right">
        <option v-for="q in QUALITIES" :key="q" :value="q">{{ q }}p</option>
      </select>
    </div>
    <div class="setting"><span>Max simultaneous downloads</span><Stepper v-model="s.maxSimultaneous" :min="1" :max="6" /></div>
    <div class="setting"><span>Max download speed</span><Stepper v-model="s.maxSpeedKb" :min="0" :max="20480" :step="512" :format="speed" /></div>
    <div class="setting"><span>Start downloads automatically</span><Switch v-model="s.startAuto" label="Start downloads automatically" /></div>
    <div class="setting"><span>Wi-Fi only</span><Switch v-model="s.wifiOnly" label="Wi-Fi only" /></div>
  </div>

  <h2 class="section-title">Appearance</h2>
  <div class="group">
    <div class="setting"><span>Theme</span>
      <select v-model="s.theme" class="plain right">
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="system">Match system</option>
      </select>
    </div>
    <div class="setting"><span>Color theme</span>
      <select v-model="s.palette" class="plain right">
        <optgroup v-for="g in paletteGroups" :key="g.label" :label="g.label">
          <option v-for="p in g.items" :key="p.id" :value="p.id">{{ p.name }}</option>
        </optgroup>
      </select>
    </div>
    <div class="swatch-row">
      <span class="swatch" :style="{ background: currentPalette.primary }" />
      <span v-if="currentPalette.secondary" class="swatch" :style="{ background: currentPalette.secondary }" />
      <span class="swatch" :style="{ background: currentPalette.accent }" />
      <span class="swatch-note muted">{{ currentPalette.note || 'App accent color' }}</span>
    </div>
  </div>

  <h2 class="section-title">Notifications</h2>
  <div class="group">
    <div class="setting"><span>Download complete</span><Switch v-model="s.notifyComplete" label="Notify when complete" /></div>
    <div class="setting"><span>Download failed</span><Switch v-model="s.notifyFail" label="Notify when failed" /></div>
  </div>

  <h2 class="section-title">Engine</h2>
  <div class="group">
    <div class="setting"><span>yt-dlp version</span><span class="muted num eng">{{ engine }}</span></div>
    <div class="setting"><span>Update yt-dlp</span><button class="text-btn" :disabled="updating" @click="updateEngine">{{ updating ? 'Updating' : 'Update now' }}</button></div>
  </div>
  <p class="hint">Sites change often and an old yt-dlp stops working. Downly also updates it on launch when you are online.</p>

  <div class="actions"><button class="btn ghost" @click="reset">Reset settings</button></div>
</template>
