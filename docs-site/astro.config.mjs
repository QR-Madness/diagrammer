// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightClientMermaid from '@pasqal-io/starlight-client-mermaid';

// https://astro.build/config
export default defineConfig({
	site: 'https://your-username.github.io',
	base: '/diagrammer',
	integrations: [
		starlight({
			title: 'Diagrammer',
			description: 'A high-performance diagramming and whiteboard application',
			logo: {
				src: './src/assets/logo.svg',
				replacesTitle: false,
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/your-username/diagrammer' },
			],
			customCss: ['./src/styles/custom.css'],
			plugins: [starlightClientMermaid()],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'Canvas & Tools', slug: 'features/canvas-tools' },
						{ label: 'Shape Libraries', slug: 'features/shape-libraries' },
						{ label: 'Collaboration', slug: 'features/collaboration' },
						{ label: 'Export & Import', slug: 'features/export-import' },
						{ label: 'Rich Text Editor', slug: 'features/rich-text-editor' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Keyboard Shortcuts', slug: 'reference/keyboard-shortcuts' },
						{ label: 'Settings', slug: 'reference/settings' },
						{ label: 'Shape Properties', slug: 'reference/shape-properties' },
					],
				},
				{
					label: 'Development',
					items: [
						{ label: 'Architecture', slug: 'development/architecture' },
						{ label: 'Roadmap', slug: 'development/roadmap' },
					],
				},
			],
		}),
	],
});
