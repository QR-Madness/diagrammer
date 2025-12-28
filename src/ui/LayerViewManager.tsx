/**
 * LayerViewManager - Modal for creating and managing layer views.
 * Layer views filter which shapes appear in the LayerPanel based on
 * regex patterns and/or manual shape additions.
 */

import { useState, useCallback } from 'react';
import { useLayerViewStore, isValidRegex, LayerView } from '../store/layerViewStore';
import './LayerViewManager.css';

interface LayerViewManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LayerViewManager({ isOpen, onClose }: LayerViewManagerProps) {
  const views = useLayerViewStore((state) => state.views);
  const createView = useLayerViewStore((state) => state.createView);
  const updateView = useLayerViewStore((state) => state.updateView);
  const deleteView = useLayerViewStore((state) => state.deleteView);

  // New view form state
  const [newViewName, setNewViewName] = useState('');
  const [newViewRegex, setNewViewRegex] = useState('');
  const [newViewError, setNewViewError] = useState<string | null>(null);

  // Edit state
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegex, setEditRegex] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleCreateView = useCallback(() => {
    const name = newViewName.trim();
    if (!name) {
      setNewViewError('Name is required');
      return;
    }
    if (newViewRegex && !isValidRegex(newViewRegex)) {
      setNewViewError('Invalid regex pattern');
      return;
    }

    createView(name, newViewRegex || undefined);
    setNewViewName('');
    setNewViewRegex('');
    setNewViewError(null);
  }, [newViewName, newViewRegex, createView]);

  const handleStartEdit = useCallback((view: LayerView) => {
    setEditingViewId(view.id);
    setEditName(view.name);
    setEditRegex(view.regexPattern || '');
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingViewId) return;

    const name = editName.trim();
    if (!name) {
      setEditError('Name is required');
      return;
    }
    if (editRegex && !isValidRegex(editRegex)) {
      setEditError('Invalid regex pattern');
      return;
    }

    updateView(editingViewId, {
      name,
      ...(editRegex ? { regexPattern: editRegex } : { regexPattern: undefined }),
    } as Partial<Omit<LayerView, 'id' | 'createdAt'>>);
    setEditingViewId(null);
    setEditError(null);
  }, [editingViewId, editName, editRegex, updateView]);

  const handleCancelEdit = useCallback(() => {
    setEditingViewId(null);
    setEditError(null);
  }, []);

  const handleDeleteView = useCallback((id: string) => {
    deleteView(id);
    if (editingViewId === id) {
      setEditingViewId(null);
    }
  }, [deleteView, editingViewId]);

  if (!isOpen) return null;

  return (
    <div className="layer-view-manager-overlay" onClick={onClose}>
      <div className="layer-view-manager" onClick={(e) => e.stopPropagation()}>
        <div className="layer-view-manager-header">
          <h3>Manage Layer Views</h3>
          <button className="layer-view-manager-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="layer-view-manager-content">
          {/* Create new view section */}
          <div className="layer-view-manager-section">
            <h4>Create New View</h4>
            <div className="layer-view-form">
              <div className="layer-view-form-row">
                <label>Name</label>
                <input
                  type="text"
                  value={newViewName}
                  onChange={(e) => {
                    setNewViewName(e.target.value);
                    setNewViewError(null);
                  }}
                  placeholder="View name"
                />
              </div>
              <div className="layer-view-form-row">
                <label>Regex Pattern</label>
                <input
                  type="text"
                  value={newViewRegex}
                  onChange={(e) => {
                    setNewViewRegex(e.target.value);
                    setNewViewError(null);
                  }}
                  placeholder="e.g., rectangle|ellipse"
                />
                <span className="layer-view-form-hint">
                  Matches shape types, group names, and labels
                </span>
              </div>
              {newViewError && (
                <div className="layer-view-form-error">{newViewError}</div>
              )}
              <button
                className="layer-view-form-submit"
                onClick={handleCreateView}
              >
                Create View
              </button>
            </div>
          </div>

          {/* Existing views list */}
          <div className="layer-view-manager-section">
            <h4>Existing Views ({views.length})</h4>
            {views.length === 0 ? (
              <p className="layer-view-empty">
                No views created yet. Create a view to filter layers.
              </p>
            ) : (
              <ul className="layer-view-list">
                {views.map((view) => (
                  <li key={view.id} className="layer-view-list-item">
                    {editingViewId === view.id ? (
                      <div className="layer-view-edit-form">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setEditError(null);
                          }}
                          placeholder="View name"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editRegex}
                          onChange={(e) => {
                            setEditRegex(e.target.value);
                            setEditError(null);
                          }}
                          placeholder="Regex pattern"
                        />
                        {editError && (
                          <div className="layer-view-form-error">{editError}</div>
                        )}
                        <div className="layer-view-edit-actions">
                          <button onClick={handleSaveEdit}>Save</button>
                          <button onClick={handleCancelEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="layer-view-list-item-info">
                          <span className="layer-view-list-item-name">
                            {view.name}
                          </span>
                          {view.regexPattern && (
                            <span className="layer-view-list-item-regex">
                              /{view.regexPattern}/i
                            </span>
                          )}
                          {view.manualShapeIds.length > 0 && (
                            <span className="layer-view-list-item-manual">
                              +{view.manualShapeIds.length} manual
                            </span>
                          )}
                        </div>
                        <div className="layer-view-list-item-actions">
                          <button
                            onClick={() => handleStartEdit(view)}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteView(view.id)}
                            title="Delete"
                            className="danger"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Help section */}
          <div className="layer-view-manager-section layer-view-help">
            <h4>Tips</h4>
            <ul>
              <li>
                <strong>Regex examples:</strong> <code>rectangle</code> matches rectangles,{' '}
                <code>group|text</code> matches groups and text shapes
              </li>
              <li>
                Patterns match against shape types, group names, and label text
              </li>
              <li>
                Right-click shapes in the layer panel to manually add/remove them from views
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
