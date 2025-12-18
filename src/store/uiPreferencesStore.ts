/**
 * UI Preferences store for persisting UI state across sessions.
 *
 * Stores user preferences like expanded/collapsed sections, panel widths, etc.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI preferences state.
 */
export interface UIPreferencesState {
  /** Expanded state of property panel sections */
  expandedSections: Record<string, boolean>;
  /** Property panel width */
  propertyPanelWidth: number;
}

/**
 * UI preferences actions.
 */
export interface UIPreferencesActions {
  /** Toggle a section's expanded state */
  toggleSection: (sectionId: string) => void;
  /** Set a section's expanded state */
  setSection: (sectionId: string, expanded: boolean) => void;
  /** Check if a section is expanded */
  isSectionExpanded: (sectionId: string, defaultExpanded?: boolean) => boolean;
  /** Set property panel width */
  setPropertyPanelWidth: (width: number) => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Default expanded state for sections.
 */
const DEFAULT_EXPANDED: Record<string, boolean> = {
  appearance: true,
  label: true,
  position: false,
  size: false,
  endpoints: false,
  group: true,
};

/**
 * Initial state.
 */
const initialState: UIPreferencesState = {
  expandedSections: { ...DEFAULT_EXPANDED },
  propertyPanelWidth: 240,
};

/**
 * UI preferences store.
 *
 * Persists UI preferences like expanded sections to localStorage.
 *
 * Usage:
 * ```typescript
 * const { isSectionExpanded, toggleSection } = useUIPreferencesStore();
 *
 * // Check if section is expanded
 * const isExpanded = isSectionExpanded('appearance', true);
 *
 * // Toggle section
 * toggleSection('appearance');
 * ```
 */
export const useUIPreferencesStore = create<UIPreferencesState & UIPreferencesActions>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      toggleSection: (sectionId: string) => {
        const { expandedSections } = get();
        const currentState = expandedSections[sectionId] ?? DEFAULT_EXPANDED[sectionId] ?? true;
        set({
          expandedSections: {
            ...expandedSections,
            [sectionId]: !currentState,
          },
        });
      },

      setSection: (sectionId: string, expanded: boolean) => {
        const { expandedSections } = get();
        set({
          expandedSections: {
            ...expandedSections,
            [sectionId]: expanded,
          },
        });
      },

      isSectionExpanded: (sectionId: string, defaultExpanded?: boolean): boolean => {
        const { expandedSections } = get();
        if (sectionId in expandedSections) {
          return expandedSections[sectionId] ?? true;
        }
        if (defaultExpanded !== undefined) {
          return defaultExpanded;
        }
        return DEFAULT_EXPANDED[sectionId] ?? true;
      },

      setPropertyPanelWidth: (width: number) => {
        set({ propertyPanelWidth: width });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'diagrammer-ui-preferences',
      partialize: (state) => ({
        expandedSections: state.expandedSections,
        propertyPanelWidth: state.propertyPanelWidth,
      }),
    }
  )
);
