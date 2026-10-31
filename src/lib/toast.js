import { ref } from 'vue'

export const toast = ref('')
// Optional snackbar action: { label, run } — used for Undo.
export const toastAct = ref(null)
let timer

const hide = () => {
  toast.value = ''
  toastAct.value = null
}

export function showToast(msg, ms = 2600, act = null) {
  toast.value = msg
  toastAct.value = act
  clearTimeout(timer)
  timer = setTimeout(hide, ms)
}

export function runToastAction() {
  const act = toastAct.value
  hide()
  act?.run?.()
}
