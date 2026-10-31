<script setup>
import { computed } from 'vue'
import { HugeiconsIcon } from '@hugeicons/vue'
import { Film01Icon, Music01Icon, Image01Icon, Zip01Icon, File01Icon, Magnet01Icon } from '@hugeicons/core-free-icons'
import { fileKind } from '../lib/format'

// Icon shape follows the file type; colour follows the download state.
const props = defineProps({
  name: { type: String, default: '' },
  audioOnly: Boolean,
  source: { type: String, default: 'video' },
  size: { type: Number, default: 38 },
  state: { type: String, default: '' },
})
const kind = computed(() => fileKind(props.name, props.audioOnly, props.source))
const icon = computed(() => ({
  video: Film01Icon, audio: Music01Icon, image: Image01Icon, archive: Zip01Icon,
  doc: File01Icon, torrent: Magnet01Icon,
}[kind.value] || File01Icon))
</script>

<template>
  <span class="tile" :class="state" :style="{ width: size + 'px', height: size + 'px' }">
    <HugeiconsIcon :icon="icon" :size="size * 0.5" :stroke-width="2" />
  </span>
</template>
