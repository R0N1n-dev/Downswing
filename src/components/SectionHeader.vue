<script setup>
import { Menu } from 'lucide-vue-next'
import { sidebarOpen } from '../lib/ui'

defineProps({ title: String })
</script>

<template>
  <header class="top">
    <button class="icon-btn" aria-label="Open menu" :aria-expanded="sidebarOpen" @click="sidebarOpen = true"><Menu :size="24" /></button>
    <slot name="title"><h1>{{ title }}</h1></slot>
    <slot />
  </header>
</template>
