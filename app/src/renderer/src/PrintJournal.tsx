import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontSize } from './lib/FontSize'
import { normalizeUrl } from './lib/utils'

export default function PrintJournal() {
  const [htmlContent, setHtmlContent] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    // Listen for data from main process
    // @ts-ignore
    window.api.ipcRenderer.on('journal-data', (_event: any, data: any) => {
      setHtmlContent(data.content)
      if (data.photos) {
        setPhotos(data.photos)
      }
    })
    
    // Add dark mode if needed, but print is usually light
    document.documentElement.classList.remove('dark')
  }, [])

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Typography,
      TextStyle,
      Color,
      FontSize
    ],
    content: htmlContent
  }, [htmlContent])

  useEffect(() => {
    if (editor && htmlContent) {
      setTimeout(() => {
        // @ts-ignore
        window.__journalReady = true
      }, 500)
    }
  }, [editor, htmlContent])

  if (!htmlContent) return <div className="p-8">Loading journal...</div>

  return (
    <div className="bg-white min-h-screen">
      <div className="journal-page w-full p-8 md:px-[70px] md:py-[42px]">
        <div className="prose prose-lg max-w-none text-black prose-a:text-black w-full journal-lines mb-12">
          <EditorContent editor={editor} className="min-h-[400px] outline-none" />
        </div>
        
        {photos.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-xl font-bold mb-6 font-serif">Attached Photos</h3>
            <div className="grid grid-cols-2 gap-6">
              {photos.map((photo, i) => (
                <img 
                  key={i} 
                  src={normalizeUrl(photo)} 
                  alt={`Attachment ${i + 1}`} 
                  className="w-full h-auto rounded-lg shadow-sm"
                  style={{ maxHeight: '400px', objectFit: 'contain', backgroundColor: '#f9f9f9' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
