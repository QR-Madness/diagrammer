// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightClientMermaid from '@pasqal-io/starlight-client-mermaid';

// Default to offline/bundled build; set ONLINE_MODE=true for GitHub Pages deployment
const isOnline = process.env.ONLINE_MODE === 'true';

// Build sidebar with conditional sections
const sidebar = [
	{
		label: 'Guide',
		items: [
			{ label: 'Welcome', slug: 'guide/welcome' },
			{ label: 'Quick Start', slug: 'guide/quick-start' },
			{ label: 'Canvas & Tools', slug: 'guide/canvas-tools' },
			{ label: 'Shape Libraries', slug: 'guide/shape-libraries' },
			{ label: 'Rich Text & Notes', slug: 'guide/rich-text-editor' },
			{ label: 'Collaboration', slug: 'guide/collaboration' },
			{ label: 'Export & Import', slug: 'guide/export-import' },
		],
	},
	// Installation section is only shown in the online build
	...(isOnline ? [{
		label: 'Installation',
		items: [
			{ label: 'Download & Install', slug: 'getting-started/installation' },
		],
	}] : []),
	{
		label: 'Reference',
		items: [
			{ label: 'Keyboard Shortcuts', slug: 'reference/keyboard-shortcuts' },
			{ label: 'Settings', slug: 'reference/settings' },
			{ label: 'Shape Properties', slug: 'reference/shape-properties' },
		],
	},
	{
		label: 'Developer',
		badge: { text: 'Dev', variant: 'tip' },
		items: [
			{ label: 'Architecture Overview', slug: 'developer/architecture' },
			{ label: 'Project Setup', slug: 'developer/project-setup' },
			{ label: 'Core Systems', slug: 'developer/core-systems' },
			{ label: 'State Management', slug: 'developer/state-management' },
			{ label: 'Collaboration Protocol', slug: 'developer/collaboration-protocol' },
			{ label: 'Contributing', slug: 'developer/contributing' },
			{ label: 'Roadmap', slug: 'developer/roadmap' },
		],
	},
];

// https://astro.build/config
export default defineConfig({
	site: isOnline ? 'https://QR-Madness.github.io/diagrammer' : undefined,
	// base: isOnline ? '' : '/diagrammer/',
	trailingSlash: 'never',
	integrations: [
		starlight({
			title: 'Diagrammer',
			description: 'A high-performance diagramming and whiteboard application',
			logo: {
				src: './src/assets/logo.svg',
				replacesTitle: false,
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/QR-Madness/diagrammer' },
			],
			customCss: ['./src/styles/custom.css'],
			plugins: [starlightClientMermaid()],
			// @ts-ignore
			sidebar,
		}),
	],
});
