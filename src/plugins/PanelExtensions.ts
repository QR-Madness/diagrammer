/**
 * Panel Extension System
 *
 * This module provides extension points for plugins to extend the UI panels
 * (PropertyPanel, LayerPanel, etc.) without modifying core code.
 *
 * ## Architecture Overview
 *
 * The extension system follows a registry pattern where plugins register
 * their contributions during initialization. The core panels query these
 * registries when rendering.
 *
 * ## Extension Points
 *
 * 1. **Property Panel Sections**: Add custom sections to the PropertyPanel
 * 2. **Property Renderers**: Add custom renderers for new property types
 * 3. **Panel Actions**: Add action buttons to panel headers
 * 4. **Context Menu Items**: Add items to context menus
 *
 * ## Usage Example
 *
 * ```typescript
 * import { panelExtensions } from './plugins/PanelExtensions';
 *
 * // Register a custom property section
 * panelExtensions.registerPropertySection({
 *   id: 'my-plugin-settings',
 *   title: 'Plugin Settings',
 *   priority: 100, // Higher = lower in list
 *   shouldShow: (shape) => shape.type === 'my-custom-shape',
 *   render: (shape, updateShape) => (
 *     <MyCustomSection shape={shape} onChange={updateShape} />
 *   ),
 * });
 *
 * // Register a custom property renderer
 * panelExtensions.registerPropertyRenderer('gradient', GradientPicker);
 * ```
 */

import type { ReactNode } from 'react';
import type { Shape } from '../shapes/Shape';

/**
 * Extension for adding a custom section to the PropertyPanel.
 */
export interface PropertySectionExtension {
  /** Unique identifier for this section */
  id: string;

  /** Section title displayed in the header */
  title: string;

  /** Sort priority (lower = higher in panel) */
  priority: number;

  /** Function to determine if section should be shown for a shape */
  shouldShow: (shape: Shape, allShapes: Shape[]) => boolean;

  /** React component or render function for the section content */
  render: (
    shape: Shape,
    allShapes: Shape[],
    updateShape: (id: string, updates: Partial<Shape>) => void
  ) => ReactNode;

  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
}

/**
 * Extension for custom property type renderers.
 */
export interface PropertyRendererExtension {
  /** Property type identifier (e.g., 'gradient', 'animation') */
  type: string;

  /** React component for rendering the property editor */
  component: React.ComponentType<{
    value: unknown;
    onChange: (value: unknown) => void;
    label: string;
    definition: Record<string, unknown>;
  }>;
}

/**
 * Extension for panel header actions.
 */
export interface PanelActionExtension {
  /** Unique identifier */
  id: string;

  /** Panel to add action to ('property' | 'layer') */
  panel: 'property' | 'layer';

  /** Icon (Unicode or SVG) */
  icon: string;

  /** Tooltip text */
  tooltip: string;

  /** Click handler */
  onClick: () => void;

  /** Optional condition to show/hide */
  condition?: () => boolean;
}

/**
 * Registry for panel extensions.
 */
class PanelExtensionRegistry {
  private propertySections: PropertySectionExtension[] = [];
  private propertyRenderers: Map<string, PropertyRendererExtension['component']> = new Map();
  private panelActions: PanelActionExtension[] = [];

  /**
   * Register a custom property section.
   */
  registerPropertySection(extension: PropertySectionExtension): void {
    // Check for duplicate IDs
    if (this.propertySections.some(s => s.id === extension.id)) {
      console.warn(`PropertySection with id "${extension.id}" already registered. Skipping.`);
      return;
    }
    this.propertySections.push(extension);
    this.propertySections.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Unregister a property section by ID.
   */
  unregisterPropertySection(id: string): void {
    this.propertySections = this.propertySections.filter(s => s.id !== id);
  }

  /**
   * Get property sections for a given shape.
   */
  getPropertySections(shape: Shape, allShapes: Shape[]): PropertySectionExtension[] {
    return this.propertySections.filter(s => s.shouldShow(shape, allShapes));
  }

  /**
   * Register a custom property type renderer.
   */
  registerPropertyRenderer(type: string, component: PropertyRendererExtension['component']): void {
    if (this.propertyRenderers.has(type)) {
      console.warn(`PropertyRenderer for type "${type}" already registered. Overwriting.`);
    }
    this.propertyRenderers.set(type, component);
  }

  /**
   * Unregister a property renderer.
   */
  unregisterPropertyRenderer(type: string): void {
    this.propertyRenderers.delete(type);
  }

  /**
   * Get a property renderer for a type.
   */
  getPropertyRenderer(type: string): PropertyRendererExtension['component'] | undefined {
    return this.propertyRenderers.get(type);
  }

  /**
   * Register a panel action button.
   */
  registerPanelAction(action: PanelActionExtension): void {
    if (this.panelActions.some(a => a.id === action.id)) {
      console.warn(`PanelAction with id "${action.id}" already registered. Skipping.`);
      return;
    }
    this.panelActions.push(action);
  }

  /**
   * Unregister a panel action.
   */
  unregisterPanelAction(id: string): void {
    this.panelActions = this.panelActions.filter(a => a.id !== id);
  }

  /**
   * Get panel actions for a specific panel.
   */
  getPanelActions(panel: 'property' | 'layer'): PanelActionExtension[] {
    return this.panelActions
      .filter(a => a.panel === panel)
      .filter(a => !a.condition || a.condition());
  }

  /**
   * Clear all extensions (useful for testing or plugin unload).
   */
  clear(): void {
    this.propertySections = [];
    this.propertyRenderers.clear();
    this.panelActions = [];
  }
}

/**
 * Global panel extension registry.
 * Import this singleton to register or query extensions.
 */
export const panelExtensions = new PanelExtensionRegistry();
