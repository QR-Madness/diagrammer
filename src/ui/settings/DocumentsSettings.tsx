/**
 * Documents Settings component for the Settings modal.
 *
 * Contains:
 * - New document
 * - Open document (document list)
 * - Save document
 * - Import/Export JSON
 */

import { useState, useCallback } from 'react';
import { usePersistenceStore } from '../../store/persistenceStore';
import { PDFExportDialog } from '../PDFExportDialog';
import './DocumentsSettings.css';

export function DocumentsSettings() {
  const documents = usePersistenceStore((state) => state.documents);
  const currentDocumentId = usePersistenceStore((state) => state.currentDocumentId);
  const currentDocumentName = usePersistenceStore((state) => state.currentDocumentName);
  const newDocument = usePersistenceStore((state) => state.newDocument);
  const saveDocument = usePersistenceStore((state) => state.saveDocument);
  const loadDocument = usePersistenceStore((state) => state.loadDocument);
  const deleteDocument = usePersistenceStore((state) => state.deleteDocument);
  const renameDocument = usePersistenceStore((state) => state.renameDocument);
  const exportJSON = usePersistenceStore((state) => state.exportJSON);
  const importJSON = usePersistenceStore((state) => state.importJSON);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);

  const documentList = Object.entries(documents).sort((a, b) => {
    // Sort by last modified, newest first
    return (b[1].modifiedAt || 0) - (a[1].modifiedAt || 0);
  });

  const handleNewDocument = useCallback(() => {
    newDocument();
  }, [newDocument]);

  const handleSave = useCallback(() => {
    saveDocument();
  }, [saveDocument]);

  const handleLoad = useCallback(
    (docId: string) => {
      if (docId !== currentDocumentId) {
        loadDocument(docId);
      }
    },
    [currentDocumentId, loadDocument]
  );

  const handleExport = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDocumentName || 'diagram'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJSON, currentDocumentName]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importJSON(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importJSON]);

  const handleStartRename = useCallback((docId: string, currentName: string) => {
    setEditingId(docId);
    setEditingName(currentName);
  }, []);

  const handleRename = useCallback(() => {
    if (editingId && editingName.trim()) {
      // If renaming current document, use renameDocument
      if (editingId === currentDocumentId) {
        renameDocument(editingName.trim());
      }
      // Otherwise just update the name in documents list
      // (this would require a new store action, skip for now)
    }
    setEditingId(null);
    setEditingName('');
  }, [editingId, editingName, currentDocumentId, renameDocument]);

  const handleDelete = useCallback(
    (docId: string) => {
      deleteDocument(docId);
      setConfirmDeleteId(null);
    },
    [deleteDocument]
  );

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="documents-settings">
      <h3 className="settings-section-title">Documents</h3>

      {/* Quick Actions */}
      <div className="settings-group">
        <h4 className="settings-group-title">Quick Actions</h4>
        <div className="documents-actions">
          <button className="documents-action-btn documents-action-primary" onClick={handleNewDocument}>
            <span className="documents-action-icon">+</span>
            New Document
          </button>
          <button className="documents-action-btn" onClick={handleSave}>
            <span className="documents-action-icon">💾</span>
            Save Current
          </button>
        </div>
      </div>

      {/* Import/Export */}
      <div className="settings-group">
        <h4 className="settings-group-title">Import / Export</h4>
        <div className="documents-actions">
          <button className="documents-action-btn" onClick={handleImport}>
            <span className="documents-action-icon">📥</span>
            Import JSON
          </button>
          <button className="documents-action-btn" onClick={handleExport}>
            <span className="documents-action-icon">📤</span>
            Export JSON
          </button>
          <button className="documents-action-btn" onClick={() => setPdfExportOpen(true)}>
            <span className="documents-action-icon">📄</span>
            Export PDF
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="settings-group">
        <h4 className="settings-group-title">Saved Documents ({documentList.length})</h4>
        <div className="documents-list">
          {documentList.length === 0 ? (
            <div className="documents-empty">No saved documents yet</div>
          ) : (
            documentList.map(([docId, doc]) => {
              const isActive = docId === currentDocumentId;
              const isEditing = editingId === docId;
              const isDeleting = confirmDeleteId === docId;

              return (
                <div
                  key={docId}
                  className={`documents-item ${isActive ? 'active' : ''}`}
                  onClick={() => !isEditing && !isDeleting && handleLoad(docId)}
                >
                  <div className="documents-item-content">
                    {isEditing ? (
                      <input
                        type="text"
                        className="documents-item-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setEditingName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="documents-item-name">{doc.name}</span>
                        <span className="documents-item-date">
                          {formatDate(doc.modifiedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="documents-item-actions" onClick={(e) => e.stopPropagation()}>
                    {isDeleting ? (
                      <>
                        <button
                          className="documents-item-btn documents-item-btn-danger"
                          onClick={() => handleDelete(docId)}
                          title="Confirm delete"
                        >
                          ✓
                        </button>
                        <button
                          className="documents-item-btn"
                          onClick={() => setConfirmDeleteId(null)}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        {isActive && (
                          <span className="documents-item-badge">Current</span>
                        )}
                        <button
                          className="documents-item-btn"
                          onClick={() => handleStartRename(docId, doc.name)}
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          className="documents-item-btn"
                          onClick={() => setConfirmDeleteId(docId)}
                          title="Delete"
                          disabled={isActive}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="settings-info-box">
        <div className="settings-info-icon">⌨</div>
        <div className="settings-info-content">
          <strong>Keyboard Shortcuts:</strong> Ctrl+N (New), Ctrl+O (Open), Ctrl+S (Save)
        </div>
      </div>

      {/* PDF Export Dialog */}
      <PDFExportDialog isOpen={pdfExportOpen} onClose={() => setPdfExportOpen(false)} />
    </div>
  );
}
