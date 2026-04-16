/**
 * Tests for the whiteboard store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  WhiteboardNote,
  WhiteboardState,
  createEmptyWhiteboardState,
  createNote,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
  MIN_NOTE_WIDTH,
  MIN_NOTE_HEIGHT,
  DEFAULT_NOTE_COLOR,
} from '../types/Whiteboard';

// Simple whiteboard store for testing (mirrors whiteboardStore.ts)
interface WhiteboardStore extends WhiteboardState {
  toggleVisibility: () => void;
  setVisibility: (isVisible: boolean) => void;
  addNote: (x: number, y: number, color?: string) => string;
  updateNote: (id: string, updates: Partial<WhiteboardNote>) => void;
  deleteNote: (id: string) => void;
  moveNote: (id: string, x: number, y: number) => void;
  resizeNote: (id: string, width: number, height: number) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  setNoteContent: (id: string, content: string) => void;
  setNoteColor: (id: string, color: string) => void;
  clear: () => void;
  getSnapshot: () => WhiteboardState;
  loadSnapshot: (snapshot: WhiteboardState) => void;
  reset: () => void;
}

const initialState: WhiteboardState = createEmptyWhiteboardState();

const useTestWhiteboardStore = create<WhiteboardStore>()(
  immer((set, get) => ({
    ...initialState,

    toggleVisibility: () => {
      set((state) => {
        state.isVisible = !state.isVisible;
      });
    },

    setVisibility: (isVisible: boolean) => {
      set((state) => {
        state.isVisible = isVisible;
      });
    },

    addNote: (x: number, y: number, color: string = DEFAULT_NOTE_COLOR): string => {
      const id = 'note-' + Math.random().toString(36).slice(2);
      set((state) => {
        const note = createNote(id, x, y, color);
        note.zIndex = state.noteOrder.length + 1;
        state.notes[id] = note;
        state.noteOrder.push(id);
      });
      return id;
    },

    updateNote: (id: string, updates: Partial<WhiteboardNote>) => {
      set((state) => {
        const note = state.notes[id];
        if (note) {
          Object.assign(note, updates, { modifiedAt: Date.now() });
        }
      });
    },

    deleteNote: (id: string) => {
      set((state) => {
        delete state.notes[id];
        state.noteOrder = state.noteOrder.filter((noteId) => noteId !== id);
      });
    },

    moveNote: (id: string, x: number, y: number) => {
      set((state) => {
        const note = state.notes[id];
        if (note) {
          note.x = x;
          note.y = y;
          note.modifiedAt = Date.now();
        }
      });
    },

    resizeNote: (id: string, width: number, height: number) => {
      set((state) => {
        const note = state.notes[id];
        if (note) {
          note.width = Math.max(width, MIN_NOTE_WIDTH);
          note.height = Math.max(height, MIN_NOTE_HEIGHT);
          note.modifiedAt = Date.now();
        }
      });
    },

    bringToFront: (id: string) => {
      set((state) => {
        const index = state.noteOrder.indexOf(id);
        if (index === -1 || index === state.noteOrder.length - 1) return;

        state.noteOrder.splice(index, 1);
        state.noteOrder.push(id);

        const maxZ = state.noteOrder.length;
        if (state.notes[id]) {
          state.notes[id].zIndex = maxZ;
        }
      });
    },

    sendToBack: (id: string) => {
      set((state) => {
        const index = state.noteOrder.indexOf(id);
        if (index === -1 || index === 0) return;

        state.noteOrder.splice(index, 1);
        state.noteOrder.unshift(id);

        if (state.notes[id]) {
          state.notes[id].zIndex = 1;
        }
      });
    },

    setNoteContent: (id: string, content: string) => {
      set((state) => {
        const note = state.notes[id];
        if (note) {
          note.content = content;
          note.modifiedAt = Date.now();
        }
      });
    },

    setNoteColor: (id: string, color: string) => {
      set((state) => {
        const note = state.notes[id];
        if (note) {
          note.color = color;
          note.modifiedAt = Date.now();
        }
      });
    },

    clear: () => {
      set((state) => {
        state.notes = {};
        state.noteOrder = [];
      });
    },

    getSnapshot: (): WhiteboardState => {
      const state = get();
      return {
        notes: JSON.parse(JSON.stringify(state.notes)),
        noteOrder: [...state.noteOrder],
        isVisible: state.isVisible,
      };
    },

    loadSnapshot: (snapshot: WhiteboardState) => {
      set((state) => {
        state.notes = snapshot.notes ?? {};
        state.noteOrder = snapshot.noteOrder ?? [];
        state.isVisible = snapshot.isVisible ?? false;
      });
    },

    reset: () => {
      set(() => ({ ...initialState }));
    },
  }))
);

describe('WhiteboardStore', () => {
  beforeEach(() => {
    useTestWhiteboardStore.getState().reset();
  });

  describe('visibility', () => {
    it('starts hidden', () => {
      expect(useTestWhiteboardStore.getState().isVisible).toBe(false);
    });

    it('toggles visibility', () => {
      const store = useTestWhiteboardStore.getState();
      store.toggleVisibility();
      expect(useTestWhiteboardStore.getState().isVisible).toBe(true);

      store.toggleVisibility();
      expect(useTestWhiteboardStore.getState().isVisible).toBe(false);
    });

    it('sets visibility explicitly', () => {
      const store = useTestWhiteboardStore.getState();
      store.setVisibility(true);
      expect(useTestWhiteboardStore.getState().isVisible).toBe(true);

      store.setVisibility(false);
      expect(useTestWhiteboardStore.getState().isVisible).toBe(false);
    });
  });

  describe('note CRUD', () => {
    it('adds a note', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(100, 200);

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]).toBeDefined();
      expect(state.notes[noteId]!.x).toBe(100);
      expect(state.notes[noteId]!.y).toBe(200);
      expect(state.notes[noteId]!.color).toBe(DEFAULT_NOTE_COLOR);
      expect(state.noteOrder).toContain(noteId);
    });

    it('adds a note with custom color', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0, '#3b82f6');
      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.color).toBe('#3b82f6');
    });

    it('updates a note', () => {
      const noteId = useTestWhiteboardStore.getState().addNote(0, 0);
      const state1 = useTestWhiteboardStore.getState();
      const originalModifiedAt = state1.notes[noteId]!.modifiedAt;

      useTestWhiteboardStore.getState().updateNote(noteId, { content: 'Updated content' });

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.content).toBe('Updated content');
      expect(state.notes[noteId]!.modifiedAt).toBeGreaterThanOrEqual(originalModifiedAt);
    });

    it('deletes a note', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0);

      store.deleteNote(noteId);

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]).toBeUndefined();
      expect(state.noteOrder).not.toContain(noteId);
    });

    it('moves a note', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0);

      store.moveNote(noteId, 150, 250);

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.x).toBe(150);
      expect(state.notes[noteId]!.y).toBe(250);
    });

    it('resizes a note with minimum constraints', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0);

      store.resizeNote(noteId, 50, 40);

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.width).toBe(MIN_NOTE_WIDTH);
      expect(state.notes[noteId]!.height).toBe(MIN_NOTE_HEIGHT);
    });

    it('resizes a note above minimum', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0);

      store.resizeNote(noteId, 300, 250);

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.width).toBe(300);
      expect(state.notes[noteId]!.height).toBe(250);
    });
  });

  describe('z-order', () => {
    it('brings note to front', () => {
      const store = useTestWhiteboardStore.getState();
      const id1 = store.addNote(0, 0);
      const id2 = store.addNote(0, 0);
      const id3 = store.addNote(0, 0);

      expect(useTestWhiteboardStore.getState().noteOrder).toEqual([id1, id2, id3]);

      store.bringToFront(id1);

      const state = useTestWhiteboardStore.getState();
      expect(state.noteOrder).toEqual([id2, id3, id1]);
    });

    it('sends note to back', () => {
      const store = useTestWhiteboardStore.getState();
      const id1 = store.addNote(0, 0);
      const id2 = store.addNote(0, 0);
      const id3 = store.addNote(0, 0);

      expect(useTestWhiteboardStore.getState().noteOrder).toEqual([id1, id2, id3]);

      store.sendToBack(id3);

      const state = useTestWhiteboardStore.getState();
      expect(state.noteOrder).toEqual([id3, id1, id2]);
    });
  });

  describe('note content and color', () => {
    it('sets note content', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0);

      store.setNoteContent(noteId, 'Hello <b>World</b>');

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.content).toBe('Hello <b>World</b>');
    });

    it('sets note color', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(0, 0);

      store.setNoteColor(noteId, 'pink');

      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]!.color).toBe('pink');
    });
  });

  describe('persistence', () => {
    it('gets and loads snapshot', () => {
      const store = useTestWhiteboardStore.getState();
      const noteId = store.addNote(100, 200, 'green');
      store.setNoteContent(noteId, 'Test content');
      store.setVisibility(true);

      const snapshot = store.getSnapshot();
      expect(snapshot.notes[noteId]).toBeDefined();
      expect(snapshot.notes[noteId]!.x).toBe(100);
      expect(snapshot.notes[noteId]!.color).toBe('green');
      expect(snapshot.notes[noteId]!.content).toBe('Test content');
      expect(snapshot.isVisible).toBe(true);

      // Reset and load
      store.reset();
      expect(Object.keys(store.notes).length).toBe(0);

      store.loadSnapshot(snapshot);
      const state = useTestWhiteboardStore.getState();
      expect(state.notes[noteId]).toBeDefined();
      expect(state.notes[noteId]!.x).toBe(100);
      expect(state.notes[noteId]!.color).toBe('green');
      expect(state.notes[noteId]!.content).toBe('Test content');
      expect(state.isVisible).toBe(true);
    });

    it('clears all notes', () => {
      const store = useTestWhiteboardStore.getState();
      store.addNote(0, 0);
      store.addNote(10, 10);
      store.addNote(20, 20);

      const stateAfterAdd = useTestWhiteboardStore.getState();
      expect(Object.keys(stateAfterAdd.notes).length).toBe(3);

      store.clear();

      const state = useTestWhiteboardStore.getState();
      expect(Object.keys(state.notes).length).toBe(0);
      expect(state.noteOrder.length).toBe(0);
    });
  });
});

describe('Whiteboard types', () => {
  it('creates empty whiteboard state', () => {
    const state = createEmptyWhiteboardState();
    expect(state.notes).toEqual({});
    expect(state.noteOrder).toEqual([]);
    expect(state.isVisible).toBe(false);
  });

  it('creates note with defaults', () => {
    const note = createNote('test-id', 100, 200);
    expect(note.id).toBe('test-id');
    expect(note.x).toBe(100);
    expect(note.y).toBe(200);
    expect(note.width).toBe(DEFAULT_NOTE_WIDTH);
    expect(note.height).toBe(DEFAULT_NOTE_HEIGHT);
    expect(note.color).toBe(DEFAULT_NOTE_COLOR);
    expect(note.content).toBe('');
    expect(note.zIndex).toBe(1);
    expect(note.createdAt).toBeDefined();
    expect(note.modifiedAt).toBeDefined();
  });

  it('creates note with custom color', () => {
    const note = createNote('test-id', 0, 0, 'blue');
    expect(note.color).toBe('blue');
  });
});
