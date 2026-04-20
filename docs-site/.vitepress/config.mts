import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const isGitHubPages = process.env['GITHUB_PAGES'] === 'true'

export default withMermaid(
  defineConfig({
    title: 'Diagrammer',
    description: 'High-performance diagramming and whiteboard application',
    base: isGitHubPages ? '/diagrammer/' : '/',

    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ],

    themeConfig: {
      logo: '/logo.svg',

      nav: [
        { text: 'Getting Started', link: '/getting-started/introduction' },
        { text: 'Guide', link: '/guide/canvas-navigation' },
        { text: 'Developer', link: '/developer/architecture' },
      ],

      sidebar: {
        '/getting-started/': [
          {
            text: 'Getting Started',
            items: [
              { text: 'Introduction', link: '/getting-started/introduction' },
              { text: 'Installation', link: '/getting-started/installation' },
              { text: 'Quick Start', link: '/getting-started/quick-start' },
              { text: 'Interface Tour', link: '/getting-started/interface-tour' },
            ],
          },
        ],
        '/guide/': [
          {
            text: 'User Guide',
            items: [
              { text: 'Canvas & Navigation', link: '/guide/canvas-navigation' },
              { text: 'Drawing Tools', link: '/guide/drawing-tools' },
              { text: 'Connectors', link: '/guide/connectors' },
              { text: 'Shape Libraries', link: '/guide/shape-libraries' },
              { text: 'Styling & Themes', link: '/guide/styling' },
              { text: 'Multi-Page Documents', link: '/guide/multi-page-documents' },
              { text: 'Rich Text & Notes', link: '/guide/rich-text-editor' },
              { text: 'Embedded Files', link: '/guide/embedded-files' },
              { text: 'Export & Import', link: '/guide/export-import' },
              { text: 'Whiteboard & Ideas', link: '/guide/whiteboard' },
              { text: 'Collaboration', link: '/guide/collaboration' },
              { text: 'Keyboard Shortcuts', link: '/guide/keyboard-shortcuts' },
              { text: 'Settings', link: '/guide/settings' },
            ],
          },
        ],
        '/developer/': [
          {
            text: 'Developer Guide',
            items: [
              { text: 'Architecture Overview', link: '/developer/architecture' },
              { text: 'Project Setup', link: '/developer/project-setup' },
              { text: 'Core Systems', link: '/developer/core-systems' },
              { text: 'State Management', link: '/developer/state-management' },
              { text: 'Creating Custom Shapes', link: '/developer/creating-shapes' },
              { text: 'Creating Custom Tools', link: '/developer/creating-tools' },
              { text: 'Shape Properties', link: '/developer/shape-properties' },
              { text: 'Plugin Development', link: '/developer/plugin-development' },
              { text: 'Collaboration Protocol', link: '/developer/collaboration-protocol' },
              { text: 'Utility Modules', link: '/developer/utilities' },
              { text: 'Contributing', link: '/developer/contributing' },
              { text: 'Roadmap', link: '/developer/roadmap' },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/QR-Madness/diagrammer' },
      ],

      search: {
        provider: 'local',
      },
    },
  })
)
