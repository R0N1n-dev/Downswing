<script setup>
import { computed } from 'vue'
import { Pause, Play, RotateCw, Trash2, ChevronUp, ChevronDown } from 'lucide-vue-next'
import FileTile from './FileTile.vue'
import { formatDate } from '../lib/format'

const props = defineProps({ item: { type: Object, required: true }, reorder: Boolean })
const emit = defineEmits(['open', 'primary', 'remove', 'up', 'down'])

const active = computed(() => props.item.status === 'downloading')

const sub = computed(() => {
  const i = props.item
  switch (i.status) {
    case 'downloading': {
      if (!i.totalText) return i.peers || 'Starting'
      return [`${i.downloadedText} of ${i.totalText}`, i.speed, i.peers].filter(Boolean).join(', ')
    }
    case 'queued': return 'Waiting in queue'
    case 'paused': return i.progress ? `Paused at ${i.progress}%` : 'Paused'
    case 'error': return i.error || 'Failed'
    case 'completed': return [i.totalText, formatDate(i.finishedAt)].filter(Boolean).join(', ')
    default: return ''
  }
})

const icon = computed(() => ({ downloading: Pause, queued: Play, paused: Play, error: RotateCw, completed: Trash2 }[props.item.status]))
const label = computed(() => ({ downloading: 'Pause', queued: 'Start now', paused: 'Resume', error: 'Retry', completed: 'Remove from list' }[props.item.status]))
</script>

<template>
  <div class="row" role="link" tabindex="0" @click="emit('open')" @keydown.enter="emit('open')">
    <div class="tile-col">
      <FileTile :name="item.name" :audio-only="item.audioOnly" :source="item.kind" />
      <span v-if="active" class="pct num">{{ item.progress }}%</span>
    </div>

    <div class="row-body">
      <div class="row-name">{{ item.name }}</div>
      <div class="row-sub num" :class="{ bad: item.status === 'error' }">{{ sub }}</div>
      <div v-if="active || item.status === 'paused'" class="bar" :class="{ idle: !active }"><i :style="{ width: item.progress + '%' }" /></div>
    </div>

    <div class="row-end" @click.stop>
      <span v-if="active && item.eta" class="eta num">{{ item.eta }}</span>
      <div v-if="reorder" class="reorder">
        <button class="mini" aria-label="Move up" @click="emit('up')"><ChevronUp :size="16" /></button>
        <button class="mini" aria-label="Move down" @click="emit('down')"><ChevronDown :size="16" /></button>
      </div>
      <button class="round" :aria-label="label" @click="item.status === 'completed' ? emit('remove') : emit('primary')">
        <component :is="icon" :size="18" />
      </button>
    </div>
  </div>
</template>
