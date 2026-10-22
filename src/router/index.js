import { createRouter, createWebHashHistory } from 'vue-router'
import Downloads from '../views/Downloads.vue'
import Settings from '../views/Settings.vue'
import AddDownload from '../views/AddDownload.vue'
import Details from '../views/Details.vue'
import { SECTIONS } from '../lib/sections'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    ...SECTIONS.map((s) => ({ path: s.to, component: Downloads, meta: { section: s.id } })),
    { path: '/settings', component: Settings, meta: { section: 'settings' } },
    { path: '/add', component: AddDownload },
    { path: '/download/:id', component: Details },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
