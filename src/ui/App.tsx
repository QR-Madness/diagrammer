import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { CanvasContainer } from './CanvasContainer';
import { PropertyPanel } from './PropertyPanel';
import { LayerPanel } from './LayerPanel';
import { SettingsModal } from './SettingsModal';
import { SplitPane } from './SplitPane';
import { DocumentEditorPanel } from './DocumentEditorPanel';
import { UnifiedToolbar } from './UnifiedToolbar';
import { StatusBar } from './StatusBar';
import { usePageStore } from '../store/pageStore';
import { useHistoryStore } from '../store/historyStore';
import { initializePersistence, usePersistenceStore } from '../store/persistenceStore';
import { useDocumentStore } from '../store/documentStore';
import { useAutoSave } from '../hooks/useAutoSave';

function App() {
  const initializeDefault = usePageStore((state) => state.initializeDefault);
  const persistenceInitializedRef = useRef(false);

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get rebuild function from document store
  const rebuildAllConnectorRoutes = useDocumentStore((state) => state.rebuildAllConnectorRoutes);

  // Split pane collapse state
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);

  // Auto-save hook
  useAutoSave();

  // Open settings callback
  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Rebuild all connector routes callback
  const handleRebuildConnectors = useCallback(() => {
    if (rebuildAllConnectorRoutes) {
      rebuildAllConnectorRoutes();
    }
  }, [rebuildAllConnectorRoutes]);

  // Collapse handler for document editor panel
  const handleCollapseEditor = useCallback(() => {
    setIsEditorCollapsed(true);
  }, []);

  const handleCollapseChange = useCallback((collapsed: boolean) => {
    setIsEditorCollapsed(collapsed);
  }, []);

  // Initialize persistence on mount
  useEffect(() => {
    if (persistenceInitializedRef.current) return;
    persistenceInitializedRef.current = true;

    // Check if we have any saved documents
    const documents = usePersistenceStore.getState().documents;
    const hasDocuments = Object.keys(documents).length > 0;

    if (hasDocuments) {
      // Initialize from persistence (loads last document or creates new)
      initializePersistence();
    } else {
      // First time use: create default page (blank canvas)
      initializeDefault();

      // Set history active page
      const pageId = usePageStore.getState().activePageId;
      if (pageId) {
        useHistoryStore.getState().setActivePage(pageId);
      }
    }
  }, [initializeDefault]);

  return (
    <div className="app">
      <UnifiedToolbar
        onOpenSettings={handleOpenSettings}
        onRebuildConnectors={handleRebuildConnectors}
      />
      <main className="app-main">
        <SplitPane
          leftPanel={<DocumentEditorPanel onCollapse={handleCollapseEditor} />}
          rightPanel={
            <>
              <CanvasContainer
                className="canvas-area"
                showGrid={true}
                showFps={true}
              />
              <PropertyPanel />
              <LayerPanel />
            </>
          }
          collapsed={isEditorCollapsed}
          onCollapseChange={handleCollapseChange}
        />
      </main>
      <StatusBar />

      {/* Settings Modal (includes Documents, Storage, etc.) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
}

export default App;
