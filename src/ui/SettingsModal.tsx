/**
 * Settings modal with tab-based navigation.
 *
 * Features:
 * - Tab infrastructure for multiple settings sections
 * - Shape Libraries management (initial tab)
 * - Extensible for future settings
 */

import { useState, useCallback, useEffect } from 'react';
import { ShapeLibraryManager } from './ShapeLibraryManager';
import './SettingsModal.css';

/**
 * Available settings tabs.
 */
type SettingsTab = 'shape-libraries';

/**
 * Tab configuration.
 */
interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: string;
}

/**
 * Available tabs configuration.
 */
const TABS: TabConfig[] = [
  { id: 'shape-libraries', label: 'Shape Libraries', icon: '📚' },
  // Future tabs can be added here:
  // { id: 'appearance', label: 'Appearance', icon: '🎨' },
  // { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
  // { id: 'about', label: 'About', icon: 'ℹ️' },
];

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

export function SettingsModal({ isOpen, onClose, initialTab = 'shape-libraries' }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Reset to initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="settings-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Content area with sidebar */}
        <div className="settings-modal-body">
          {/* Tab sidebar */}
          <nav className="settings-modal-sidebar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="settings-tab-icon">{tab.icon}</span>
                <span className="settings-tab-label">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="settings-modal-content">
            {activeTab === 'shape-libraries' && <ShapeLibraryManager />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
