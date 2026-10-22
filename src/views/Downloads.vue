<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Plus, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useDownloadsStore } from '../stores/downloads'
import { SECTIONS } from '../lib/sections'
import DownloadRow from '../components/DownloadRow.vue'
import SectionHeader from '../components/SectionHeader.vue'

const route = useRoute()
const router = useRouter()
const store = useDownloadsStore()
const { items } = storeToRefs(store)

const section = computed(() => SECTIONS.find((s) => s.id === route.meta.section) || SECTIONS[0])
const searching = ref(false)
const query = ref('')

watch(section, () => { searching.value = false; query.value = '' })

const ORDER = { downloading: 0, error: 1, paused: 2, queued: 3, completed: 4 }
const newest = (a, b) => (b.finishedAt || b.createdAt) - (a.finishedAt || a.createdAt)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = items.value.filter(section.value.match).filter((i) => !q || i.name.toLowerCase().includes(q))
  switch (section.value.id) {
    case 'queued': return list // keep the order the user arranged
    case 'completed':
    case 'failed': return list.slice().sort(newest)
    default: return list.slice().sort((a, b) => ORDER[a.status] - ORDER[b.status])
  }
})

const canClear = computed(() => ['completed', 'failed'].includes(section.value.id) && visible.value.length > 0)

function clear() {
  const id = section.value.id
  if (confirm(`Clear all ${id} downloads from the list? Downloaded files stay on your device.`)) store.clearFinished(id)
}

function primary(item) {
  if (item.status === 'downloading') store.pause(item.id)
  else if (item.status === 'queued' || item.status === 'paused') store.startNow(item.id)
  else store.resume(item.id)
}
</script>

<template>
  <SectionHeader :title="section.label">
    <template v-if="searching" #title>
      <label class="field grow">
        <Search :size="18" />
        <input v-model="query" type="search" placeholder="Search downloads" autofocus>
      </label>
    </template>
    <button v-if="canClear && !searching" class="text-btn" @click="clear">Clear</button>
    <button class="icon-btn" :aria-label="searching ? 'Close search' : 'Search'" @click="searching = !searching; query = ''">
      <component :is="searching ? X : Search" :size="22" />
    </button>
  </SectionHeader>

  <div v-if="visible.length" class="list has-fab">
    <DownloadRow
      v-for="i in visible" :key="i.id" :item="i" :reorder="section.id === 'queued'"
      @open="router.push(`/download/${i.id}`)" @primary="primary(i)" @remove="store.remove(i.id)"
      @up="store.move(i.id, -1)" @down="store.move(i.id, 1)"
    />
  </div>
  <div v-else class="empty">
    <strong>{{ query ? 'No matches' : section.empty[0] }}</strong>
    <span>{{ query ? 'Nothing in this section matches that search.' : section.empty[1] }}</span>
  </div>

  <button class="fab" aria-label="Add download" @click="router.push('/add')"><Plus :size="26" :stroke-width="2.4" /></button>
</template>
