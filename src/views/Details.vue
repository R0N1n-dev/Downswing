<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import { useDownloadsStore } from '../stores/downloads'
import FileTile from '../components/FileTile.vue'
import { formatDate } from '../lib/format'
import { KIND_LABEL } from '../lib/detect'

const route = useRoute()
const router = useRouter()
const store = useDownloadsStore()
const item = computed(() => store.byId(route.params.id))

const status = computed(() => ({
  downloading: 'Downloading', queued: 'Queued', paused: 'Paused', completed: 'Completed', error: 'Failed',
}[item.value?.status] || ''))

const statusClass = computed(() => ({ completed: 'good', error: 'bad', downloading: 'blue' }[item.value?.status] || 'muted'))

async function cancel() {
  if (confirm('Cancel and remove this download? Partial data stays on disk.')) {
    await store.cancel(item.value.id)
    router.replace('/')
  }
}

function primary() {
  const i = item.value
  if (i.status === 'downloading') store.pause(i.id)
  else store.resume(i.id)
}

const rows = computed(() => {
  const i = item.value
  return [
    ['URL', i.url],
    ['Save location', i.filePath || i.saveTo || (i.folder || 'App folder')],
    ['Type', KIND_LABEL[i.kind] || 'Video'],
    (i.kind === 'video' || !i.kind) && ['Quality', i.audioOnly ? 'Audio only (MP3)' : `Up to ${i.quality}p`],
    ['Added', formatDate(i.createdAt)],
    i.startedAt && ['Started', formatDate(i.startedAt)],
    i.finishedAt && ['Finished', formatDate(i.finishedAt)],
  ].filter(Boolean)
})
</script>

<template>
  <header class="top">
    <button class="icon-btn" aria-label="Back" @click="router.back()"><ChevronLeft :size="24" /></button>
    <h1 class="title-sm">Download details</h1>
  </header>

  <div v-if="!item" class="empty"><strong>This download is gone</strong><span>It was removed from the list.</span></div>

  <template v-else>
    <div class="d-head">
      <FileTile :name="item.name" :audio-only="item.audioOnly" :source="item.kind" :size="52" />
      <div class="d-name">{{ item.name }}</div>
    </div>

    <div class="d-stage">
      <div class="ring" :class="statusClass" :style="{ '--pct': item.progress }">
        <span class="num">{{ item.progress }}%</span>
      </div>
      <div class="d-facts">
        <div class="d-status" :class="statusClass">{{ status }}</div>
        <div v-if="item.totalText" class="num">{{ item.downloadedText }} of {{ item.totalText }}</div>
        <div v-if="item.speed || item.eta" class="num muted">{{ [item.speed, item.eta].filter(Boolean).join(', ') }}</div>
        <div v-if="item.peers && item.status === 'downloading'" class="num muted">{{ item.peers }}</div>
        <div v-if="item.status === 'error'" class="bad small">{{ item.error }}</div>
      </div>
    </div>

    <div v-if="item.status !== 'completed'" class="actions tight">
      <button class="btn primary" @click="primary">{{ item.status === 'downloading' ? 'Pause' : item.status === 'error' ? 'Retry' : 'Resume' }}</button>
      <button class="btn ghost" @click="cancel">Cancel</button>
    </div>
    <div v-else class="actions tight">
      <button class="btn ghost" @click="store.remove(item.id); router.replace('/history')">Remove from list</button>
    </div>

    <dl class="facts">
      <div v-for="[k, v] in rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
    </dl>
  </template>
</template>
