<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { App as CapApp } from '@capacitor/app'
import Sidebar from './components/Sidebar.vue'
import { sidebarOpen } from './lib/ui'
import { useDownloadsStore } from './stores/downloads'
import { toast } from './lib/toast'

const route = useRoute()
const router = useRouter()
const downloads = useDownloadsStore()
const screen = ref(null)
let backHandle

watch(() => route.fullPath, () => screen.value?.scrollTo({ top: 0 }))

onMounted(async () => {
  downloads.init()
  try {
    backHandle = await CapApp.addListener('backButton', () => {
      if (sidebarOpen.value) sidebarOpen.value = false
      else if (!route.meta.section) router.back()
      else if (route.path !== '/') router.replace('/')
      else CapApp.exitApp()
    })
  } catch { /* running in a browser */ }
})
onBeforeUnmount(() => backHandle?.remove())
</script>

<template>
  <div class="shell">
    <main ref="screen" class="screen">
      <RouterView />
    </main>

    <Sidebar v-if="route.meta.section" />

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>
  </div>
</template>
