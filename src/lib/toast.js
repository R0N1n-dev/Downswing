import { ref } from 'vue'

export const toast = ref('')
let timer

export function showToast(msg, ms = 2600) {
  toast.value = msg
  clearTimeout(timer)
  timer = setTimeout(() => { toast.value = '' }, ms)
}
