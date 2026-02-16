/**
 * Azure Cloud Architecture Icons
 *
 * Icons sourced from Simple Icons and Azure official icon set.
 * All icons use 24x24 viewBox and currentColor for dynamic coloring.
 */

import type { BuiltinIcon } from './index';

const cloudAzureIcons: BuiltinIcon[] = [
  // Core Services
  {
    name: 'Azure',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.05 4.24l-3.47 9.52-5.58.06L13.05 4.24zm.72 1.63L18.67 19H8.4l5.37-1.04-3.18-5.8L13.77 5.87z"/></svg>`,
  },
  {
    name: 'Azure VM',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v12H4V4m16-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6v2H8v2h8v-2h-2v-2h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`,
  },
  {
    name: 'Azure Storage',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/></svg>`,
  },
  {
    name: 'Azure Functions',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-8-4zm4 10l-4 4-4-4V8l4-2 4 2v4z"/></svg>`,
  },
  {
    name: 'Azure SQL',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7c0-2.21-3.58-4-8-4zm0 2c3.31 0 6 1.12 6 2.5S15.31 10 12 10 6 8.88 6 7.5 8.69 5 12 5zm6 12.5c0 1.38-2.69 2.5-6 2.5s-6-1.12-6-2.5v-2.04c1.45.98 3.58 1.54 6 1.54s4.55-.56 6-1.54v2.04zm0-5c0 1.38-2.69 2.5-6 2.5s-6-1.12-6-2.5V10.46c1.45.98 3.58 1.54 6 1.54s4.55-.56 6-1.54V12.5z"/></svg>`,
  },
  {
    name: 'Azure Cosmos DB',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>`,
  },
  {
    name: 'Azure App Service',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  },
  {
    name: 'Azure Kubernetes',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm3.97 12.03L12 17.06l-3.97-3.03L12 6.94l3.97 8.09z"/></svg>`,
  },
  {
    name: 'Azure Active Directory',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
  },
  {
    name: 'Azure Key Vault',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>`,
  },
  {
    name: 'Azure CDN',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
  },
  {
    name: 'Azure Event Hub',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 15h16v-2H4v2zm0 4h16v-2H4v2zm0-8h16V9H4v2zm0-6v2h16V5H4z"/></svg>`,
  },
  {
    name: 'Azure Service Bus',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>`,
  },
  {
    name: 'Azure Logic Apps',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  },
  {
    name: 'Azure Container Instances',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 7H7v10h2V7zm4 0h-2v10h2V7zm4 0h-2v10h2V7z"/></svg>`,
  },
  {
    name: 'Azure Virtual Network',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 014 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0120 12c0 4.42-3.58 8-8 8z"/></svg>`,
  },
  {
    name: 'Azure Monitor',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
  },
  {
    name: 'Azure DevOps',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.807V5.472z"/></svg>`,
  },
  {
    name: 'Azure Data Factory',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17l4.59-4.59L16 11l-6 6z"/></svg>`,
  },
  {
    name: 'Azure Synapse',
    category: 'cloud-azure',
    svg: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5z"/></svg>`,
  },
];

export default cloudAzureIcons;
