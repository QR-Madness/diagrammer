import { useEffect, useRef } from 'react';
import './App.css';
import { CanvasContainer } from './CanvasContainer';
import { Toolbar } from './Toolbar';
import { PropertyPanel } from './PropertyPanel';
import { useDocumentStore } from '../store/documentStore';
import { useThemeStore } from '../store/themeStore';
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
  const initializedRef = useRef(false);

  // Theme state
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const toggleTheme = useThemeStore((state) => state.toggle);

  // Add example shapes on first render only
  useEffect(() => {
    // Only add shapes if not already initialized and no shapes exist
    if (initializedRef.current || shapeCount > 0) return;
    initializedRef.current = true;

    const shapes = createExampleShapes();
    addShapes(shapes);
  }, [addShapes, shapeCount]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-title">
          <h1>Diagrammer</h1>
          <p>Whiteboard Foundation - Interactive Demo</p>
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
      <main className="app-main">
        <CanvasContainer
          className="canvas-area"
          showGrid={true}
          showFps={true}
        />
        <PropertyPanel />
      </main>
    </div>
  );
}

export default App;
