<script setup>
import { onMounted, onBeforeUnmount, watch, ref, computed } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import { Clipboard } from '@capacitor/clipboard'
import Dock from './components/Dock.vue'
import SideNav from './components/SideNav.vue'
import ShareSheet from './components/ShareSheet.vue'
import { SECTIONS } from './lib/sections'
import { useDownloadsStore } from './stores/downloads'
import { useSettingsStore } from './stores/settings'
import { toast, toastAct, runToastAction, showToast } from './lib/toast'
import { pollShared, consumeShared } from './lib/share'
import { drawerOpen, closeDrawer } from './lib/drawer'
import { detectKind, guessName } from './lib/detect'
import { ensureNotifyPermission } from './services/notify'
import { locked, lockError, checkLock, unlock } from './lib/lock'

const route = useRoute()
const router = useRouter()
const downloads = useDownloadsStore()
const settings = useSettingsStore().s
const screen = ref(null)
const unlocking = ref(false)
const sharedLinks = ref([])
let backHandle
let resumeHandle

const showDock = computed(() => SECTIONS.some((s) => s.id === route.meta.section))

watch(() => route.fullPath, () => screen.value?.scrollTo({ top: 0 }))

// A link shared from another app lands here on open and on return to the app.
// It does not jump straight to the Add screen: the action sheet asks what to do with it.
async function intakeShared() {
  const text = await pollShared()
  if (text) sharedLinks.value = text.split(/\s+/).filter(Boolean)
}

function sheetDismiss() {
  consumeShared()
  sharedLinks.value = []
}

function sheetOptions() {
  sharedLinks.value = [] // the Add screen consumes the pending link
  router.push('/add')
}

// Straight into the queue with the current defaults: the fast path out of a share sheet.
function sheetDownload() {
  const pending = consumeShared()
  sharedLinks.value = []
  if (!pending) return
  let added = 0
  let skipped = 0
  let reason = ''
  for (const url of pending.split(/\s+/).filter(Boolean)) {
    try {
      const kind = detectKind(url) === 'torrent' ? 'torrent' : detectKind(url) || 'video'
      downloads.add({
        url,
        name: guessName(url, kind),
        kind,
        audioOnly: false,
        quality: settings.quality,
        folder: settings.folder,
        startNow: settings.startAuto,
      })
      added++
    } catch (e) {
      skipped++
      reason = e.message
    }
  }
  if (!added && skipped) {
    showToast(reason || 'Could not add that link')
    return
  }
  ensureNotifyPermission()
  showToast(skipped ? `Added ${added} · ${skipped} skipped` : `Added ${added} to the queue`, 3000)
  if (route.path !== '/') router.push('/')
}

async function sheetCopy() {
  const link = consumeShared()
  sharedLinks.value = []
  if (!link) return
  try {
    await Clipboard.write({ string: link.split(/\s+/)[0] })
    showToast('Link copied')
  } catch {
    showToast('Clipboard is not available')
  }
}

async function onUnlock() {
  unlocking.value = true
  try { await unlock() } finally { unlocking.value = false }
}

onMounted(async () => {
  downloads.init()
  checkLock(settings.appLock)
  intakeShared()
  try {
    backHandle = await CapApp.addListener('backButton', () => {
      if (locked.value) return // stay on the lock screen; relaunching locks again anyway
      if (drawerOpen.value) { closeDrawer(); return } // back closes the menu first
      if (sharedLinks.value.length) { sheetDismiss(); return } // then the share sheet
      if (!route.meta.section) router.back()
      else if (route.path !== '/') router.replace('/')
      else CapApp.exitApp()
    })
    resumeHandle = await CapApp.addListener('resume', intakeShared)
  } catch { /* running in a browser */ }
})
onBeforeUnmount(() => {
  backHandle?.remove()
  resumeHandle?.remove()
})
</script>

<template>
  <div class="shell">
    <div v-if="locked" class="lock-screen" role="dialog" aria-modal="true" aria-label="Downly is locked">
      <div class="lock-mark">
        <svg width="34" height="34" viewBox="0 0 108 108" fill="none" aria-hidden="true">
          <path d="M37.5,82.6 A33,33 0 1 1 70.5,82.6" stroke="currentColor" stroke-width="9" stroke-linecap="round" />
          <path d="M63,28 L39,57 L52,57 L46,82 L69,51 L57,51 Z" fill="#A8E6CF" stroke="#0E0E10" stroke-width="4" stroke-linejoin="round" />
        </svg>
      </div>
      <h1 class="lock-title">Downly is locked</h1>
      <p class="lock-sub">Confirm your fingerprint, face or screen lock to get in.</p>
      <p v-if="lockError" class="lock-err" role="alert">{{ lockError }}</p>
      <button class="btn primary" :disabled="unlocking" @click="onUnlock">{{ unlocking ? 'Checking…' : 'Unlock' }}</button>
    </div>

    <SideNav />

    <div class="stage">
      <main ref="screen" class="screen" :class="{ 'with-dock': showDock }">
        <RouterView />
      </main>

      <Dock v-if="showDock" />
    </div>

    <ShareSheet v-if="sharedLinks.length" :links="sharedLinks"
      @download="sheetDownload" @options="sheetOptions" @copy="sheetCopy" @dismiss="sheetDismiss" />

    <div v-if="toast" class="toast" role="status">
      <span>{{ toast }}</span>
      <button v-if="toastAct" class="act" @click="runToastAction">{{ toastAct.label }}</button>
    </div>
  </div>
</template>
