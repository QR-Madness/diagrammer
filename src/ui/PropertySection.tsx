import { useCallback, ReactNode } from 'react';
import { useUIPreferencesStore } from '../store/uiPreferencesStore';
import './PropertySection.css';

/**
 * Props for the PropertySection component.
 */
interface PropertySectionProps {
  /** Unique identifier for the section (used for persistence) */
  id: string;
  /** Section title */
  title: string;
  /** Section content */
  children: ReactNode;
  /** Default expanded state (used if no persisted state exists) */
  defaultExpanded?: boolean;
  /** Optional badge content (e.g., count) */
  badge?: string | number;
}

/**
 * Collapsible property section component.
 *
 * Features:
 * - Click header to expand/collapse
 * - Chevron indicator for expand state
 * - Persists expanded state across sessions
 * - Smooth animation for expand/collapse
 *
 * Usage:
 * ```tsx
 * <PropertySection id="appearance" title="Appearance" defaultExpanded>
 *   <PropertyRow label="Fill">...</PropertyRow>
 * </PropertySection>
 * ```
 */
export function PropertySection({
  id,
  title,
  children,
  defaultExpanded = true,
  badge,
}: PropertySectionProps) {
  const { isSectionExpanded, toggleSection } = useUIPreferencesStore();

  const isExpanded = isSectionExpanded(id, defaultExpanded);

  const handleToggle = useCallback(() => {
    toggleSection(id);
  }, [id, toggleSection]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSection(id);
      }
    },
    [id, toggleSection]
  );

  return (
    <div className={`property-section-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="property-section-header"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`section-content-${id}`}
      >
        <span className="property-section-chevron">{isExpanded ? '\u25BC' : '\u25B6'}</span>
        <span className="property-section-title">{title}</span>
        {badge !== undefined && <span className="property-section-badge">{badge}</span>}
      </div>
      <div
        id={`section-content-${id}`}
        className="property-section-content"
        aria-hidden={!isExpanded}
      >
        {children}
      </div>
    </div>
  );
}

export default PropertySection;
