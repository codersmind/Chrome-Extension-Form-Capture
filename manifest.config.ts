import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  description: pkg.description,
  version: pkg.version,
  icons: {
    48: 'public/logo.png',
  },
  action: {
    default_icon: {
      48: 'public/logo.png',
    },
    default_popup: 'src/popup/index.html',
  },
  permissions: [
    'sidePanel',
    'storage',
    'tabs',
    'activeTab',
    'contextMenus',
  ],
  content_scripts: [{
    js: ['src/content/main.tsx'],
    matches: ['<all_urls>'],
    run_at: 'document_end',
  }],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "background.ts" 
  },
})
