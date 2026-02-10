import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const isOnline = process.env.ONLINE_MODE === 'true'

// Build sidebar with conditional sections
const guideSidebar = [
  { text: 'Welcome', link: '/guide/welcome' },
  { text: 'Quick Start', link: '/guide/quick-start' },
  { text: 'Canvas & Tools', link: '/guide/canvas-tools' },
  { text: 'Shape Libraries', link: '/guide/shape-libraries' },
  { text: 'Rich Text & Notes', link: '/guide/rich-text-editor' },
  { text: 'Collaboration', link: '/guide/collaboration' },
  { text: 'Export & Import', link: '/guide/export-import' },
]

const installationSidebar = isOnline ? [
  { text: 'Download & Install', link: '/getting-started/installation' },
] : []

const referenceSidebar = [
  { text: 'Keyboard Shortcuts', link: '/reference/keyboard-shortcuts' },
  { text: 'Settings', link: '/reference/settings' },
  { text: 'Shape Properties', link: '/reference/shape-properties' },
]

const developerSidebar = [
  { text: 'Architecture Overview', link: '/developer/architecture' },
  { text: 'Project Setup', link: '/developer/project-setup' },
  { text: 'Core Systems', link: '/developer/core-systems' },
  { text: 'State Management', link: '/developer/state-management' },
  { text: 'Collaboration Protocol', link: '/developer/collaboration-protocol' },
  { text: 'Contributing', link: '/developer/contributing' },
  { text: 'Roadmap', link: '/developer/roadmap' },
]

export default withMermaid(
  defineConfig({
    title: 'Diagrammer',
    description: 'A high-performance diagramming and whiteboard application',

    base: isOnline ? '/diagrammer/' : '/',

    head: [
      ['link', { rel: 'icon', href: '/favicon.svg' }]
    ],

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Guide', link: '/guide/welcome' },
        { text: 'Reference', link: '/reference/keyboard-shortcuts' },
        { text: 'Developer', link: '/developer/architecture' },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Guide',
            items: guideSidebar
          },
          ...(installationSidebar.length > 0 ? [{
            text: 'Installation',
            items: installationSidebar
          }] : [])
        ],
        '/getting-started/': [
          {
            text: 'Installation',
            items: installationSidebar
          },
          {
            text: 'Guide',
            items: guideSidebar
          }
        ],
        '/reference/': [
          {
            text: 'Reference',
            items: referenceSidebar
          }
        ],
        '/developer/': [
          {
            text: 'Developer',
            items: developerSidebar
          }
        ]
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/QR-Madness/diagrammer' }
      ],

      search: {
        provider: 'local'
      },

      editLink: {
        pattern: 'https://github.com/QR-Madness/diagrammer/edit/master/docs-site/:path'
      }
    },

    mermaid: {
      // Mermaid config
    },

    mermaidPlugin: {
      class: 'mermaid'
    }
  })
)
