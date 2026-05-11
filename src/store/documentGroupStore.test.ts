import { beforeEach, describe, expect, it } from 'vitest';
import { useDocumentGroupStore } from './documentGroupStore';

function reset() {
  useDocumentGroupStore.getState().reset();
}

describe('documentGroupStore', () => {
  beforeEach(reset);

  it('creates groups with unique ids and incrementing order', () => {
    const { createGroup, listGroups } = useDocumentGroupStore.getState();
    const a = createGroup('Work');
    const b = createGroup('Personal', '#3b82f6');
    expect(a).not.toBe('');
    expect(b).not.toBe('');
    expect(a).not.toBe(b);

    const groups = listGroups();
    expect(groups).toHaveLength(2);
    expect(groups[0]?.name).toBe('Work');
    expect(groups[0]?.order).toBe(0);
    expect(groups[1]?.name).toBe('Personal');
    expect(groups[1]?.color).toBe('#3b82f6');
    expect(groups[1]?.order).toBe(1);
  });

  it('ignores empty group names', () => {
    const id = useDocumentGroupStore.getState().createGroup('   ');
    expect(id).toBe('');
    expect(useDocumentGroupStore.getState().listGroups()).toHaveLength(0);
  });

  it('renames groups, trimming whitespace', () => {
    const id = useDocumentGroupStore.getState().createGroup('Old');
    useDocumentGroupStore.getState().renameGroup(id, '  New Name  ');
    expect(useDocumentGroupStore.getState().groups[id]?.name).toBe('New Name');
  });

  it('does not rename to empty', () => {
    const id = useDocumentGroupStore.getState().createGroup('Keep');
    useDocumentGroupStore.getState().renameGroup(id, '   ');
    expect(useDocumentGroupStore.getState().groups[id]?.name).toBe('Keep');
  });

  it('assigns and reassigns a document to groups', () => {
    const a = useDocumentGroupStore.getState().createGroup('A');
    const b = useDocumentGroupStore.getState().createGroup('B');
    useDocumentGroupStore.getState().assignDocument('doc-1', a);
    expect(useDocumentGroupStore.getState().getGroupForDocument('doc-1')?.id).toBe(a);
    useDocumentGroupStore.getState().assignDocument('doc-1', b);
    expect(useDocumentGroupStore.getState().getGroupForDocument('doc-1')?.id).toBe(b);
    useDocumentGroupStore.getState().assignDocument('doc-1', null);
    expect(useDocumentGroupStore.getState().getGroupForDocument('doc-1')).toBeUndefined();
  });

  it('ignores assignment to unknown group', () => {
    useDocumentGroupStore.getState().assignDocument('doc-1', 'nonexistent');
    expect(useDocumentGroupStore.getState().getGroupForDocument('doc-1')).toBeUndefined();
  });

  it('assignMany applies to all documents', () => {
    const a = useDocumentGroupStore.getState().createGroup('A');
    useDocumentGroupStore.getState().assignMany(['d1', 'd2', 'd3'], a);
    expect(useDocumentGroupStore.getState().assignments).toEqual({ d1: a, d2: a, d3: a });
    useDocumentGroupStore.getState().assignMany(['d1', 'd3'], null);
    expect(useDocumentGroupStore.getState().assignments).toEqual({ d2: a });
  });

  it('deleting a group unassigns its documents but leaves others intact', () => {
    const a = useDocumentGroupStore.getState().createGroup('A');
    const b = useDocumentGroupStore.getState().createGroup('B');
    useDocumentGroupStore.getState().assignMany(['d1', 'd2'], a);
    useDocumentGroupStore.getState().assignDocument('d3', b);
    useDocumentGroupStore.getState().deleteGroup(a);
    const state = useDocumentGroupStore.getState();
    expect(state.groups[a]).toBeUndefined();
    expect(state.assignments).toEqual({ d3: b });
  });

  it('recolorGroup sets and clears color', () => {
    const id = useDocumentGroupStore.getState().createGroup('A', '#ef4444');
    useDocumentGroupStore.getState().recolorGroup(id, '#10b981');
    expect(useDocumentGroupStore.getState().groups[id]?.color).toBe('#10b981');
    useDocumentGroupStore.getState().recolorGroup(id, undefined);
    expect(useDocumentGroupStore.getState().groups[id]?.color).toBeUndefined();
  });

  it('reorderGroups updates order to match given sequence', () => {
    const a = useDocumentGroupStore.getState().createGroup('A');
    const b = useDocumentGroupStore.getState().createGroup('B');
    const c = useDocumentGroupStore.getState().createGroup('C');
    useDocumentGroupStore.getState().reorderGroups([c, a, b]);
    const ordered = useDocumentGroupStore.getState().listGroups().map((g) => g.id);
    expect(ordered).toEqual([c, a, b]);
  });
});
