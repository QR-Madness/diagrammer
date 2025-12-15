import { Tool, ToolContext } from './tools/Tool';
import { NormalizedPointerEvent } from './InputHandler';
import { Vec2 } from '../math/Vec2';
import { ToolType } from '../store/sessionStore';

/**
 * Manages tool registration, activation, and event forwarding.
 *
 * The ToolManager:
 * - Registers available tools
 * - Handles tool switching with proper activation/deactivation lifecycle
 * - Forwards input events to the active tool
 * - Provides the active tool's overlay render callback
 *
 * Usage:
 * ```typescript
 * const toolManager = new ToolManager(toolContext);
 *
 * // Register tools
 * toolManager.register(new SelectTool());
 * toolManager.register(new PanTool());
 * toolManager.register(new RectangleTool());
 *
 * // Activate a tool
 * toolManager.setActiveTool('select');
 *
 * // Forward events (usually called by InputHandler)
 * toolManager.handlePointerEvent(event);
 * toolManager.handleKeyDown(keyEvent);
 * ```
 */
export class ToolManager {
  private tools: Map<ToolType, Tool> = new Map();
  private activeTool: Tool | null = null;
  private context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  /**
   * Register a tool.
   * @param tool - The tool to register
   * @throws Error if a tool with the same type is already registered
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.type)) {
      throw new Error(`Tool already registered: ${tool.type}`);
    }
    this.tools.set(tool.type, tool);
  }

  /**
   * Unregister a tool.
   * If the tool is currently active, it will be deactivated first.
   * @param type - The tool type to unregister
   * @returns true if the tool was removed, false if not found
   */
  unregister(type: ToolType): boolean {
    if (this.activeTool?.type === type) {
      this.activeTool.onDeactivate(this.context);
      this.activeTool = null;
    }
    return this.tools.delete(type);
  }

  /**
   * Set the active tool.
   * Handles deactivation of previous tool and activation of new tool.
   * @param type - The tool type to activate
   * @throws Error if the tool type is not registered
   */
  setActiveTool(type: ToolType): void {
    const tool = this.tools.get(type);
    if (!tool) {
      throw new Error(`Tool not registered: ${type}`);
    }

    // Skip if already active
    if (this.activeTool === tool) {
      return;
    }

    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate(this.context);
    }

    // Activate new tool
    this.activeTool = tool;
    this.activeTool.onActivate(this.context);
  }

  /**
   * Get the active tool.
   */
  getActiveTool(): Tool | null {
    return this.activeTool;
  }

  /**
   * Get the active tool type.
   */
  getActiveToolType(): ToolType | null {
    return this.activeTool?.type ?? null;
  }

  /**
   * Check if a tool is registered.
   */
  hasToolRegistered(type: ToolType): boolean {
    return this.tools.has(type);
  }

  /**
   * Get all registered tool types.
   */
  getRegisteredTools(): ToolType[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool by type.
   */
  getTool(type: ToolType): Tool | undefined {
    return this.tools.get(type);
  }

  /**
   * Update the tool context.
   * Call this when context dependencies change.
   */
  setContext(context: ToolContext): void {
    this.context = context;
  }

  // Event forwarding

  /**
   * Forward a pointer event to the active tool.
   */
  handlePointerEvent(event: NormalizedPointerEvent): void {
    if (!this.activeTool) return;

    switch (event.type) {
      case 'down':
        this.activeTool.onPointerDown(event, this.context);
        break;
      case 'move':
        this.activeTool.onPointerMove(event, this.context);
        break;
      case 'up':
        this.activeTool.onPointerUp(event, this.context);
        break;
    }
  }

  /**
   * Forward a key down event to the active tool.
   * @returns true if the event was handled
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    // First, check for tool shortcuts (only when not interacting)
    if (!event.ctrlKey && !event.altKey && !event.metaKey) {
      const shortcutTool = this.findToolByShortcut(event.key.toLowerCase());
      if (shortcutTool && shortcutTool !== this.activeTool) {
        // Use context.setActiveTool to update both ToolManager and sessionStore
        this.context.setActiveTool(shortcutTool.type);
        return true;
      }
    }

    // Forward to active tool
    if (this.activeTool?.onKeyDown) {
      return this.activeTool.onKeyDown(event, this.context);
    }
    return false;
  }

  /**
   * Forward a key up event to the active tool.
   * @returns true if the event was handled
   */
  handleKeyUp(event: KeyboardEvent): boolean {
    if (this.activeTool?.onKeyUp) {
      return this.activeTool.onKeyUp(event, this.context);
    }
    return false;
  }

  /**
   * Forward a wheel event to the active tool.
   * @returns true if the event was handled
   */
  handleWheel(event: WheelEvent, worldPoint: Vec2): boolean {
    if (this.activeTool?.onWheel) {
      return this.activeTool.onWheel(event, worldPoint, this.context);
    }
    return false;
  }

  /**
   * Get the tool overlay render callback for the Renderer.
   * Returns null if the active tool doesn't have an overlay.
   */
  getToolOverlayCallback(): ((ctx: CanvasRenderingContext2D) => void) | null {
    if (!this.activeTool?.renderOverlay) {
      return null;
    }

    return (ctx: CanvasRenderingContext2D) => {
      this.activeTool?.renderOverlay?.(ctx, this.context);
    };
  }

  /**
   * Find a tool by its keyboard shortcut.
   */
  private findToolByShortcut(key: string): Tool | undefined {
    for (const tool of this.tools.values()) {
      if (tool.shortcut === key) {
        return tool;
      }
    }
    return undefined;
  }

  /**
   * Clean up the tool manager.
   * Deactivates the current tool.
   */
  destroy(): void {
    if (this.activeTool) {
      this.activeTool.onDeactivate(this.context);
      this.activeTool = null;
    }
    this.tools.clear();
  }
}
