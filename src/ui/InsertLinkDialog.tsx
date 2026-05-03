import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import type { Mark, MarkType } from '@tiptap/pm/model';
import { useRichTextPagesStore } from '../store/richTextPagesStore';

/**
 * Walk left + right from the current cursor while the same link mark is present,
 * returning the full document range covered by that link mark (or null if the
 * cursor isn't currently inside one).
 */
function findLinkRange(editor: Editor): { from: number; to: number; mark: Mark } | null {
  const { state } = editor;
  const linkType = state.schema.marks['link'] as MarkType | undefined;
  if (!linkType) return null;
  const $pos = state.doc.resolve(state.selection.from);
  const linkMark = $pos.marks().find((m) => m.type === linkType);
  if (!linkMark) return null;

  const matches = (mark: Mark) => mark.type === linkType && mark.attrs['href'] === linkMark.attrs['href'];

  let from = state.selection.from;
  while (from > 0) {
    const probe = state.doc.resolve(from - 1);
    const node = probe.parent.maybeChild(probe.index());
    if (!node || !node.marks.some(matches)) break;
    from--;
  }
  let to = state.selection.to;
  while (to < state.doc.content.size) {
    const probe = state.doc.resolve(to);
    const node = probe.parent.maybeChild(probe.index());
    if (!node || !node.marks.some(matches)) break;
    to++;
  }
  return { from, to, mark: linkMark };
}

export interface InsertLinkDialogProps {
  editor: Editor;
  onClose: () => void;
}

type Mode = 'web' | 'internal';

interface HeadingEntry {
  pageId: string;
  pageName: string;
  index: number;
  level: number;
  text: string;
}

function parseHeadings(pageId: string, pageName: string, html: string): HeadingEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const els = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  return Array.from(els).map((el, i) => ({
    pageId,
    pageName,
    index: i,
    level: parseInt(el.tagName.slice(1), 10),
    text: el.textContent?.trim() ?? '',
  }));
}

const HEADING_HREF_RE = /^diagrammer:\/\/heading\/([^/]+)\/(\d+)$/;

export function InsertLinkDialog({ editor, onClose }: InsertLinkDialogProps) {
  const { pages, pageOrder, activePageId } = useRichTextPagesStore();

  const initial = useMemo(() => {
    const { from, to, empty } = editor.state.selection;
    const linkRange = findLinkRange(editor);
    let selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
    let existingHref = '';
    if (linkRange) {
      // Prefer the full link range when the cursor sits anywhere inside it
      selectedText = editor.state.doc.textBetween(linkRange.from, linkRange.to, ' ');
      existingHref = (linkRange.mark.attrs['href'] as string | undefined) ?? '';
    } else {
      const existing = editor.getAttributes('link') as { href?: string } | undefined;
      existingHref = existing?.href ?? '';
    }
    return { selectedText, existingHref, linkRange };
  }, [editor]);

  // Build a flat list of every heading in every page. The current page uses
  // the live editor HTML so unsaved headings are picked up immediately.
  const headings = useMemo<HeadingEntry[]>(() => {
    const out: HeadingEntry[] = [];
    for (const id of pageOrder) {
      const page = pages[id];
      if (!page) continue;
      const html = id === activePageId ? editor.getHTML() : page.content;
      out.push(...parseHeadings(id, page.name, html));
    }
    return out;
  }, [pages, pageOrder, activePageId, editor]);

  const startMode: Mode = HEADING_HREF_RE.test(initial.existingHref) ? 'internal' : 'web';
  const [mode, setMode] = useState<Mode>(startMode);
  const [url, setUrl] = useState(startMode === 'web' ? initial.existingHref : '');
  const [text, setText] = useState(initial.selectedText);

  const [pickedKey, setPickedKey] = useState<string>(() => {
    const m = initial.existingHref.match(HEADING_HREF_RE);
    if (m) return `${m[1]}::${m[2]}`;
    const first = headings[0];
    return first ? `${first.pageId}::${first.index}` : '';
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const apply = () => {
    let href = '';
    let displayText = text.trim();
    if (mode === 'web') {
      href = url.trim();
      if (!href) return;
      if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        href = `https://${href}`;
      }
    } else {
      if (!pickedKey) return;
      const [pageId, indexStr] = pickedKey.split('::');
      const target = headings.find((h) => h.pageId === pageId && String(h.index) === indexStr);
      if (!target) return;
      href = `diagrammer://heading/${pageId}/${indexStr}`;
      if (!displayText) {
        displayText = target.text || target.pageName;
      }
    }

    const { from, to, empty } = editor.state.selection;
    const finalText = displayText || href;

    // Editing an existing link — wipe the current link's range and write the new content
    if (initial.linkRange) {
      editor
        .chain()
        .focus()
        .setTextSelection(initial.linkRange)
        .deleteSelection()
        .insertContent({
          type: 'text',
          text: finalText,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
      onClose();
      return;
    }

    // Brand-new link
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: finalText,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    } else if (displayText && displayText !== initial.selectedText) {
      // User wants to replace the selected text with new display text
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent({
          type: 'text',
          text: finalText,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    } else {
      // Apply link mark to current selection without changing the text
      editor.chain().focus().setMark('link', { href }).setTextSelection({ from, to }).run();
    }
    onClose();
  };

  const remove = () => {
    if (initial.linkRange) {
      editor
        .chain()
        .focus()
        .setTextSelection(initial.linkRange)
        .unsetMark('link')
        .run();
    } else {
      editor.chain().focus().unsetMark('link').run();
    }
    onClose();
  };

  return createPortal(
    <div className="math-input-modal" onClick={onClose}>
      <div className="math-input-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button className={mode === 'web' ? 'primary' : ''} onClick={() => setMode('web')}>
            Web URL
          </button>
          <button className={mode === 'internal' ? 'primary' : ''} onClick={() => setMode('internal')}>
            Heading
          </button>
        </div>

        {mode === 'web' ? (
          <>
            <label>URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') apply();
              }}
            />
          </>
        ) : (
          <>
            <label>Heading</label>
            {headings.length === 0 ? (
              <div className="math-input-hint">No headings in this document yet.</div>
            ) : (
              <select
                value={pickedKey}
                onChange={(e) => setPickedKey(e.target.value)}
                autoFocus
                size={Math.min(8, headings.length)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') apply();
                }}
              >
                {headings.map((h) => {
                  const indent = '  '.repeat(Math.max(0, h.level - 1));
                  const label = `${h.pageName} — ${indent}${h.text || '(empty heading)'}`;
                  return (
                    <option key={`${h.pageId}::${h.index}`} value={`${h.pageId}::${h.index}`}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
          </>
        )}

        <label style={{ marginTop: 8 }}>Display text (optional)</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'internal' ? 'Defaults to heading text' : 'Leave blank to use URL'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply();
          }}
        />

        <div className="math-input-hint">Press Enter to insert, Escape to cancel</div>
        <div className="math-input-actions">
          {initial.existingHref && (
            <button onClick={remove} style={{ marginRight: 'auto' }}>
              Remove Link
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button onClick={apply} className="primary" disabled={mode === 'internal' && headings.length === 0}>
            {initial.existingHref ? 'Update' : 'Insert'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
