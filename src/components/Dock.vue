<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDownloadsStore } from '../stores/downloads'
import { useSettingsStore } from '../stores/settings'
import { formatBytes, finishedTodayBytes } from '../lib/format'

const { items, waitingCharger } = storeToRefs(useDownloadsStore())
const settings = useSettingsStore().s

const active = computed(() => items.value.filter((i) => i.status === 'downloading').length)
const queued = computed(() => items.value.filter((i) => i.status === 'queued').length)
const today = computed(() => finishedTodayBytes(items.value))

// One quiet line of real numbers: slots in use, queue depth, bytes finished since midnight.
const stripStats = computed(() => {
  const parts = []
  if (active.value) parts.push(`${active.value} of ${settings.maxSimultaneous} slots`)
  if (queued.value) parts.push(`${queued.value} queued`)
  if (waitingCharger.value) parts.push('waiting for charger')
  if (today.value > 0) parts.push(`${formatBytes(today.value)} finished today`)
  if (!parts.length) parts.push(`${items.value.length} ${items.value.length === 1 ? 'download' : 'downloads'}`)
  return parts.join(' · ')
})

</script>

<template>
  <div v-if="items.length" class="stat-strip">
    <span class="strip-stats">{{ stripStats }}</span>
    <span class="strip-note num">{{ active ? 'live' : 'idle' }}</span>
  </div>

</template>
