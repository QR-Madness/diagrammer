/**
 * Team Documents Manager
 *
 * Manages team documents with:
 * - Document list with name, owner, last modified, shared users
 * - Create new team document
 * - Per-document actions: Rename, Share, Transfer Ownership, Delete
 * - Filter/search documents
 */

import { useState, useCallback, useMemo } from 'react';
import { usePersistenceStore } from '../../store/persistenceStore';
import { useUserStore } from '../../store/userStore';
import { useTeamStore } from '../../store/teamStore';
import { DocumentMetadata, DocumentShare } from '../../types/Document';
import './TeamDocumentsManager.css';

/**
 * Format a timestamp as a relative time string.
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Document action dropdown component.
 */
interface DocumentActionsProps {
  isOwner: boolean;
  isAdmin: boolean;
  onRename: () => void;
  onShare: () => void;
  onTransfer: () => void;
  onDelete: () => void;
}

function DocumentActions({
  isOwner,
  isAdmin,
  onRename,
  onShare,
  onTransfer,
  onDelete,
}: DocumentActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const canModify = isOwner || isAdmin;
  const canShare = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  return (
    <div className="doc-actions">
      <button
        className="doc-actions-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Actions"
      >
        ...
      </button>

      {isOpen && (
        <>
          <div
            className="doc-actions-backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="doc-actions-menu">
            {canModify && (
              <button
                className="doc-action-item"
                onClick={() => {
                  setIsOpen(false);
                  onRename();
                }}
              >
                Rename
              </button>
            )}
            {canShare && (
              <button
                className="doc-action-item"
                onClick={() => {
                  setIsOpen(false);
                  onShare();
                }}
              >
                Share
              </button>
            )}
            {canModify && (
              <button
                className="doc-action-item"
                onClick={() => {
                  setIsOpen(false);
                  onTransfer();
                }}
              >
                Transfer Ownership
              </button>
            )}
            {canDelete && (
              <button
                className="doc-action-item danger"
                onClick={() => {
                  setIsOpen(false);
                  onDelete();
                }}
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Share badge showing number of shared users.
 */
function ShareBadge({ sharedWith }: { sharedWith: DocumentShare[] }) {
  if (sharedWith.length === 0) return null;

  const names = sharedWith.map((s) => s.userName).join(', ');

  return (
    <span className="share-badge" title={`Shared with: ${names}`}>
      {sharedWith.length}
    </span>
  );
}

export function TeamDocumentsManager() {
  const documents = usePersistenceStore((state) => state.documents);
  const currentDocumentId = usePersistenceStore((state) => state.currentDocumentId);
  const loadDocument = usePersistenceStore((state) => state.loadDocument);
  const deleteDocument = usePersistenceStore((state) => state.deleteDocument);
  const renameDocument = usePersistenceStore((state) => state.renameDocument);
  const saveDocumentAs = usePersistenceStore((state) => state.saveDocumentAs);

  const currentUser = useUserStore((state) => state.currentUser);
  const serverMode = useTeamStore((state) => state.serverMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyTeam, setShowOnlyTeam] = useState(false);

  // Modal states
  const [renameModal, setRenameModal] = useState<{ doc: DocumentMetadata; name: string } | null>(null);
  const [shareModal, setShareModal] = useState<DocumentMetadata | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentMetadata | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let docs = Object.values(documents);

    // Filter by team documents only if toggle is on
    if (showOnlyTeam) {
      docs = docs.filter((doc) => doc.isTeamDocument);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.ownerName?.toLowerCase().includes(query)
      );
    }

    // Sort by modified date (newest first)
    return docs.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [documents, searchQuery, showOnlyTeam]);

  const isAdmin = currentUser?.role === 'admin';
  const userId = currentUser?.id;

  const handleOpenDocument = useCallback(
    (docId: string) => {
      loadDocument(docId);
    },
    [loadDocument]
  );

  const handleCreateDocument = useCallback(() => {
    if (!newDocName.trim()) return;

    // Save current document state as a new team document
    saveDocumentAs(newDocName.trim());

    // TODO: Mark as team document when saving
    // This would require extending saveDocumentAs or adding a new method

    setCreateModal(false);
    setNewDocName('');
  }, [newDocName, saveDocumentAs]);

  const handleRename = useCallback(
    (doc: DocumentMetadata) => {
      setRenameModal({ doc, name: doc.name });
    },
    []
  );

  const handleRenameConfirm = useCallback(() => {
    if (!renameModal || !renameModal.name.trim()) return;

    // If it's the current document, use renameDocument
    if (renameModal.doc.id === currentDocumentId) {
      renameDocument(renameModal.name.trim());
    }
    // TODO: For other documents, we'd need to load, rename, save

    setRenameModal(null);
  }, [renameModal, currentDocumentId, renameDocument]);

  const handleShare = useCallback((doc: DocumentMetadata) => {
    setShareModal(doc);
  }, []);

  const handleDelete = useCallback((doc: DocumentMetadata) => {
    setDeleteConfirm(doc);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return;
    deleteDocument(deleteConfirm.id);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteDocument]);

  const handleTransfer = useCallback((doc: DocumentMetadata) => {
    // TODO: Implement transfer ownership modal
    console.log('Transfer ownership for:', doc.id);
  }, []);

  const isInTeamMode = serverMode === 'host' || serverMode === 'client';

  return (
    <div className="team-documents-manager">
      <div className="team-docs-header">
        <h4 className="settings-group-title">Documents</h4>
        <button
          className="create-doc-button"
          onClick={() => setCreateModal(true)}
        >
          + New
        </button>
      </div>

      {/* Search and filters */}
      <div className="team-docs-filters">
        <input
          type="text"
          className="team-docs-search"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isInTeamMode && (
          <label className="team-docs-filter-toggle">
            <input
              type="checkbox"
              checked={showOnlyTeam}
              onChange={(e) => setShowOnlyTeam(e.target.checked)}
            />
            <span>Team only</span>
          </label>
        )}
      </div>

      {/* Document list */}
      <div className="team-docs-list">
        {filteredDocuments.length === 0 ? (
          <div className="team-docs-empty">
            {searchQuery ? 'No documents match your search' : 'No documents yet'}
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isOwner = doc.ownerId === userId || !doc.ownerId;
            const isCurrent = doc.id === currentDocumentId;

            return (
              <div
                key={doc.id}
                className={`team-doc-item ${isCurrent ? 'current' : ''}`}
                onClick={() => handleOpenDocument(doc.id)}
              >
                <div className="team-doc-info">
                  <div className="team-doc-name">
                    {doc.name}
                    {doc.isTeamDocument && (
                      <span className="team-badge" title="Team document">
                        T
                      </span>
                    )}
                    {doc.sharedWith && <ShareBadge sharedWith={doc.sharedWith} />}
                  </div>
                  <div className="team-doc-meta">
                    <span className="team-doc-owner">
                      {doc.ownerName || 'You'}
                    </span>
                    <span className="team-doc-separator">-</span>
                    <span className="team-doc-modified">
                      {formatRelativeTime(doc.modifiedAt)}
                    </span>
                    <span className="team-doc-pages">
                      {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                </div>

                <DocumentActions
                  isOwner={isOwner}
                  isAdmin={isAdmin}
                  onRename={() => handleRename(doc)}
                  onShare={() => handleShare(doc)}
                  onTransfer={() => handleTransfer(doc)}
                  onDelete={() => handleDelete(doc)}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Create Document Modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create New Document</h3>
            <input
              type="text"
              className="modal-input"
              placeholder="Document name"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleCreateDocument}
                disabled={!newDocName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="modal-overlay" onClick={() => setRenameModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Rename Document</h3>
            <input
              type="text"
              className="modal-input"
              value={renameModal.name}
              onChange={(e) =>
                setRenameModal({ ...renameModal, name: e.target.value })
              }
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setRenameModal(null)}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={handleRenameConfirm}
                disabled={!renameModal.name.trim()}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Document?</h3>
            <p className="modal-message">
              Are you sure you want to delete "{deleteConfirm.name}"?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-button secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="modal-button danger"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal - placeholder for now */}
      {shareModal && (
        <div className="modal-overlay" onClick={() => setShareModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Share "{shareModal.name}"</h3>
            <p className="modal-message">
              Share functionality coming soon. This will allow you to share
              documents with specific team members.
            </p>
            <div className="modal-actions">
              <button
                className="modal-button primary"
                onClick={() => setShareModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamDocumentsManager;
