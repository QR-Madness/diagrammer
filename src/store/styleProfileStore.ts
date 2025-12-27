import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

/**
 * Style properties that can be saved in a profile.
 * These are the common style properties across all shape types.
 */
export interface StyleProfileProperties {
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  /** Optional - only applies to rectangles */
  cornerRadius?: number;
  /** Optional - label font size for shapes with labels */
  labelFontSize?: number;
  /** Optional - label color for shapes with labels */
  labelColor?: string;
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
 */
export function extractStyleFromShape(shape: {
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  cornerRadius?: number;
  labelFontSize?: number;
  labelColor?: string;
}): StyleProfileProperties {
  const properties: StyleProfileProperties = {
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
  };

  if (shape.cornerRadius !== undefined) {
    properties.cornerRadius = shape.cornerRadius;
  }

  if (shape.labelFontSize !== undefined) {
    properties.labelFontSize = shape.labelFontSize;
  }

  if (shape.labelColor !== undefined) {
    properties.labelColor = shape.labelColor;
  }

  return properties;
}

/**
 * Core shape types that don't support labels.
 */
const SHAPES_WITHOUT_LABELS = new Set(['line', 'text', 'group']);

/**
 * Check if a shape type supports labels.
 * Includes: rectangle, ellipse, connector, and all library shapes.
 */
function supportsLabels(shapeType: string): boolean {
  return !SHAPES_WITHOUT_LABELS.has(shapeType);
}

/**
 * Get updates object to apply a profile to a shape.
 * Filters out properties that don't apply to the shape type.
 */
export function getProfileUpdates(
  profile: StyleProfile,
  shapeType: string
): Partial<StyleProfileProperties> {
  const updates: Partial<StyleProfileProperties> = {
    fill: profile.properties.fill,
    stroke: profile.properties.stroke,
    strokeWidth: profile.properties.strokeWidth,
    opacity: profile.properties.opacity,
  };

  // Only include cornerRadius for rectangles
  if (shapeType === 'rectangle' && profile.properties.cornerRadius !== undefined) {
    updates.cornerRadius = profile.properties.cornerRadius;
  }

  // Include label properties for shapes that support labels
  // (rectangle, ellipse, connector, and all library shapes)
  if (supportsLabels(shapeType)) {
    if (profile.properties.labelFontSize !== undefined) {
      updates.labelFontSize = profile.properties.labelFontSize;
    }
    if (profile.properties.labelColor !== undefined) {
      updates.labelColor = profile.properties.labelColor;
    }
  }

  return updates;
}
