import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { CanvasContainer } from './CanvasContainer';
import { Toolbar } from './Toolbar';
import { PropertyPanel } from './PropertyPanel';
import { LayerPanel } from './LayerPanel';
import { FileMenu } from './FileMenu';
import { PageTabs } from './PageTabs';
import { DocumentManager } from './DocumentManager';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { SplitPane } from './SplitPane';
import { DocumentEditorPanel } from './DocumentEditorPanel';
import { useDocumentStore } from '../store/documentStore';
import { usePageStore } from '../store/pageStore';
import { useHistoryStore } from '../store/historyStore';
import { useThemeStore } from '../store/themeStore';
import { initializePersistence, usePersistenceStore } from '../store/persistenceStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { RectangleShape, DEFAULT_RECTANGLE } from '../shapes/Shape';
import { nanoid } from 'nanoid';

/**
 * Create example shapes for demonstration.
 */
function createExampleShapes(): RectangleShape[] {
  const colors = [
    { fill: '#4a90d9', stroke: '#2c5282' }, // Blue
    { fill: '#48bb78', stroke: '#276749' }, // Green
    { fill: '#ed8936', stroke: '#c05621' }, // Orange
    { fill: '#e53e3e', stroke: '#9b2c2c' }, // Red
    { fill: '#9f7aea', stroke: '#6b46c1' }, // Purple
    { fill: '#38b2ac', stroke: '#234e52' }, // Teal
  ];

  const shapes: RectangleShape[] = [];

  // Create a grid of rectangles
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const colorIndex = row * 3 + col;
      const color = colors[colorIndex] || colors[0];

      shapes.push({
        id: nanoid(),
        type: 'rectangle',
        x: -200 + col * 200,
        y: -100 + row * 150,
        width: 120,
        height: 80,
        rotation: 0,
        opacity: DEFAULT_RECTANGLE.opacity,
        locked: DEFAULT_RECTANGLE.locked,
        visible: DEFAULT_RECTANGLE.visible,
        fill: color!.fill,
        stroke: color!.stroke,
        strokeWidth: 2,
        cornerRadius: 8,
      });
    }
  }

  // Add a title rectangle at the top
  shapes.push({
    id: nanoid(),
    type: 'rectangle',
    x: 0,
    y: -250,
    width: 300,
    height: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: '#2c3e50',
    stroke: '#1a252f',
    strokeWidth: 2,
    cornerRadius: 12,
  });

  // Add some rotated rectangles
  shapes.push({
    id: nanoid(),
    type: 'rectangle',
    x: 350,
    y: -50,
    width: 100,
    height: 100,
    rotation: Math.PI / 6, // 30 degrees
    opacity: 0.9,
    locked: false,
    visible: true,
    fill: '#f6e05e',
    stroke: '#d69e2e',
    strokeWidth: 2,
    cornerRadius: 0,
  });

  shapes.push({
    id: nanoid(),
    type: 'rectangle',
    x: -350,
    y: -50,
    width: 80,
    height: 120,
    rotation: -Math.PI / 8, // -22.5 degrees
    opacity: 0.85,
    locked: false,
    visible: true,
    fill: '#fc8181',
    stroke: '#c53030',
    strokeWidth: 3,
    cornerRadius: 4,
  });

  return shapes;
}

function App() {
  const addShapes = useDocumentStore((state) => state.addShapes);
  const shapeCount = useDocumentStore((state) => state.shapeOrder.length);
  const activePageId = usePageStore((state) => state.activePageId);
  const initializeDefault = usePageStore((state) => state.initializeDefault);
  const initializedRef = useRef(false);
  const persistenceInitializedRef = useRef(false);

  // Document manager modal state
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);

  // Split pane collapse state
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);

  // Theme state
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const toggleTheme = useThemeStore((state) => state.toggle);

  // Auto-save hook
  useAutoSave();

  // Open document manager callback
  const handleOpenDocumentManager = useCallback(() => {
    setIsDocumentManagerOpen(true);
  }, []);

  const handleCloseDocumentManager = useCallback(() => {
    setIsDocumentManagerOpen(false);
  }, []);

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
      // First time use: create default page and add example shapes
      initializeDefault();

      // Set history active page
      const pageId = usePageStore.getState().activePageId;
      if (pageId) {
        useHistoryStore.getState().setActivePage(pageId);
      }
    }
  }, [initializeDefault]);

  // Add example shapes on first run (when no documents exist)
  useEffect(() => {
    // Only add shapes if:
    // 1. Not already initialized
    // 2. We have an active page
    // 3. No shapes exist yet
    // 4. This is a fresh start (first time user)
    if (initializedRef.current) return;
    if (!activePageId) return;
    if (shapeCount > 0) return;

    // Check if this is first time use (no saved documents)
    const documents = usePersistenceStore.getState().documents;
    const hasDocuments = Object.keys(documents).length > 0;
    if (hasDocuments) return; // Don't add example shapes if user has saved docs

    initializedRef.current = true;

    const shapes = createExampleShapes();
    addShapes(shapes);
  }, [addShapes, shapeCount, activePageId]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <FileMenu onOpenDocumentManager={handleOpenDocumentManager} />
          <div className="app-header-title">
            <SaveStatusIndicator />
          </div>
        </div>
        <div className="app-header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
          >
            {resolvedTheme === 'light' ? '\u263E' : '\u2600'}
          </button>
        </div>
      </header>
      <Toolbar />
      <PageTabs />
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

      {/* Document Manager Modal */}
      <DocumentManager
        isOpen={isDocumentManagerOpen}
        onClose={handleCloseDocumentManager}
      />
    </div>
  );
}

export default App;
