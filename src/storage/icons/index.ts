/**
 * Icon Category Registry
 *
 * Provides lazy loading infrastructure for icon categories.
 * Core categories (arrows, shapes, symbols, tech, general) are loaded eagerly.
 * Extended categories (cloud providers, devops, etc.) are loaded on-demand.
 */

import type { IconCategory, IconMetadata } from '../IconTypes';

/**
 * Built-in icon definition (internal format).
 */
export interface BuiltinIcon {
  name: string;
  category: IconCategory;
  svg: string;
}

/**
 * Convert built-in icon to IconMetadata.
 */
export function toMetadata(icon: BuiltinIcon): IconMetadata {
  const id = `builtin:${icon.name.toLowerCase().replace(/\s+/g, '-')}`;
  return {
    id,
    name: icon.name,
    type: 'builtin',
    category: icon.category,
    svgContent: icon.svg,
  };
}

/**
 * Category loader definition.
 */
export interface CategoryLoader {
  category: IconCategory;
  load: () => Promise<BuiltinIcon[]>;
}

/**
 * Registry of lazy-loadable icon categories.
 */
export const CATEGORY_LOADERS: CategoryLoader[] = [
  // Cloud providers
  {
    category: 'cloud-aws',
    load: () => import('./cloudAwsIcons').then((m) => m.default),
  },
  {
    category: 'cloud-azure',
    load: () => import('./cloudAzureIcons').then((m) => m.default),
  },
  {
    category: 'cloud-gcp',
    load: () => import('./cloudGcpIcons').then((m) => m.default),
  },
  // DevOps & Infrastructure
  {
    category: 'devops',
    load: () => import('./devopsIcons').then((m) => m.default),
  },
  // Databases
  {
    category: 'databases',
    load: () => import('./databaseIcons').then((m) => m.default),
  },
  // Programming Languages
  {
    category: 'languages',
    load: () => import('./languageIcons').then((m) => m.default),
  },
  // Frameworks & Libraries
  {
    category: 'frameworks',
    load: () => import('./frameworkIcons').then((m) => m.default),
  },
];

/**
 * Get the loader for a specific category.
 */
export function getCategoryLoader(category: IconCategory): CategoryLoader | undefined {
  return CATEGORY_LOADERS.find((l) => l.category === category);
}

/**
 * Check if a category has a lazy loader.
 */
export function hasLazyLoader(category: IconCategory): boolean {
  return CATEGORY_LOADERS.some((l) => l.category === category);
}
