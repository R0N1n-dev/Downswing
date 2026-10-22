export const QUALITIES = [240, 360, 480, 720, 1080]

export const FOLDERS = [
  { value: '', label: 'App folder (recommended)' },
  { value: '/storage/emulated/0/Download', label: 'Download' },
  { value: '/storage/emulated/0/Movies', label: 'Movies' },
  { value: '/storage/emulated/0/Music', label: 'Music' },
]

// Prefer mp4/m4a so the result plays everywhere, fall back to anything at or below the height.
export function formatFor(height, audioOnly) {
  if (audioOnly) return 'bestaudio/best'
  return `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/bv*[height<=${height}]+ba/b[height<=${height}]/b`
}
