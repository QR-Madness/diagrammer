/**
 * IconPicker - Component for selecting icons from the icon library.
 *
 * Features:
 * - Browse built-in and custom icons
 * - Category filtering
 * - Search functionality
 * - Upload custom SVG icons
 * - Preview selected icon
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useIconLibraryStore, initializeIconLibrary } from '../store/iconLibraryStore';
import type { IconMetadata, IconCategory } from '../storage/IconTypes';
import { getIconCategories } from '../storage/builtinIcons';
import './IconPicker.css';

/**
 * Props for the IconPicker component.
 */
interface IconPickerProps {
  /** Currently selected icon ID */
  value: string | undefined;
  /** Callback when icon changes */
  onChange: (iconId: string | undefined) => void;
  /** Label for the picker */
  label?: string;
}

/**
 * Icon category labels for display.
 */
const CATEGORY_LABELS: Record<IconCategory, string> = {
  arrows: 'Arrows',
  shapes: 'Shapes',
  symbols: 'Symbols',
  tech: 'Tech',
  general: 'General',
  custom: 'Custom',
};

/**
 * IconPicker component.
 */
export function IconPicker({ value, onChange, label = 'Icon' }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IconCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    getAllIcons,
    uploadIcon,
    customIcons,
    isLoading,
    error,
    clearError,
  } = useIconLibraryStore();

  // Initialize icon library on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeIconLibrary().then(() => setIsInitialized(true));
    }
  }, [isInitialized]);

  // Get all icons
  const allIcons = useMemo(() => getAllIcons(), [customIcons]);

  // Get categories with counts
  const categories = useMemo(() => {
    const builtinCategories = getIconCategories();
    const customCount = customIcons.length;

    return [
      { category: 'all' as const, count: allIcons.length },
      ...builtinCategories,
      ...(customCount > 0 ? [{ category: 'custom' as IconCategory, count: customCount }] : []),
    ];
  }, [allIcons.length, customIcons.length]);

  // Filter icons by category and search
  const filteredIcons = useMemo(() => {
    let icons = allIcons;

    // Filter by category
    if (selectedCategory !== 'all') {
      icons = icons.filter((icon) => icon.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      icons = icons.filter((icon) => icon.name.toLowerCase().includes(query));
    }

    return icons;
  }, [allIcons, selectedCategory, searchQuery]);

  // Get selected icon details
  const selectedIcon = useMemo(() => {
    if (!value) return undefined;
    return useIconLibraryStore.getState().getIcon(value);
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle icon selection
  const handleSelect = useCallback(
    (icon: IconMetadata) => {
      onChange(icon.id);
      setIsOpen(false);
    },
    [onChange]
  );

  // Handle clear selection
  const handleClear = useCallback(() => {
    onChange(undefined);
    setIsOpen(false);
  }, [onChange]);

  // Handle file upload
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await uploadIcon(file);
      if (result.success && result.icon) {
        onChange(result.icon.id);
        setIsOpen(false);
      }

      // Reset file input
      e.target.value = '';
    },
    [uploadIcon, onChange]
  );

  // Clear error on open
  useEffect(() => {
    if (isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  return (
    <div className="icon-picker" ref={containerRef}>
      <label className="icon-picker-label">{label}</label>

      <div className="icon-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
        {selectedIcon ? (
          <div className="icon-picker-preview">
            <IconPreview icon={selectedIcon} size={20} />
            <span className="icon-picker-name">{selectedIcon.name}</span>
          </div>
        ) : (
          <span className="icon-picker-placeholder">Select icon...</span>
        )}
        <span className="icon-picker-chevron">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </div>

      {isOpen && (
        <div className="icon-picker-dropdown">
          {/* Search and Upload */}
          <div className="icon-picker-header">
            <input
              type="text"
              className="icon-picker-search"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="icon-picker-upload-btn"
              onClick={handleUploadClick}
              title="Upload custom SVG icon"
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Category tabs */}
          <div className="icon-picker-categories">
            {categories.map(({ category, count }) => (
              <button
                key={category}
                className={`icon-picker-category ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All' : CATEGORY_LABELS[category]} ({count})
              </button>
            ))}
          </div>

          {/* Error display */}
          {error && <div className="icon-picker-error">{error}</div>}

          {/* Icons grid */}
          <div className="icon-picker-grid">
            {/* Clear option */}
            {value && (
              <button
                className="icon-picker-item icon-picker-clear"
                onClick={handleClear}
                title="Remove icon"
              >
                <span className="icon-picker-clear-icon">\u2715</span>
                <span className="icon-picker-item-name">None</span>
              </button>
            )}

            {isLoading ? (
              <div className="icon-picker-loading">Loading...</div>
            ) : filteredIcons.length === 0 ? (
              <div className="icon-picker-empty">No icons found</div>
            ) : (
              filteredIcons.map((icon) => (
                <button
                  key={icon.id}
                  className={`icon-picker-item ${value === icon.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(icon)}
                  title={icon.name}
                >
                  <IconPreview icon={icon} size={24} />
                  <span className="icon-picker-item-name">{icon.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * IconPreview - Renders an icon preview.
 */
function IconPreview({ icon, size }: { icon: IconMetadata; size: number }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Call store directly to avoid function reference issues
    useIconLibraryStore.getState().loadIconData(icon.id).then((data) => {
      if (mounted && data) {
        setImageUrl(data.dataUrl);
      }
    });

    return () => {
      mounted = false;
    };
  }, [icon.id]);

  if (!imageUrl) {
    return <div className="icon-preview-placeholder" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={imageUrl}
      alt={icon.name}
      className="icon-preview"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Compact icon display for PropertyPanel.
 */
export function IconDisplay({
  iconId,
  size = 24,
}: {
  iconId: string | undefined;
  size?: number;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [iconName, setIconName] = useState<string>('');

  useEffect(() => {
    if (!iconId) {
      setImageUrl(null);
      setIconName('');
      return;
    }

    let mounted = true;

    // Call store directly to avoid function reference issues
    useIconLibraryStore.getState().loadIconData(iconId).then((data) => {
      if (mounted && data) {
        setImageUrl(data.dataUrl);
        setIconName(data.name);
      }
    });

    return () => {
      mounted = false;
    };
  }, [iconId]);

  if (!imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={iconName}
      className="icon-display"
      style={{ width: size, height: size }}
      title={iconName}
    />
  );
}

export default IconPicker;
