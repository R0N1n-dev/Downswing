<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Settings } from 'lucide-vue-next'
import { sidebarOpen } from '../lib/ui'
import { SECTIONS } from '../lib/sections'
import { useDownloadsStore } from '../stores/downloads'

const route = useRoute()
const { items } = storeToRefs(useDownloadsStore())

const counts = computed(() => Object.fromEntries(SECTIONS.map((s) => [s.id, items.value.filter(s.match).length])))

const close = () => { sidebarOpen.value = false }
const onKey = (e) => { if (e.key === 'Escape') close() }

watch(() => route.fullPath, close)
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="scrim" :class="{ open: sidebarOpen }" @click="close" />
  <nav class="drawer" :class="{ open: sidebarOpen }" aria-label="Sections">
    <div class="brand">
      <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="var(--raised)" />
        <circle cx="32" cy="32" r="19" fill="var(--accent)" />
        <path d="M32 20v18m-7-6 7 7 7-7M24 45h16" fill="none" stroke="var(--blue-ink)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>Downly</span>
    </div>

    <RouterLink v-for="s in SECTIONS" :key="s.id" :to="s.to" class="drawer-item" :class="{ on: route.meta.section === s.id }">
      <component :is="s.icon" :size="20" />
      <span class="grow-text">{{ s.label }}</span>
      <span v-if="counts[s.id]" class="count num">{{ counts[s.id] }}</span>
    </RouterLink>

    <RouterLink to="/settings" class="drawer-item bottom" :class="{ on: route.meta.section === 'settings' }">
      <Settings :size="20" />
      <span class="grow-text">Settings</span>
    </RouterLink>
  </nav>
</template>
