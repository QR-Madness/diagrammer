import './App.css';
import { CanvasContainer } from './CanvasContainer';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Diagrammer</h1>
        <p>Whiteboard Foundation - Phase 1</p>
      </header>
      <main className="app-main">
        <CanvasContainer
          className="canvas-area"
          showGrid={true}
          showFps={true}
        />
      </main>
    </div>
  );
}

export default App;
