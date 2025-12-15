import { useSessionStore, ToolType } from '../store/sessionStore';
import './Toolbar.css';

/**
 * Tool definition for the toolbar.
 */
interface ToolDef {
  type: ToolType;
  name: string;
  icon: string;
  shortcut: string;
}

/**
 * Available tools with their display information.
 */
const TOOLS: ToolDef[] = [
  { type: 'select', name: 'Select', icon: '⬚', shortcut: 'V' },
  { type: 'pan', name: 'Pan', icon: '✋', shortcut: 'H' },
  { type: 'rectangle', name: 'Rectangle', icon: '▭', shortcut: 'R' },
  { type: 'ellipse', name: 'Ellipse', icon: '◯', shortcut: 'O' },
  { type: 'line', name: 'Line', icon: '╱', shortcut: 'L' },
  { type: 'connector', name: 'Connector', icon: '⟷', shortcut: 'C' },
  { type: 'text', name: 'Text', icon: 'T', shortcut: 'T' },
];

/**
 * Toolbar component for selecting tools.
 *
 * Displays tool buttons and shows the currently active tool.
 * Clicking a button or pressing its shortcut key activates the tool.
 */
export function Toolbar() {
  const activeTool = useSessionStore((state) => state.activeTool);
  const setActiveTool = useSessionStore((state) => state.setActiveTool);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            className={`toolbar-button ${activeTool === tool.type ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.type)}
            title={`${tool.name} (${tool.shortcut})`}
          >
            <span className="toolbar-icon">{tool.icon}</span>
            <span className="toolbar-shortcut">{tool.shortcut}</span>
          </button>
        ))}
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-status">
        <span className="toolbar-label">Tool:</span>
        <span className="toolbar-value">{activeTool}</span>
      </div>
    </div>
  );
}

export default Toolbar;
