import { Download, ArrowDownToLine, ListChecks, CircleCheck, CircleAlert } from 'lucide-vue-next'

// Each sidebar entry is a view of the same download list.
export const SECTIONS = [
  {
    id: 'all', to: '/', label: 'All downloads', icon: Download,
    match: () => true,
    empty: ['No downloads yet', 'Tap the plus button and paste a link, magnet or torrent.'],
  },
  {
    id: 'downloading', to: '/downloading', label: 'Downloading', icon: ArrowDownToLine,
    match: (i) => i.status === 'downloading',
    empty: ['Nothing downloading', 'Active downloads show up here.'],
  },
  {
    id: 'queued', to: '/queued', label: 'Queued', icon: ListChecks,
    match: (i) => i.status === 'queued' || i.status === 'paused',
    empty: ['Queue is empty', 'Paused downloads and ones waiting for a free slot show up here.'],
  },
  {
    id: 'completed', to: '/completed', label: 'Completed', icon: CircleCheck,
    match: (i) => i.status === 'completed',
    empty: ['No finished downloads', 'Completed downloads show up here.'],
  },
  {
    id: 'failed', to: '/failed', label: 'Failed', icon: CircleAlert,
    match: (i) => i.status === 'error',
    empty: ['Nothing failed', 'Downloads that hit an error show up here, ready to retry.'],
  },
]
