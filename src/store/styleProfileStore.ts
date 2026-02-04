import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

/**
 * Style properties that can be saved in a profile.
 * These are the common style properties across all shape types.
 */
export interface StyleProfileProperties {
  // Universal properties
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;

  // Rectangle/Group properties
  /** Optional - only applies to rectangles and groups */
  cornerRadius?: number;

  // Label properties
  /** Optional - label font size for shapes with labels */
  labelFontSize?: number;
  /** Optional - label color for shapes with labels */
  labelColor?: string;

  // Text shape properties
  /** Optional - font size for text shapes */
  fontSize?: number;
  /** Optional - font family for text shapes */
  fontFamily?: string;

  // Line/Connector properties
  /** Optional - start arrow style */
  startArrow?: string;
  /** Optional - end arrow style */
  endArrow?: string;
  /** Optional - line style (solid, dashed) */
  lineStyle?: string;

  // Group-specific properties
  /** Optional - background color for groups */
  backgroundColor?: string;
  /** Optional - border color for groups */
  borderColor?: string;
  /** Optional - border width for groups */
  borderWidth?: number;
}

/**
 * A saved style profile.
 */
export interface StyleProfile {
  id: string;
  name: string;
  properties: StyleProfileProperties;
  createdAt: number;
  /** Whether this profile is marked as a favorite */
  favorite: boolean;

  // Ownership fields (Phase 14.1 - Team mode)
  /** User ID who owns this profile (null = SYSTEM owned, available to all) */
  ownerId?: string | null;
  /** Whether the profile is locked by the owner (only owner can modify/delete) */
  ownerLocked?: boolean;
}

/**
 * Style profile store state.
 */
interface StyleProfileState {
  profiles: StyleProfile[];
}

/**
 * Style profile store actions.
 */
interface StyleProfileActions {
  /** Add a new profile */
  addProfile: (name: string, properties: StyleProfileProperties) => StyleProfile;
  /** Update an existing profile */
  updateProfile: (id: string, updates: Partial<Omit<StyleProfile, 'id' | 'createdAt'>>) => void;
  /** Delete a profile */
  deleteProfile: (id: string) => void;
  /** Rename a profile */
  renameProfile: (id: string, name: string) => void;
  /** Toggle favorite status */
  toggleFavorite: (id: string) => void;
  /** Get a profile by ID */
  getProfile: (id: string) => StyleProfile | undefined;
  /** Clear all profiles */
  clearProfiles: () => void;
  /** Get profiles sorted with favorites first */
  getSortedProfiles: () => StyleProfile[];
}

/**
 * Default built-in profiles.
 */
const DEFAULT_PROFILES: StyleProfile[] = [
  {
    id: 'default-blue',
    name: 'Default Blue',
    properties: {
      fill: '#4a90d9',
      stroke: '#2c5282',
      strokeWidth: 2,
      opacity: 1,
      cornerRadius: 0,
    },
    createdAt: 0,
    favorite: false,
  },
  {
    id: 'default-green',
    name: 'Fresh Green',
    properties: {
      fill: '#48bb78',
      stroke: '#276749',
      strokeWidth: 2,
      opacity: 1,
      cornerRadius: 8,
    },
    createdAt: 0,
    favorite: false,
  },
  {
    id: 'default-orange',
    name: 'Warm Orange',
    properties: {
      fill: '#ed8936',
      stroke: '#c05621',
      strokeWidth: 2,
      opacity: 1,
      cornerRadius: 4,
    },
    createdAt: 0,
    favorite: false,
  },
  {
    id: 'default-outline',
    name: 'Outline Only',
    properties: {
      fill: null,
      stroke: '#2c5282',
      strokeWidth: 2,
      opacity: 1,
    },
    createdAt: 0,
    favorite: false,
  },
  {
    id: 'default-subtle',
    name: 'Subtle Gray',
    properties: {
      fill: '#e2e8f0',
      stroke: '#a0aec0',
      strokeWidth: 1,
      opacity: 0.9,
      cornerRadius: 4,
    },
    createdAt: 0,
    favorite: false,
  },
];

/**
 * Style profile store for managing reusable style presets.
 * Persisted to localStorage.
 */
export const useStyleProfileStore = create<StyleProfileState & StyleProfileActions>()(
  persist(
    (set, get) => ({
      profiles: DEFAULT_PROFILES,

      addProfile: (name: string, properties: StyleProfileProperties) => {
        const profile: StyleProfile = {
          id: nanoid(),
          name,
          properties,
          createdAt: Date.now(),
          favorite: false,
        };

        set((state) => ({
          profiles: [...state.profiles, profile],
        }));

        return profile;
      },

      updateProfile: (id: string, updates: Partial<Omit<StyleProfile, 'id' | 'createdAt'>>) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProfile: (id: string) => {
        // Don't allow deleting default profiles
        if (id.startsWith('default-')) return;

        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        }));
      },

      renameProfile: (id: string, name: string) => {
        // Don't allow renaming default profiles
        if (id.startsWith('default-')) return;

        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, name } : p
          ),
        }));
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, favorite: !p.favorite } : p
          ),
        }));
      },

      getProfile: (id: string) => {
        return get().profiles.find((p) => p.id === id);
      },

      clearProfiles: () => {
        // Reset to default profiles only
        set({ profiles: DEFAULT_PROFILES });
      },

      getSortedProfiles: () => {
        const profiles = get().profiles;
        // Sort: favorites first (alphabetically), then non-favorites (alphabetically)
        return [...profiles].sort((a, b) => {
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return a.name.localeCompare(b.name);
        });
      },
    }),
    {
      name: 'diagrammer-style-profiles',
      version: 1,
    }
  )
);

/**
 * Extract style properties from a shape for creating a profile.
 * Extracts all applicable properties based on the shape type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractStyleFromShape(shape: any): StyleProfileProperties {
  const properties: StyleProfileProperties = {
    fill: shape.fill ?? null,
    stroke: shape.stroke ?? null,
    strokeWidth: shape.strokeWidth ?? 2,
    opacity: shape.opacity ?? 1,
  };

  // Rectangle/Group properties
  if (typeof shape.cornerRadius === 'number') {
    properties.cornerRadius = shape.cornerRadius;
  }

  // Label properties
  if (typeof shape.labelFontSize === 'number') {
    properties.labelFontSize = shape.labelFontSize;
  }
  if (typeof shape.labelColor === 'string') {
    properties.labelColor = shape.labelColor;
  }

  // Text shape properties
  if (typeof shape.fontSize === 'number') {
    properties.fontSize = shape.fontSize;
  }
  if (typeof shape.fontFamily === 'string') {
    properties.fontFamily = shape.fontFamily;
  }

  // Line/Connector properties
  if (typeof shape.startArrow === 'string') {
    properties.startArrow = shape.startArrow;
  }
  if (typeof shape.endArrow === 'string') {
    properties.endArrow = shape.endArrow;
  }
  if (typeof shape.lineStyle === 'string') {
    properties.lineStyle = shape.lineStyle;
  }

  // Group-specific properties
  if (typeof shape.backgroundColor === 'string') {
    properties.backgroundColor = shape.backgroundColor;
  }
  if (typeof shape.borderColor === 'string') {
    properties.borderColor = shape.borderColor;
  }
  if (typeof shape.borderWidth === 'number') {
    properties.borderWidth = shape.borderWidth;
  }

  return properties;
}

/**
 * Shape type categories for determining applicable properties.
 */
const SHAPE_CATEGORIES = {
  /** Shapes that support labels */
  withLabels: new Set(['rectangle', 'ellipse', 'connector']),
  /** Shapes that support corner radius */
  withCornerRadius: new Set(['rectangle', 'group']),
  /** Shapes that are text-based */
  textBased: new Set(['text']),
  /** Shapes that support arrows */
  withArrows: new Set(['line', 'connector']),
  /** Shapes that support line style */
  withLineStyle: new Set(['connector']),
  /** Group shapes with background/border */
  groups: new Set(['group']),
} as const;

/**
 * Check if a shape type is a library shape (flowchart, ERD, UML, etc.)
 */
function isLibraryShape(shapeType: string): boolean {
  return shapeType.includes('-') || shapeType.startsWith('flowchart') ||
         shapeType.startsWith('erd') || shapeType.startsWith('uml') ||
         shapeType === 'diamond' || shapeType === 'terminator' ||
         shapeType === 'document' || shapeType === 'data' ||
         shapeType === 'predefined-process' || shapeType === 'manual-input' ||
         shapeType === 'preparation' || shapeType === 'connector-circle' ||
         shapeType === 'off-page-connector' || shapeType === 'actor' ||
         shapeType === 'use-case' || shapeType === 'system-boundary';
}

/**
 * Get updates object to apply a profile to a shape.
 * Filters out properties that don't apply to the shape type.
 */
export function getProfileUpdates(
  profile: StyleProfile,
  shapeType: string
): Partial<StyleProfileProperties> {
  const props = profile.properties;
  const updates: Partial<StyleProfileProperties> = {};

  // Universal properties - apply to all shapes
  updates.fill = props.fill;
  updates.stroke = props.stroke;
  updates.strokeWidth = props.strokeWidth;
  updates.opacity = props.opacity;

  // Corner radius - rectangles and groups
  if (SHAPE_CATEGORIES.withCornerRadius.has(shapeType) && props.cornerRadius !== undefined) {
    updates.cornerRadius = props.cornerRadius;
  }

  // Label properties - rectangles, ellipses, connectors, and all library shapes
  const supportsLabels = SHAPE_CATEGORIES.withLabels.has(shapeType) || isLibraryShape(shapeType);
  if (supportsLabels) {
    if (props.labelFontSize !== undefined) {
      updates.labelFontSize = props.labelFontSize;
    }
    if (props.labelColor !== undefined) {
      updates.labelColor = props.labelColor;
    }
  }

  // Text shape properties
  if (SHAPE_CATEGORIES.textBased.has(shapeType)) {
    if (props.fontSize !== undefined) {
      updates.fontSize = props.fontSize;
    }
    if (props.fontFamily !== undefined) {
      updates.fontFamily = props.fontFamily;
    }
    // For text shapes, fill is the text color (already applied above)
  }

  // Arrow properties - lines and connectors
  if (SHAPE_CATEGORIES.withArrows.has(shapeType)) {
    if (props.startArrow !== undefined) {
      updates.startArrow = props.startArrow;
    }
    if (props.endArrow !== undefined) {
      updates.endArrow = props.endArrow;
    }
  }

  // Line style - connectors
  if (SHAPE_CATEGORIES.withLineStyle.has(shapeType)) {
    if (props.lineStyle !== undefined) {
      updates.lineStyle = props.lineStyle;
    }
  }

  // Group-specific properties
  if (SHAPE_CATEGORIES.groups.has(shapeType)) {
    if (props.backgroundColor !== undefined) {
      updates.backgroundColor = props.backgroundColor;
    }
    if (props.borderColor !== undefined) {
      updates.borderColor = props.borderColor;
    }
    if (props.borderWidth !== undefined) {
      updates.borderWidth = props.borderWidth;
    }
  }

  return updates;
}

/**
 * Get human-readable list of properties that apply to a shape type.
 * Useful for UI to show what a profile will change.
 */
export function getApplicablePropertyNames(shapeType: string): string[] {
  const names: string[] = ['Fill', 'Stroke', 'Stroke Width', 'Opacity'];

  if (SHAPE_CATEGORIES.withCornerRadius.has(shapeType)) {
    names.push('Corner Radius');
  }

  const supportsLabels = SHAPE_CATEGORIES.withLabels.has(shapeType) || isLibraryShape(shapeType);
  if (supportsLabels) {
    names.push('Label Font Size', 'Label Color');
  }

  if (SHAPE_CATEGORIES.textBased.has(shapeType)) {
    names.push('Font Size', 'Font Family');
  }

  if (SHAPE_CATEGORIES.withArrows.has(shapeType)) {
    names.push('Start Arrow', 'End Arrow');
  }

  if (SHAPE_CATEGORIES.withLineStyle.has(shapeType)) {
    names.push('Line Style');
  }

  if (SHAPE_CATEGORIES.groups.has(shapeType)) {
    names.push('Background Color', 'Border Color', 'Border Width');
  }

  return names;
}
