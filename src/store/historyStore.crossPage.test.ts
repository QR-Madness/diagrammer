import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useHistoryStore, registerPageStoreActiveId } from './historyStore';
import { useDocumentStore } from './documentStore';
import { usePageStore } from './pageStore';
import { useNotificationStore } from './notificationStore';
import { RectangleShape } from '../shapes/Shape';

function createTestRect(id: string, x = 0): RectangleShape {
  return {
    id,
    type: 'rectangle',
    x,
    y: 0,
    width: 100,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: '#4a90d9',
    stroke: '#2c5282',
    strokeWidth: 2,
    cornerRadius: 0,
  };
}

describe('History Store — cross-page corruption guards', () => {
  beforeEach(() => {
    usePageStore.getState().reset();
    useDocumentStore.getState().clear();
    useHistoryStore.setState({
      pageHistory: {},
      activePageId: null,
      isTracking: true,
    });
    useNotificationStore.setState({ notifications: [] });
  });

  it('isolates undo/redo to the page that owns the entry', async () => {
    const pageA = usePageStore.getState().createPage('A');
    // First page is auto-active; sync history.
    useHistoryStore.getState().setActivePage(pageA);
    registerPageStoreActiveId(pageA);

    // Edit on Page A
    useDocumentStore.getState().addShape(createTestRect('a1'));
    useHistoryStore.getState().push('add a1');

    await new Promise((r) => setTimeout(r, 350));

    // Create + switch to Page B (this exercises the reordered setActivePage)
    const pageB = usePageStore.getState().createPage('B');
    usePageStore.getState().setActivePage(pageB);

    // Page B has no history yet — undo should be a no-op for B
    expect(useHistoryStore.getState().canUndo()).toBe(false);
    useHistoryStore.getState().undo();

    // Page B's documentStore content must be untouched (empty page).
    expect(Object.keys(useDocumentStore.getState().shapes)).toEqual([]);
  });

  it("undo on page B does not pull page A's snapshot into B's bucket", async () => {
    const pageA = usePageStore.getState().createPage('A');
    useHistoryStore.getState().setActivePage(pageA);
    registerPageStoreActiveId(pageA);

    useDocumentStore.getState().addShape(createTestRect('a1'));
    useHistoryStore.getState().push('add a1');

    await new Promise((r) => setTimeout(r, 350));

    const pageB = usePageStore.getState().createPage('B');
    usePageStore.getState().setActivePage(pageB);

    useDocumentStore.getState().addShape(createTestRect('b1'));
    useHistoryStore.getState().push('add b1');

    await new Promise((r) => setTimeout(r, 350));

    useDocumentStore.getState().addShape(createTestRect('b2'));

    // Undo on B should restore B's state, never A's.
    useHistoryStore.getState().undo();
    const shapes = useDocumentStore.getState().shapes;
    expect(shapes['a1']).toBeUndefined();
    expect(shapes['b1']).toBeDefined();
  });

  it("drops a poisoned entry whose pageId doesn't match the bucket", () => {
    // Manually plant a poisoned entry: bucket key is "B" but the entry
    // claims pageId "A". This is exactly the cross-page corruption shape.
    const pageB = 'page-B';
    useHistoryStore.setState({
      activePageId: pageB,
      pageHistory: {
        [pageB]: {
          past: [
            {
              pageId: 'page-A',
              snapshot: { shapes: {}, shapeOrder: [], version: 1 },
              timestamp: Date.now(),
            },
          ],
          future: [],
          lastPushTime: 0,
        },
      },
      isTracking: true,
    });
    registerPageStoreActiveId(pageB);

    // Seed documentStore with B's content so we can verify it's untouched.
    useDocumentStore.setState({
      shapes: { b1: createTestRect('b1') },
      shapeOrder: ['b1'],
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useHistoryStore.getState().undo();

    expect(errSpy).toHaveBeenCalled();
    // documentStore content is untouched — corruption was prevented.
    expect(useDocumentStore.getState().shapes['b1']).toBeDefined();
    // Drop policy: the poisoned entry is removed from the past stack so
    // pressing undo again won't keep tripping the same trap.
    expect(useHistoryStore.getState().pageHistory[pageB]?.past.length).toBe(0);
    errSpy.mockRestore();
  });

  it('drops a poisoned redo entry rather than applying it', () => {
    const pageB = 'page-B';
    useHistoryStore.setState({
      activePageId: pageB,
      pageHistory: {
        [pageB]: {
          past: [],
          future: [
            {
              pageId: 'page-A',
              snapshot: { shapes: {}, shapeOrder: [], version: 1 },
              timestamp: Date.now(),
            },
          ],
          lastPushTime: 0,
        },
      },
      isTracking: true,
    });
    registerPageStoreActiveId(pageB);

    useDocumentStore.setState({
      shapes: { b1: createTestRect('b1') },
      shapeOrder: ['b1'],
    });

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useHistoryStore.getState().redo();

    expect(errSpy).toHaveBeenCalled();
    expect(useDocumentStore.getState().shapes['b1']).toBeDefined();
    expect(useHistoryStore.getState().pageHistory[pageB]?.future.length).toBe(0);
    errSpy.mockRestore();
  });

  it('refuses push when historyStore and pageStore disagree on active page', () => {
    useHistoryStore.setState({
      activePageId: 'history-thinks-A',
      pageHistory: {},
      isTracking: true,
    });
    registerPageStoreActiveId('pageStore-thinks-B');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    useHistoryStore.getState().push('should be blocked');

    expect(errSpy).toHaveBeenCalled();
    // No bucket should have been created/populated.
    expect(useHistoryStore.getState().pageHistory['history-thinks-A']).toBeUndefined();
    errSpy.mockRestore();
  });
});
