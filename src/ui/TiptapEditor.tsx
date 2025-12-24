/**
 * TiptapEditor component - Core rich text editor wrapper.
 *
 * Uses Tiptap (ProseMirror) for rich text editing with:
 * - Headings (H1, H2, H3)
 * - Bold, italic, inline code
 * - Bullet and numbered lists
 * - Horizontal rules
 * - Images (stored in IndexedDB with blob:// URLs)
 */

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { useRichTextStore } from '../store/richTextStore';
import { blobStorage } from '../storage/BlobStorage';
import './TiptapEditor.css';

/**
 * Cache of object URLs for blob:// images.
 * Maps blob ID to object URL.
 */
const blobObjectUrls = new Map<string, string>();

/**
 * Convert blob:// URL to object URL by loading from IndexedDB.
 * Caches object URLs to avoid repeated loads.
 */
async function getBlobObjectUrl(blobUrl: string): Promise<string | null> {
  // Check if it's a blob:// URL
  if (!blobUrl.startsWith('blob://')) {
    return blobUrl; // Return as-is for regular URLs
  }

  const blobId = blobUrl.replace('blob://', '');

  // Check cache
  if (blobObjectUrls.has(blobId)) {
    return blobObjectUrls.get(blobId)!;
  }

  // Load from IndexedDB
  try {
    const blob = await blobStorage.loadBlob(blobId);
    if (!blob) {
      console.warn(`Blob not found: ${blobId}`);
      return null;
    }

    const objectUrl = URL.createObjectURL(blob);
    blobObjectUrls.set(blobId, objectUrl);
    return objectUrl;
  } catch (error) {
    console.error(`Failed to load blob: ${blobId}`, error);
    return null;
  }
}

/**
 * Configure Tiptap extensions for initial scope.
 */
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // These are enabled by default, no need to set true
    // bulletList, orderedList, horizontalRule, bold, italic, code
    // Disabled for initial scope
    blockquote: false,
    codeBlock: false,
    strike: false,
  }),
  Placeholder.configure({
    placeholder: 'Start writing your document...',
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
];

export interface TiptapEditorProps {
  /** Optional class name */
  className?: string;
}

export function TiptapEditor({ className }: TiptapEditorProps) {
  const content = useRichTextStore((state) => state.content);
  const setContent = useRichTextStore((state) => state.setContent);

  const editor = useEditor({
    extensions,
    content: content.content,
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prose',
      },
    },
  });

  // Update editor content when loaded from document
  useEffect(() => {
    if (editor && content.content) {
      // Only update if content is different to avoid cursor jump
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content.content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content.content);
      }
    }
  }, [editor, content.content]);

  // Expose editor instance for toolbar
  useEffect(() => {
    if (editor) {
      // Store editor reference for toolbar access
      (window as unknown as { __tiptapEditor?: typeof editor }).__tiptapEditor = editor;
    }
    return () => {
      delete (window as unknown as { __tiptapEditor?: typeof editor }).__tiptapEditor;
    };
  }, [editor]);

  // Convert blob:// URLs to object URLs for rendering
  useEffect(() => {
    if (!editor) return;

    const convertBlobUrls = async () => {
      const editorElement = editor.view.dom;
      const images = editorElement.querySelectorAll('img[src^="blob://"]');

      for (const element of Array.from(images)) {
        const img = element as HTMLImageElement;
        const blobUrl = img.getAttribute('src');
        if (!blobUrl) continue;

        const objectUrl = await getBlobObjectUrl(blobUrl);
        if (objectUrl && objectUrl !== blobUrl) {
          img.setAttribute('src', objectUrl);
        } else if (!objectUrl) {
          // Show placeholder for missing blobs
          img.setAttribute('alt', '(Image not found)');
          img.style.border = '2px dashed var(--border-color)';
          img.style.padding = '8px';
        }
      }
    };

    // Convert on initial load
    convertBlobUrls();

    // Convert whenever content updates
    const handleUpdate = () => {
      convertBlobUrls();
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  return (
    <div className={`tiptap-editor ${className ?? ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Get the current Tiptap editor instance.
 * Used by the toolbar to execute commands.
 */
export function getTiptapEditor() {
  return (window as unknown as { __tiptapEditor?: ReturnType<typeof useEditor> }).__tiptapEditor;
}
