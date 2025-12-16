import { useState, useCallback } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { getSelectedShapes } from '../store/sessionStore';
import { useHistoryStore } from '../store/historyStore';
import {
  useStyleProfileStore,
  StyleProfile,
  extractStyleFromShape,
  getProfileUpdates,
} from '../store/styleProfileStore';
import { Shape } from '../shapes/Shape';
import './StyleProfilePanel.css';

/**
 * Panel for managing and applying style profiles.
 */
export function StyleProfilePanel() {
  // Subscribe to profiles array directly so changes trigger re-renders
  const storeProfiles = useStyleProfileStore((state) => state.profiles);
  const addProfile = useStyleProfileStore((state) => state.addProfile);
  const deleteProfile = useStyleProfileStore((state) => state.deleteProfile);
  const renameProfile = useStyleProfileStore((state) => state.renameProfile);
  const toggleFavorite = useStyleProfileStore((state) => state.toggleFavorite);

  const updateShape = useDocumentStore((state) => state.updateShape);
  const push = useHistoryStore((state) => state.push);

  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort profiles: favorites first (alphabetically), then non-favorites (alphabetically)
  const allProfiles = [...storeProfiles].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return a.name.localeCompare(b.name);
  });
  const profiles = searchQuery.trim()
    ? allProfiles.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allProfiles;

  const selectedShapes = getSelectedShapes();
  const hasSelection = selectedShapes.length > 0;
  const firstShape = selectedShapes[0];

  // Apply a profile to selected shapes
  const handleApplyProfile = useCallback(
    (profile: StyleProfile) => {
      if (selectedShapes.length === 0) return;

      push('Apply style profile');

      for (const shape of selectedShapes) {
        const updates = getProfileUpdates(profile, shape.type);
        updateShape(shape.id, updates);
      }
    },
    [selectedShapes, push, updateShape]
  );

  // Save current shape's style as a new profile
  const handleSaveProfile = useCallback(() => {
    if (!firstShape || !newProfileName.trim()) return;

    const properties = extractStyleFromShape(firstShape as Shape & {
      cornerRadius?: number;
      labelFontSize?: number;
      labelColor?: string;
    });

    addProfile(newProfileName.trim(), properties);
    setNewProfileName('');
    setIsCreating(false);
  }, [firstShape, newProfileName, addProfile]);

  // Start editing a profile name
  const handleStartEdit = useCallback((profile: StyleProfile) => {
    if (profile.id.startsWith('default-')) return;
    setEditingId(profile.id);
    setEditingName(profile.name);
  }, []);

  // Save edited name
  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      renameProfile(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, renameProfile]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  // Request delete confirmation
  const handleRequestDelete = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  // Confirm and delete a profile
  const handleConfirmDelete = useCallback(() => {
    if (confirmDeleteId) {
      deleteProfile(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, deleteProfile]);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  // Toggle favorite status
  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
  }, [toggleFavorite]);

  // Get preview style for a profile
  const getPreviewStyle = (profile: StyleProfile): React.CSSProperties => {
    return {
      backgroundColor: profile.properties.fill || 'transparent',
      borderColor: profile.properties.stroke || 'transparent',
      borderWidth: Math.min(profile.properties.strokeWidth, 3),
      borderStyle: 'solid',
      opacity: profile.properties.opacity,
      borderRadius: profile.properties.cornerRadius || 0,
    };
  };

  return (
    <div className="style-profile-panel">
      <div className="style-profile-header">
        <span>Style Profiles</span>
        {hasSelection && (
          <button
            className="style-profile-add-btn"
            onClick={() => setIsCreating(true)}
            title="Save current style as profile"
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {/* Search input */}
      {allProfiles.length > 3 && (
        <div className="style-profile-search">
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search profiles..."
            className="style-profile-search-input"
          />
          {searchQuery && (
            <button
              className="style-profile-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <ClearIcon />
            </button>
          )}
        </div>
      )}

      {/* Create new profile form */}
      {isCreating && firstShape && (
        <div className="style-profile-create">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            placeholder="Profile name..."
            className="style-profile-input"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveProfile();
              if (e.key === 'Escape') setIsCreating(false);
            }}
          />
          <div className="style-profile-create-actions">
            <button
              className="style-profile-btn save"
              onClick={handleSaveProfile}
              disabled={!newProfileName.trim()}
            >
              Save
            </button>
            <button
              className="style-profile-btn cancel"
              onClick={() => {
                setIsCreating(false);
                setNewProfileName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile list */}
      <div className="style-profile-list">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`style-profile-item ${!hasSelection ? 'disabled' : ''}`}
          >
            {/* Color preview */}
            <div
              className="style-profile-preview"
              style={getPreviewStyle(profile)}
            />

            {/* Favorite star */}
            <button
              className={`style-profile-action favorite ${profile.favorite ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(profile.id);
              }}
              title={profile.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <StarIcon filled={profile.favorite} />
            </button>

            {/* Name (editable for custom profiles) */}
            {editingId === profile.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="style-profile-edit-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                onBlur={handleSaveEdit}
              />
            ) : (
              <span
                className="style-profile-name"
                onDoubleClick={() => handleStartEdit(profile)}
                title={profile.id.startsWith('default-') ? 'Built-in profile' : 'Double-click to rename'}
              >
                {profile.name}
              </span>
            )}

            {/* Actions */}
            <div className="style-profile-actions">
              <button
                className="style-profile-action apply"
                onClick={() => handleApplyProfile(profile)}
                disabled={!hasSelection}
                title="Apply to selected shapes"
              >
                <ApplyIcon />
              </button>
              {!profile.id.startsWith('default-') && (
                confirmDeleteId === profile.id ? (
                  // Confirmation buttons
                  <>
                    <button
                      className="style-profile-action confirm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmDelete();
                      }}
                      title="Confirm delete"
                    >
                      <ApplyIcon />
                    </button>
                    <button
                      className="style-profile-action cancel"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelDelete();
                      }}
                      title="Cancel"
                    >
                      <DeleteIcon />
                    </button>
                  </>
                ) : (
                  <button
                    className="style-profile-action delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestDelete(profile.id);
                    }}
                    title="Delete profile"
                  >
                    <DeleteIcon />
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {!hasSelection && (
        <div className="style-profile-hint">
          Select a shape to apply or save styles
        </div>
      )}
    </div>
  );
}

// SVG Icons

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function ApplyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 7l4 4 6-8" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M7 1l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L7 1z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="4" />
      <path d="M9 9l3 3" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  );
}
