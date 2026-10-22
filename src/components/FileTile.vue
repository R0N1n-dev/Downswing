<script setup>
import { computed } from 'vue'
import { Film, Music, Image, FileArchive, FileText, Magnet } from 'lucide-vue-next'
import { fileKind } from '../lib/format'

const props = defineProps({ name: { type: String, default: '' }, audioOnly: Boolean, source: { type: String, default: 'video' }, size: { type: Number, default: 40 } })
const kind = computed(() => fileKind(props.name, props.audioOnly, props.source))
const icon = computed(() => ({ video: Film, audio: Music, image: Image, archive: FileArchive, doc: FileText, torrent: Magnet }[kind.value] || FileText))
</script>

<template>
  <span class="tile" :class="`tile-${kind}`" :style="{ width: size + 'px', height: size + 'px' }">
    <component :is="icon" :size="size * 0.5" :stroke-width="2" />
  </span>
</template>
