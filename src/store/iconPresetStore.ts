/**
 * Icon Preset Store
 *
 * Manages icon styling presets for quick application.
 * Includes built-in presets and custom user presets.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { IconDisplayMode, IconBadgeConfig, IconPosition } from '../shapes/Shape';
import { DEFAULT_BADGE_CONFIG } from '../shapes/Shape';

/**
 * Icon preset configuration.
 * Defines styling that can be quickly applied to icons.
 */
export interface IconPreset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Icon display mode */
  displayMode: IconDisplayMode;
  /** Icon size */
  size?: number;
  /** Icon padding */
  padding?: number;
  /** Icon position */
  position?: IconPosition;
  /** Badge configuration (for badge mode) */
  badge?: IconBadgeConfig;
  /** Whether this is a built-in preset (cannot be deleted) */
  isBuiltin?: boolean;
}

/**
 * Built-in icon presets.
 */
export const BUILTIN_PRESETS: IconPreset[] = [
  {
    id: 'corner-icon',
    name: 'Corner Icon',
    displayMode: 'inside',
    size: 24,
    padding: 8,
    position: 'top-left',
    isBuiltin: true,
  },
  {
    id: 'centered-icon',
    name: 'Centered Icon',
    displayMode: 'inside',
    size: 32,
    position: 'center',
    isBuiltin: true,
  },
  {
    id: 'status-badge',
    name: 'Status Badge',
    displayMode: 'badge',
    size: 20,
    padding: 6,
    position: 'top-right',
    badge: {
      shape: 'circle',
      backgroundColor: '#22c55e',
      padding: 4,
      shadow: true,
    },
    isBuiltin: true,
  },
  {
    id: 'warning-badge',
    name: 'Warning Badge',
    displayMode: 'badge',
    size: 20,
    padding: 6,
    position: 'top-right',
    badge: {
      shape: 'circle',
      backgroundColor: '#f59e0b',
      padding: 4,
      shadow: true,
    },
    isBuiltin: true,
  },
  {
    id: 'tech-logo',
    name: 'Tech Logo',
    displayMode: 'badge',
    size: 28,
    padding: 8,
    position: 'top-left',
    badge: {
      shape: 'rounded-rect',
      backgroundColor: '#f8fafc',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 6,
      shadow: false,
    },
    isBuiltin: true,
  },
  {
    id: 'icon-shape',
    name: 'Icon Only',
    displayMode: 'icon-only',
    size: 48,
    isBuiltin: true,
  },
];

/**
 * Icon preset store state.
 */
interface IconPresetState {
  /** Custom user presets */
  customPresets: IconPreset[];
  /** Get all presets (builtin + custom) */
  getAllPresets: () => IconPreset[];
  /** Get preset by ID */
  getPresetById: (id: string) => IconPreset | undefined;
  /** Add a custom preset */
  addPreset: (preset: Omit<IconPreset, 'id' | 'isBuiltin'>) => string;
  /** Update a custom preset */
  updatePreset: (id: string, updates: Partial<Omit<IconPreset, 'id' | 'isBuiltin'>>) => void;
  /** Delete a custom preset */
  deletePreset: (id: string) => boolean;
  /** Create preset from current icon config */
  createPresetFromConfig: (
    name: string,
    config: {
      displayMode?: IconDisplayMode;
      size?: number;
      padding?: number;
      position?: IconPosition;
      badge?: IconBadgeConfig;
    }
  ) => string;
}

/**
 * Generate unique preset ID.
 */
function generatePresetId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Icon preset store.
 */
export const useIconPresetStore = create<IconPresetState>()(
  persist(
    (set, get) => ({
      customPresets: [],

      getAllPresets: () => {
        return [...BUILTIN_PRESETS, ...get().customPresets];
      },

      getPresetById: (id: string) => {
        // Check builtin first
        const builtin = BUILTIN_PRESETS.find((p) => p.id === id);
        if (builtin) return builtin;
        // Check custom
        return get().customPresets.find((p) => p.id === id);
      },

      addPreset: (preset) => {
        const id = generatePresetId();
        const newPreset: IconPreset = {
          ...preset,
          id,
          isBuiltin: false,
        };
        set((state) => ({
          customPresets: [...state.customPresets, newPreset],
        }));
        return id;
      },

      updatePreset: (id, updates) => {
        set((state) => ({
          customPresets: state.customPresets.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deletePreset: (id) => {
        const preset = get().getPresetById(id);
        if (!preset || preset.isBuiltin) {
          return false;
        }
        set((state) => ({
          customPresets: state.customPresets.filter((p) => p.id !== id),
        }));
        return true;
      },

      createPresetFromConfig: (name, config) => {
        const preset: Omit<IconPreset, 'id' | 'isBuiltin'> = {
          name,
          displayMode: config.displayMode || 'inside',
        };
        if (config.size) preset.size = config.size;
        if (config.padding) preset.padding = config.padding;
        if (config.position) preset.position = config.position;
        if (config.badge) preset.badge = { ...config.badge };

        return get().addPreset(preset);
      },
    }),
    {
      name: 'icon-presets',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ customPresets: state.customPresets }),
    }
  )
);

/**
 * Apply a preset to an icon configuration.
 * Returns partial updates to apply to the shape.
 */
export function applyPresetToIcon(preset: IconPreset): {
  iconDisplayMode: IconDisplayMode;
  iconSize?: number;
  iconPadding?: number;
  iconPosition?: IconPosition;
  iconBadge?: IconBadgeConfig;
} {
  const updates: ReturnType<typeof applyPresetToIcon> = {
    iconDisplayMode: preset.displayMode,
  };

  if (preset.size !== undefined) updates.iconSize = preset.size;
  if (preset.padding !== undefined) updates.iconPadding = preset.padding;
  if (preset.position !== undefined) updates.iconPosition = preset.position;
  if (preset.badge !== undefined) {
    updates.iconBadge = { ...DEFAULT_BADGE_CONFIG, ...preset.badge };
  }

  return updates;
}

/**
 * Apply a preset to an IconConfig object.
 * Returns updated IconConfig.
 */
export function applyPresetToIconConfig(
  config: { iconId: string; position?: IconPosition },
  preset: IconPreset
): {
  iconId: string;
  position: IconPosition;
  displayMode?: IconDisplayMode;
  size?: number;
  padding?: number;
  badge?: IconBadgeConfig;
} {
  const result: ReturnType<typeof applyPresetToIconConfig> = {
    iconId: config.iconId,
    position: preset.position || config.position || 'top-left',
    displayMode: preset.displayMode,
  };

  if (preset.size !== undefined) result.size = preset.size;
  if (preset.padding !== undefined) result.padding = preset.padding;
  if (preset.badge !== undefined) {
    result.badge = { ...DEFAULT_BADGE_CONFIG, ...preset.badge };
  }

  return result;
}
