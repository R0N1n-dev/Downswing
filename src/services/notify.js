import { LocalNotifications } from '@capacitor/local-notifications'

let nextId = 1

export async function ensureNotifyPermission() {
  try {
    const s = await LocalNotifications.checkPermissions()
    if (s.display === 'granted') return true
    const r = await LocalNotifications.requestPermissions()
    return r.display === 'granted'
  } catch {
    return false
  }
}

export async function notify(title, body) {
  try {
    if (!(await ensureNotifyPermission())) return
    await LocalNotifications.schedule({ notifications: [{ id: nextId++, title, body }] })
  } catch { /* notifications are best effort */ }
}
