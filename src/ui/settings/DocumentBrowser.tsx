/**
 * DocumentBrowser component
 *
 * Unified document browser that combines local and remote document management.
 * Replaces DocumentsSettings and TeamDocumentsManager with a single, consistent UI.
 *
 * Phase 14.1.6 UI Consolidation
 */

import { useState, useCallback, useMemo } from 'react';
import { useDocumentRegistry } from '../../store/documentRegistry';
import { usePersistenceStore } from '../../store/persistenceStore';
import { useTeamStore } from '../../store/teamStore';
import { useTeamDocumentStore } from '../../store/teamDocumentStore';
import { useUserStore } from '../../store/userStore';
import { usePageStore } from '../../store/pageStore';
import { useRichTextStore } from '../../store/richTextStore';
import { DocumentCard } from '../DocumentCard';
import { SyncStatusBadge } from '../SyncStatusBadge';
import { PDFExportDialog } from '../PDFExportDialog';
import type { DocumentRecord } from '../../types/DocumentRegistry';
import './DocumentBrowser.css';

type FilterMode = 'all' | 'local' | 'team' | 'cached';

interface DocumentBrowserProps {
  /** Compact mode for sidebar usage */
  compact?: boolean;
}

export function DocumentBrowser({ compact = false }: DocumentBrowserProps) {
  // Registry store
  const entries = useDocumentRegistry((s) => s.entries);
  const isFetchingRemote = useDocumentRegistry((s) => s.isFetchingRemote);
  const registryError = useDocumentRegistry((s) => s.error);
  const getFilteredDocuments = useDocumentRegistry((s) => s.getFilteredDocuments);
  const setFilter = useDocumentRegistry((s) => s.setFilter);

  // Persistence store
  const currentDocumentId = usePersistenceStore((s) => s.currentDocumentId);
  const currentDocumentName = usePersistenceStore((s) => s.currentDocumentName);
  const newDocument = usePersistenceStore((s) => s.newDocument);
  const saveDocument = usePersistenceStore((s) => s.saveDocument);
  const loadDocument = usePersistenceStore((s) => s.loadDocument);
  const deleteDocument = usePersistenceStore((s) => s.deleteDocument);
  const renameDocument = usePersistenceStore((s) => s.renameDocument);
  const exportJSON = usePersistenceStore((s) => s.exportJSON);
  const importJSON = usePersistenceStore((s) => s.importJSON);

  // Team stores
  const serverMode = useTeamStore((s) => s.serverMode);
  const authenticated = useTeamDocumentStore((s) => s.authenticated);
  const isLoadingList = useTeamDocumentStore((s) => s.isLoadingList);
  const teamStoreError = useTeamDocumentStore((s) => s.error);
  const fetchDocumentList = useTeamDocumentStore((s) => s.fetchDocumentList);
  const loadTeamDocument = useTeamDocumentStore((s) => s.loadTeamDocument);
  const deleteFromHost = useTeamDocumentStore((s) => s.deleteFromHost);

  // User store
  const currentUser = useUserStore((s) => s.currentUser);

  // Local state
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfExportOpen, setPdfExportOpen] = useState(false);

  const isInTeamMode = serverMode !== 'offline';
  const isConnectedToHost = serverMode === 'client' && authenticated;
  const isHost = serverMode === 'host';

  // Get filtered documents from registry
  const documentList = useMemo(() => {
    const allDocs = getFilteredDocuments();

    // Apply local filter mode
    let filtered = allDocs;
    if (filterMode === 'local') {
      filtered = allDocs.filter((d) => d.type === 'local');
    } else if (filterMode === 'team') {
      filtered = allDocs.filter((d) => d.type === 'remote');
    } else if (filterMode === 'cached') {
      filtered = allDocs.filter((d) => d.type === 'cached');
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(query));
    }

    // Sort by modified date (newest first)
    return filtered.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }, [getFilteredDocuments, filterMode, searchQuery]);

  // Count documents by type
  const documentCounts = useMemo(() => {
    const allDocs = Object.values(entries).map((e) => e.record);
    return {
      total: allDocs.length,
      local: allDocs.filter((d) => d.type === 'local').length,
      team: allDocs.filter((d) => d.type === 'remote').length,
      cached: allDocs.filter((d) => d.type === 'cached').length,
    };
  }, [entries]);

  // Handlers
  const handleNewDocument = useCallback(() => {
    newDocument();
  }, [newDocument]);

  const handleSave = useCallback(() => {
    saveDocument();
  }, [saveDocument]);

  const handleRefresh = useCallback(() => {
    if (isConnectedToHost || isHost) {
      fetchDocumentList();
    }
  }, [fetchDocumentList, isConnectedToHost, isHost]);

  const handleOpen = useCallback(
    async (docId: string) => {
      if (docId === currentDocumentId) return;

      // Get record from registry
      const entry = entries[docId];
      if (!entry) return;

      const record = entry.record;

      if (record.type === 'remote' || record.type === 'cached') {
        // Load from team document store
        try {
          const doc = await loadTeamDocument(docId);
          const snapshot = {
            pages: doc.pages,
            pageOrder: doc.pageOrder,
            activePageId: doc.activePageId,
          };
          usePageStore.getState().loadSnapshot(snapshot);
          useRichTextStore.getState().loadContent(doc.richTextContent);

          usePersistenceStore.setState({
            currentDocumentId: doc.id,
            currentDocumentName: doc.name,
            isDirty: false,
            lastSavedAt: doc.modifiedAt,
          });
        } catch (error) {
          console.error('Failed to load team document:', error);
        }
      } else {
        // Load from local storage
        loadDocument(docId);
      }
    },
    [currentDocumentId, entries, loadTeamDocument, loadDocument]
  );

  const handleDelete = useCallback(
    async (docId: string) => {
      const entry = entries[docId];
      if (!entry) return;

      const record = entry.record;

      if (record.type === 'remote') {
        // Delete from server
        try {
          await deleteFromHost(docId);
        } catch (error) {
          console.error('Failed to delete team document:', error);
        }
      } else {
        // Delete from local storage
        deleteDocument(docId);
      }
    },
    [entries, deleteFromHost, deleteDocument]
  );

  const handleRename = useCallback(
    (docId: string, newName: string) => {
      // renameDocument only works for current document
      if (docId === currentDocumentId) {
        renameDocument(newName);
      }
    },
    [currentDocumentId, renameDocument]
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
        reader.onload = (evt) => {
          const content = evt.target?.result as string;
          importJSON(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importJSON]);

  const handleFilterChange = useCallback(
    (mode: FilterMode) => {
      setFilterMode(mode);
      // Update registry filter
      const types: ('local' | 'remote' | 'cached')[] =
        mode === 'all'
          ? ['local', 'remote', 'cached']
          : mode === 'local'
            ? ['local']
            : mode === 'team'
              ? ['remote']
              : ['cached'];
      setFilter({ types });
    },
    [setFilter]
  );

  const error = registryError || teamStoreError;
  const isLoading = isFetchingRemote || isLoadingList;

  return (
    <div className={`document-browser ${compact ? 'document-browser--compact' : ''}`}>
      {/* Quick Actions */}
      <div className="document-browser__actions">
        <button
          className="document-browser__action document-browser__action--primary"
          onClick={handleNewDocument}
          title="Create new document"
        >
          <span className="document-browser__action-icon">+</span>
          New
        </button>
        <button
          className="document-browser__action"
          onClick={handleSave}
          title="Save current document"
        >
          <span className="document-browser__action-icon">💾</span>
          Save
        </button>
        <button
          className="document-browser__action"
          onClick={handleImport}
          title="Import JSON file"
        >
          <span className="document-browser__action-icon">📂</span>
          Import
        </button>
        <button
          className="document-browser__action"
          onClick={handleExport}
          title="Export as JSON"
        >
          <span className="document-browser__action-icon">📤</span>
          Export
        </button>
        <button
          className="document-browser__action"
          onClick={() => setPdfExportOpen(true)}
          title="Export as PDF"
        >
          <span className="document-browser__action-icon">📄</span>
          PDF
        </button>
      </div>

      {/* Connection Status */}
      {isInTeamMode && (
        <div className="document-browser__status">
          {isConnectedToHost ? (
            <>
              <SyncStatusBadge state="synced" showLabel size="medium" />
              <span className="document-browser__status-text">Connected to host</span>
            </>
          ) : isHost ? (
            <>
              <SyncStatusBadge state="synced" showLabel size="medium" />
              <span className="document-browser__status-text">Hosting</span>
            </>
          ) : (
            <>
              <SyncStatusBadge state="offline" showLabel size="medium" />
              <span className="document-browser__status-text">Disconnected</span>
            </>
          )}
          <button
            className="document-browser__refresh"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh document list"
          >
            {isLoading ? '↻' : '⟳'}
          </button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="document-browser__error">
          <span className="document-browser__error-icon">⚠</span>
          {error}
        </div>
      )}

      {/* Search & Filter */}
      <div className="document-browser__toolbar">
        <input
          type="text"
          className="document-browser__search"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="document-browser__filter">
          <button
            className={`document-browser__filter-btn ${filterMode === 'all' ? 'document-browser__filter-btn--active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All ({documentCounts.total})
          </button>
          <button
            className={`document-browser__filter-btn ${filterMode === 'local' ? 'document-browser__filter-btn--active' : ''}`}
            onClick={() => handleFilterChange('local')}
          >
            Personal ({documentCounts.local})
          </button>
          {isInTeamMode && (
            <>
              <button
                className={`document-browser__filter-btn ${filterMode === 'team' ? 'document-browser__filter-btn--active' : ''}`}
                onClick={() => handleFilterChange('team')}
              >
                Team ({documentCounts.team})
              </button>
              {documentCounts.cached > 0 && (
                <button
                  className={`document-browser__filter-btn ${filterMode === 'cached' ? 'document-browser__filter-btn--active' : ''}`}
                  onClick={() => handleFilterChange('cached')}
                >
                  Offline ({documentCounts.cached})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="document-browser__list">
        {documentList.length === 0 ? (
          <div className="document-browser__empty">
            {searchQuery ? (
              <p>No documents match your search.</p>
            ) : filterMode !== 'all' ? (
              <p>No {filterMode === 'local' ? 'personal' : filterMode} documents.</p>
            ) : (
              <p>No documents yet. Create a new one to get started!</p>
            )}
          </div>
        ) : (
          documentList.map((record) => (
            <DocumentCard
              key={record.id}
              record={record}
              isActive={record.id === currentDocumentId}
              onOpen={handleOpen}
              onDelete={canDelete(record, currentUser?.id) ? handleDelete : undefined}
              onRename={canEdit(record, currentUser?.id) ? handleRename : undefined}
              mode={compact ? 'compact' : 'full'}
            />
          ))
        )}
      </div>

      {/* PDF Export Dialog */}
      {pdfExportOpen && <PDFExportDialog isOpen={pdfExportOpen} onClose={() => setPdfExportOpen(false)} />}
    </div>
  );
}

/** Check if user can delete a document */
function canDelete(record: DocumentRecord, _userId?: string): boolean {
  if (record.type === 'local') return true;
  if (record.type === 'remote' && record.permission === 'owner') return true;
  if (record.type === 'cached') return true; // Can delete local cache
  return false;
}

/** Check if user can edit a document */
function canEdit(record: DocumentRecord, _userId?: string): boolean {
  if (record.type === 'local') return true;
  if (record.type === 'remote' && (record.permission === 'owner' || record.permission === 'editor')) return true;
  if (record.type === 'cached') return true;
  return false;
}

export default DocumentBrowser;
