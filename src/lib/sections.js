import { Layers01Icon, Wifi01Icon, PlayIcon, CircleCheckIcon, RefreshCcwIcon } from '@hugeicons/core-free-icons'

// Each entry is a view of the same download list. Icons are Hugeicons data (rendered with
// <HugeiconsIcon :icon="…">); `label` is the screen title.
export const SECTIONS = [
  {
    id: 'all', to: '/', label: 'All downloads', short: 'All', icon: Layers01Icon,
    match: () => true,
    empty: ['No downloads yet', 'Tap the plus button and paste a link, magnet or torrent.'],
  },
  {
    id: 'downloading', to: '/downloading', label: 'Downloading', short: 'Active', icon: Wifi01Icon,
    match: (i) => i.status === 'downloading' || i.status === 'retrying',
    empty: ['Nothing downloading', 'Active downloads show up here.'],
  },
  {
    id: 'queued', to: '/queued', label: 'Queued', short: 'Queued', icon: PlayIcon,
    match: (i) => i.status === 'queued' || i.status === 'paused',
    empty: ['Queue is empty', 'Paused downloads and ones waiting for a free slot show up here.'],
  },
  {
    id: 'completed', to: '/completed', label: 'Completed', short: 'Done', icon: CircleCheckIcon,
    match: (i) => i.status === 'completed',
    empty: ['No finished downloads', 'Completed downloads show up here.'],
  },
  {
    id: 'failed', to: '/failed', label: 'Failed', short: 'Failed', icon: RefreshCcwIcon,
    match: (i) => i.status === 'error',
    empty: ['Nothing failed', 'Downloads that hit an error show up here, ready to retry.'],
  },
]
