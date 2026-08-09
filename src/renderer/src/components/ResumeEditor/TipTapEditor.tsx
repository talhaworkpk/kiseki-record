import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { useState, useEffect, useRef } from 'react'

interface TipTapEditorProps {
  content: string
  onChange: (content: string) => void
  editable?: boolean
  placeholder?: string
}

export default function TipTapEditor({ content, onChange, editable = true, placeholder = '' }: TipTapEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [textColor, setTextColor] = useState('#000000')
  const [highlightColor, setHighlightColor] = useState('#ffff00')
  const editorRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight,
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from === to) {
        setShowToolbar(false)
      } else {
        const coords = editor.view.coordsAtPos(to)
        const rect = editorRef.current?.getBoundingClientRect()
        if (rect) {
          setToolbarPosition({ 
            x: coords.left - rect.left + 10, 
            y: coords.top - rect.top 
          })
        }
        setShowToolbar(true)
      }
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          editor?.chain().focus().redo().run()
        } else {
          editor?.chain().focus().undo().run()
        }
      }
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowToolbar(false)
      }
    }
    
    if (editor) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('click', handleClickOutside)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [editor])

  if (!editor) return null

  return (
    <div ref={editorRef} className="relative">
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:not(.ProseMirror-focused) p.is-editor-empty:first-child::before {
          color: #9ca3af;
        }
        .ProseMirror:focus {
          outline: none !important;
        }
      `}</style>
      {showToolbar && editable && (
        <div
          className="absolute z-50 bg-white border border-border rounded-lg shadow-lg p-2 flex gap-1 flex-wrap max-w-md"
          style={{ left: toolbarPosition.x, top: toolbarPosition.y }}
        >
          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value)
              editor.chain().focus().setColor(e.target.value).run()
            }}
            className="w-8 h-8 rounded cursor-pointer"
            title="Text Color"
          />
          
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => {
              setHighlightColor(e.target.value)
              editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
            }}
            className="w-8 h-8 rounded cursor-pointer"
            title="Highlight Color"
          />
          
          <div className="w-px bg-border mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-accent ${editor.isActive('bold') ? 'bg-accent' : ''}`}
            title="Bold"
          >
            <b>B</b>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-accent ${editor.isActive('italic') ? 'bg-accent' : ''}`}
            title="Italic"
          >
            <i>I</i>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-accent ${editor.isActive('underline') ? 'bg-accent' : ''}`}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-accent ${editor.isActive('strike') ? 'bg-accent' : ''}`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          <div className="w-px bg-border mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-accent ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
            title="Bullet List"
          >
            •
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-accent ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
            title="Numbered List"
          >
            1.
          </button>
          <div className="w-px bg-border mx-1" />
          <button
            onClick={() => {
              editor.chain().focus().unsetAllMarks().run()
              editor.chain().focus().unsetColor().run()
              editor.chain().focus().unsetHighlight().run()
            }}
            className="p-2 rounded hover:bg-accent"
            title="Clear Formatting"
          >
            ✕
          </button>
        </div>
      )}
      <div className="ProseMirror min-h-[24px] focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
