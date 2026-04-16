/**
 * Whiteboard store for managing sticky notes.
 *
 * The whiteboard is a document-global overlay for idea tracking.
 * Notes are NOT canvas shapes - they're separate UI elements.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import {
  WhiteboardNote,
  WhiteboardState,
  createEmptyWhiteboardState,
  createNote,
  MIN_NOTE_WIDTH,
  MIN_NOTE_HEIGHT,
  DEFAULT_NOTE_COLOR,
} from '../types/Whiteboard';

/**
 * Whiteboard store state and actions.
 */
export interface WhiteboardStore extends WhiteboardState {
  // Visibility
  toggleVisibility: () => void;
  setVisibility: (isVisible: boolean) => void;

  // Note CRUD
  addNote: (x: number, y: number, color?: string) => string;
  updateNote: (id: string, updates: Partial<WhiteboardNote>) => void;
  deleteNote: (id: string) => void;

  // Position and size
  moveNote: (id: string, x: number, y: number) => void;
  resizeNote: (id: string, width: number, height: number) => void;

  // Z-order
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;

  // Content
  setNoteContent: (id: string, content: string) => void;
  setNoteColor: (id: string, color: string) => void;

  // Bulk operations
  clear: () => void;

  // Persistence
  getSnapshot: () => WhiteboardState;
  loadSnapshot: (snapshot: WhiteboardState) => void;
  reset: () => void;
}

const initialState: WhiteboardState = createEmptyWhiteboardState();

export const useWhiteboardStore = create<WhiteboardStore>()(
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
      const id = nanoid();
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
