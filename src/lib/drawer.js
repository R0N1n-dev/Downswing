import { ref } from 'vue'

// One shared drawer: opened from the header hamburger, closed by the scrim, a nav tap,
// or Android's back button.
export const drawerOpen = ref(false)

export function openDrawer() { drawerOpen.value = true }
export function closeDrawer() { drawerOpen.value = false }
export function toggleDrawer() { drawerOpen.value = !drawerOpen.value }
