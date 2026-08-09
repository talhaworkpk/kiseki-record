import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import TiptapLink from '@tiptap/extension-link'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import { ResizableImageExtension } from '../components/journal/ResizableImageExtension'
import { JournalEntry } from '../types'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, MoreVertical, MapPin, Cloud, Smile, Plus, Image as ImageIcon, Sparkles, Check, Download, Trash2, Copy, FileText, AlignLeft, List, ListTodo, Bold, Italic, Heading1, Heading2, Quote, Highlighter, Clock, X, Underline as UnderlineIcon, Palette, Calendar, Minus, Undo2, Redo2, Eraser, Upload, LayoutDashboard, Edit2, Eye, Paperclip, Film, Music } from 'lucide-react'
import { normalizeUrl, getSafeMediaUrl } from '../lib/utils'
import { FontSize } from '../lib/FontSize'
import JournalPreviewModal from '../components/journal/JournalPreviewModal'
import { NotificationEngine } from '../lib/NotificationEngine'

const MOODS = [
  { emoji: '😀', label: 'Happy', value: 'happy' },
  { emoji: '😌', label: 'Calm', value: 'calm' },
  { emoji: '😐', label: 'Neutral', value: 'neutral' },
  { emoji: '😔', label: 'Sad', value: 'sad' },
  { emoji: '😡', label: 'Angry', value: 'angry' },
  { emoji: '😴', label: 'Tired', value: 'tired' }
]

// Utility to categorize journal entries
const categorizeEntries = (entries: JournalEntry[], searchQuery: string) => {
  const filtered = entries.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return e.content.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q)) || e.mood.toLowerCase().includes(q)
  })
  
  const today: JournalEntry[] = []
  const yesterday: JournalEntry[] = []
  const thisWeek: JournalEntry[] = []
  const older: JournalEntry[] = []
  
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - (86400000 * 7)

  filtered.forEach(e => {
    if (e.createdAt >= todayStart) today.push(e)
    else if (e.createdAt >= yesterdayStart) yesterday.push(e)
    else if (e.createdAt >= weekStart) thisWeek.push(e)
    else older.push(e)
  })
  
  return { today, yesterday, thisWeek, older }
}

const MenuBar = ({ editor, onPreview }: { editor: any, onPreview: () => void }) => {
  if (!editor) return null

  const currentSize = editor.getAttributes('textStyle').fontSize || '18px'
  const numericSize = parseInt(currentSize) || 18

  const [localSize, setLocalSize] = useState(numericSize.toString())
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalSize(numericSize.toString())
  }, [numericSize])

  const setSize = (size: number) => {
    if (size >= 8 && size <= 96) {
      editor.chain().focus().setFontSize(`${size}px`).run()
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      editor.chain().focus().setImage({ src }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-1 p-2 bg-card border-b border-border text-muted-foreground overflow-x-auto select-none sticky top-0 z-40 shadow-sm">
      <button title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-accent disabled:opacity-30"><Undo2 size={16}/></button>
      <button title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-accent disabled:opacity-30"><Redo2 size={16}/></button>
      <div className="w-px h-4 bg-border mx-1"></div>
      
      <button title="Preview" onClick={onPreview} className="p-1.5 rounded hover:bg-accent hover:text-primary transition-colors">
        <Eye size={16}/>
      </button>

      <div className="w-px h-4 bg-border mx-1"></div>
      
      <button title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('bold') ? 'bg-accent text-foreground' : ''}`}><Bold size={16}/></button>
      <button title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('italic') ? 'bg-accent text-foreground' : ''}`}><Italic size={16}/></button>
      <button title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('underline') ? 'bg-accent text-foreground' : ''}`}><UnderlineIcon size={16}/></button>
      
      <div className="w-px h-4 bg-border mx-1"></div>
      <button title="Heading 1" onClick={() => editor.chain().focus().setFontSize('32px').setBold().run()} className="p-1.5 rounded hover:bg-accent hover:text-foreground"><Heading1 size={16}/></button>
      <button title="Heading 2" onClick={() => editor.chain().focus().setFontSize('24px').setBold().run()} className="p-1.5 rounded hover:bg-accent hover:text-foreground"><Heading2 size={16}/></button>
      
      <div className="w-px h-4 bg-border mx-1"></div>
      <button title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('bulletList') ? 'bg-accent text-foreground' : ''}`}><List size={16}/></button>
      <button title="Task List" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('taskList') ? 'bg-accent text-foreground' : ''}`}><ListTodo size={16}/></button>
      <button title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('blockquote') ? 'bg-accent text-foreground' : ''}`}><Quote size={16}/></button>
      
      <div className="w-px h-4 bg-border mx-1"></div>
      <button title="Highlight Color" onClick={() => editor.chain().focus().toggleHighlight().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('highlight') ? 'bg-accent text-foreground' : ''}`}><Highlighter size={16}/></button>
      <label title="Text Color" className="p-1.5 rounded hover:bg-accent hover:text-foreground cursor-pointer flex items-center gap-1 relative overflow-hidden">
        <Palette size={16}/>
        <input type="color" value={editor.getAttributes('textStyle').color || '#000000'} onChange={e => editor.chain().focus().setColor(e.target.value).run()} className="absolute w-full h-full opacity-0 cursor-pointer" />
      </label>
      <button title="Clear Formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()} className="p-1.5 rounded hover:bg-accent hover:text-foreground"><Eraser size={16}/></button>

      <div className="w-px h-4 bg-border mx-1"></div>
      
      <button title="Add Photo" onClick={() => photoInputRef.current?.click()} className="p-1.5 rounded hover:bg-accent hover:text-primary transition-colors">
        <ImageIcon size={16}/>
      </button>
      <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />

      <div className="w-px h-4 bg-border mx-1"></div>
      <div className="flex items-center bg-accent/30 rounded-md border border-border">
        <button title="Decrease Font Size" onClick={() => setSize(numericSize - 1)} className="p-1 hover:bg-accent rounded-l-md"><Minus size={14}/></button>
        <input 
          title="Font Size"
          type="text"
          value={localSize}
          onChange={e => setLocalSize(e.target.value)}
          onBlur={() => {
            const val = parseInt(localSize)
            if (!isNaN(val) && val >= 8 && val <= 96) {
              setSize(val)
            } else {
              setLocalSize(numericSize.toString())
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = parseInt(localSize)
              if (!isNaN(val) && val >= 8 && val <= 96) {
                setSize(val)
              } else {
                setLocalSize(numericSize.toString())
              }
              (e.target as HTMLInputElement).blur()
            }
          }}
          className="w-8 text-center bg-transparent text-xs font-medium outline-none"
        />
        <span className="text-[10px] text-muted-foreground mr-1">px</span>
        <button title="Increase Font Size" onClick={() => setSize(numericSize + 1)} className="p-1 hover:bg-accent rounded-r-md"><Plus size={14}/></button>
      </div>
    </div>
  )
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      TiptapLink.configure({ openOnClick: false }),
      Typography,
      TextStyle,
      Color,
      FontSize,
      ResizableImageExtension,
      Placeholder.configure({ placeholder: 'Start writing your journal...' }),
      CharacterCount.configure({ limit: null })
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (activeEntry) {
        debouncedSave(activeEntry._id, html)
      }
    }
  })

  const importInputRef = useRef<HTMLInputElement>(null)

  const exportToPdf = async () => {
    setShowOptions(false)
    if (!activeEntry) return
    setSaveStatus('saving') // Using saving status to indicate activity
    try {
      // @ts-ignore
      const pdfBuffer = await window.api.export.journalPdf(activeEntry)
      
      const uint8Array = new Uint8Array(pdfBuffer)
      const blob = new Blob([uint8Array], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeEntry.title || 'Journal_Entry'}.pdf`
      a.click()
      
      setTimeout(() => URL.revokeObjectURL(url), 100)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error: any) {
      console.error('Failed to export PDF:', error)
      alert(`Failed to export PDF: ${error?.message || 'Unknown error. Please try reloading the app (Ctrl+R) if you just updated.'}`)
      setSaveStatus('idle')
    }
  }

  const exportToWord = () => {
    setShowOptions(false)
    if (!activeEntry) return
    const title = activeEntry.title || 'Journal_Entry'
    const htmlContent = editor?.getHTML() || ''
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title></head><body>`;
    const footer = `</body></html>`;
    const sourceHTML = header + htmlContent + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportBackup = async () => {
    setShowOptions(false)
    if (!activeEntry) return
    
    setSaveStatus('saving')
    try {
      const backupEntry = { ...activeEntry }
      
      // Embed photos as base64 so they are portable
      if (backupEntry.photos && backupEntry.photos.length > 0) {
        const base64Photos = await Promise.all(backupEntry.photos.map(async (photoPath) => {
          try {
            const url = 'file:///' + photoPath.replace(/\\/g, '/')
            const res = await fetch(url)
            const blob = await res.blob()
            return new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          } catch (e) {
            console.error('Failed to embed photo', e)
            return null
          }
        }))
        // @ts-ignore
        backupEntry.embeddedPhotos = base64Photos.filter(Boolean)
      }

      const title = activeEntry.title || 'Journal_Entry'
      const blob = new Blob([JSON.stringify(backupEntry, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title}_backup.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 100)
      
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      console.error(e)
      setSaveStatus('idle')
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowOptions(false)
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = ev.target?.result as string
      if (file.name.endsWith('.json')) {
        try {
          const imported = JSON.parse(content)
          
          let photos = imported.photos || []
          
          // Restore embedded photos to local disk
          if (imported.embeddedPhotos && imported.embeddedPhotos.length > 0) {
            const savedPhotos = await Promise.all(imported.embeddedPhotos.map(async (base64: string) => {
              // @ts-ignore
              const result = await window.api.attachment.saveBase64(base64)
              return result.success ? result.filePath : null
            }))
            photos = savedPhotos.filter(Boolean)
          }

          const newEntry: JournalEntry = {
            ...imported,
            _id: undefined,
            photos,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          // @ts-ignore
          delete newEntry.embeddedPhotos
          // @ts-ignore
          const created = await window.api.db.insert('journal', newEntry)
          setEntries(prev => [created, ...prev])
          setActiveEntry(created)
          editor?.commands.setContent(created.content)
          
          NotificationEngine.notify('success', 'Journal Entry Saved', 'Your journal entry has been saved.', 'Journal')
          NotificationEngine.checkAchievements()
        } catch (err) {
          console.error('Failed to parse JSON backup', err)
        }
      } else {
        if (activeEntry) {
          editor?.commands.setContent(content)
          saveEntry(activeEntry._id!, { content })
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const debouncedSave = (id: string | undefined, content: string) => {
    if (!id) return
    setSaveStatus('saving')
    if (saveTimeout) clearTimeout(saveTimeout)
    setSaveTimeout(setTimeout(() => {
      saveEntry(id, { content, updatedAt: Date.now() })
    }, 1000))
  }

  const fetchEntries = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('journal', {})
      setEntries(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    const targetId = location.state?.entryId || highlightId
    
    if (entries.length > 0 && targetId && !activeEntry) {
      const target = entries.find(e => e._id === targetId)
      if (target) {
        setActiveEntry(target)
        editor?.commands.setContent(target.content)
        // clean up state so it doesn't force re-selection
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
    
    if (highlightId && entries.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`journal-entry-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [entries, location.state, location.search, activeEntry, editor, navigate])

  const saveEntry = async (id: string, updates: Partial<JournalEntry>) => {
    try {
      // @ts-ignore
      await window.api.db.update('journal', { _id: id }, { $set: updates }, {})
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      
      // Update local state smoothly
      setActiveEntry(prev => prev?._id === id ? { ...prev, ...updates } : prev)
      setEntries(prev => prev.map(e => e._id === id ? { ...e, ...updates } : e))
    } catch (err) {
      console.error('Save failed', err)
      setSaveStatus('idle')
    }
  }

  const createNewEntry = async () => {
    const newEntry: JournalEntry = {
      title: '',
      content: '',
      date: new Date().toISOString(),
      mood: 'neutral',
      tags: [],
      isPrivate: false,
      photos: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    try {
      // @ts-ignore
      const created = await window.api.db.insert('journal', newEntry)
      setActiveEntry(created)
      editor?.commands.setContent(created.content)
      setEntries(prev => [...prev, created])
      
      NotificationEngine.notify('success', 'Voice Entry Saved', 'Your voice journal was transcribed and saved.', 'Journal')
      NotificationEngine.checkAchievements()
      
      setTimeout(() => titleInputRef.current?.focus(), 50)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])
  
  useEffect(() => {
    if (activeEntry) {
      setTagInput(activeEntry.tags.join(', '))
    } else {
      setTagInput('')
    }
  }, [activeEntry?._id])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (!activeEntry || !activeEntry._id) return
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      // Accept all image types, not just those with image/* MIME type
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)
      if (isImage) {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const base64 = ev.target?.result as string
          // @ts-ignore
          const result = await window.api.attachment.saveBase64(base64)
          if (result.success) {
            const currentPhotos = activeEntry.photos || []
            const newPhotos = [...currentPhotos, result.filePath]
            saveEntry(activeEntry._id!, { photos: newPhotos })
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handlePhotoRemove = (idx: number) => {
    if (!activeEntry || !activeEntry._id) return
    const photos = [...(activeEntry.photos || [])]
    photos.splice(idx, 1)
    saveEntry(activeEntry._id, { photos })
  }

  const handleAttachMedia = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add()
      if (result.success && result.files && result.files.length > 0) {
        const filePath = result.files[0].filePath
        const currentPhotos = activeEntry?.photos || []
        const newPhotos = [...currentPhotos, filePath]
        saveEntry(activeEntry!._id!, { photos: newPhotos })
      }
    } catch (err) { console.error(err) }
  }

  const runAiTask = async (task: string) => {
    if (!activeEntry) return
    setIsGenerating(true)
    setAiResult(null)
    
    const plainText = editor?.getText() || ''
    let specificTask = task
    if (task === 'Improve the writing of this entry') {
      specificTask = 'Improve the writing of this entry. You MUST keep the original paragraph structure, line breaks, and formatting intact. Return ONLY the improved text. Do NOT include any conversational filler, introductory sentences (e.g., "Here is an improved version..."), or explanations of what you changed. Just output the text.'
    }
    const prompt = `${specificTask}:\n\n${plainText}`

    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags')
      let modelToUse = 'llama3'
      if (res.ok) {
         const data = await res.json()
         if (data.models && data.models.length > 0) modelToUse = data.models[0].name
      }
      
      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToUse, messages: [{ role: 'system', content: 'You are an AI assistant helping a user with their journal.' }, { role: 'user', content: prompt }], stream: false })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiResult(data.message?.content || 'No result generated.')
      } else {
        setAiResult('Error generating content. Make sure Ollama is running.')
      }
    } catch (e) {
      setAiResult('Connection error. Is Ollama running?')
    } finally {
      setIsGenerating(false)
    }
  }

  const grouped = categorizeEntries(entries, searchQuery)

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  return (
    <div className="flex h-full bg-background border-x border-border animate-in fade-in duration-500" onDragOver={e=>e.preventDefault()} onDrop={handleDrop}>
      
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between text-primary font-bold mb-2">
            <span className="flex items-center gap-2"><FileText size={20}/> Journal</span>
            <div className="flex items-center gap-1">
              <Link to="/journal/dashboard" className="p-1.5 hover:bg-primary/10 rounded-md text-primary transition-colors" title="Journal Dashboard">
                <LayoutDashboard size={16}/>
              </Link>
              <Link to="/journal/timeline" className="p-1.5 hover:bg-primary/10 rounded-md text-primary transition-colors" title="Timeline View">
                <Clock size={16}/>
              </Link>
              <Link to="/journal/analytics" className="p-1.5 hover:bg-primary/10 rounded-md text-primary transition-colors" title="Journal Analytics">
                <Sparkles size={16}/>
              </Link>
            </div>
          </div>
          <button onClick={createNewEntry} className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-all">
            <Plus size={16} /> New Entry
          </button>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search entries..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto p-2 space-y-4 scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          
          {grouped.today.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">Today</h3>
              <div className="space-y-1">
                {grouped.today.map(entry => <EntryCard key={entry._id} entry={entry} active={activeEntry?._id===entry._id} onClick={() => { setActiveEntry(entry); editor?.commands.setContent(entry.content) }}/>)}
              </div>
            </div>
          )}

          {grouped.yesterday.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">Yesterday</h3>
              <div className="space-y-1">
                {grouped.yesterday.map(entry => <EntryCard key={entry._id} entry={entry} active={activeEntry?._id===entry._id} onClick={() => { setActiveEntry(entry); editor?.commands.setContent(entry.content) }}/>)}
              </div>
            </div>
          )}
          
          {grouped.thisWeek.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">This Week</h3>
              <div className="space-y-1">
                {grouped.thisWeek.map(entry => <EntryCard key={entry._id} entry={entry} active={activeEntry?._id===entry._id} onClick={() => { setActiveEntry(entry); editor?.commands.setContent(entry.content) }}/>)}
              </div>
            </div>
          )}
          
          {grouped.older.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase px-2 mb-1">Older</h3>
              <div className="space-y-1">
                {grouped.older.map(entry => <EntryCard key={entry._id} entry={entry} active={activeEntry?._id===entry._id} onClick={() => { setActiveEntry(entry); editor?.commands.setContent(entry.content) }}/>)}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative bg-background overflow-hidden">
        {activeEntry ? (
          <>
            {/* Top Stats & Options */}
            <header className="px-8 py-3 border-b border-border flex justify-between items-center bg-card/50">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div> Saving...</>}
                  {saveStatus === 'saved' && <><Check size={12} className="text-green-500"/> Saved</>}
                  {saveStatus === 'idle' && <>Last edited {new Date(activeEntry.updatedAt).toLocaleTimeString()}</>}
                </span>
                
                {editor && (
                  <>
                    <span className="flex items-center gap-1"><AlignLeft size={12}/> {editor.storage.characterCount.words()} words</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {Math.max(1, Math.ceil(editor.storage.characterCount.words() / 200))} min read</span>
                  </>
                )}
              </div>
              
              <div className="relative">
                <button onClick={() => setShowOptions(!showOptions)} className="p-1.5 hover:bg-accent rounded-md transition-colors"><MoreVertical size={16}/></button>
                {showOptions && (
                  <div className="absolute right-0 top-8 w-48 bg-card border border-border rounded-lg shadow-xl py-1 z-50">
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Copy size={14}/> Duplicate</button>
                    <div className="h-px bg-border my-1"></div>
                    <button onClick={exportToWord} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><FileText size={14}/> Export as Word</button>
                    <button onClick={exportToPdf} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><FileText size={14}/> Export as PDF</button>
                    <button onClick={exportBackup} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Download size={14}/> Export Backup</button>
                    <div className="h-px bg-border my-1"></div>
                    <button onClick={() => importInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-2"><Upload size={14}/> Import Diary</button>
                    <div className="h-px bg-border my-1"></div>
                    <button onClick={() => { 
                      // @ts-ignore
                      window.api.db.remove('journal', { _id: activeEntry._id }); 
                      NotificationEngine.notify('warning', 'Journal Entry Deleted', `"${activeEntry.title}" was removed.`, 'Journal');
                      setActiveEntry(null); 
                      fetchEntries(); 
                      setShowOptions(false) 
                    }} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"><Trash2 size={14}/> Delete</button>
                  </div>
                )}
              </div>
              <input type="file" ref={importInputRef} className="hidden" accept=".json,.txt,.md" onChange={handleImport} />
            </header>

            <MenuBar editor={editor} onPreview={() => { if (activeEntry) setShowPreviewModal(true) }} />

            <div className="flex-1 overflow-y-auto px-4 py-8 md:py-12 flex justify-center bg-background/50">
              <div 
                className="journal-page w-full max-w-[1200px] min-h-[calc(100vh-180px)] p-8 md:px-[70px] md:py-[42px] flex flex-col relative pb-[140px] cursor-text"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && target.tagName !== 'SELECT') {
                    const editor = document.querySelector('.ProseMirror') as HTMLElement;
                    if (editor) editor.focus();
                  }
                }}
              >
                
                {/* Title and Metadata */}
                <div className="mb-8 border-b border-border/50 pb-6 relative z-10 cursor-default" onClick={e => e.stopPropagation()}>
                  <input 
                    ref={titleInputRef}
                    type="text"
                    placeholder="Journal entry title..."
                    value={activeEntry.title || ''}
                    onChange={e => saveEntry(activeEntry._id!, { title: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const editor = document.querySelector('.ProseMirror') as HTMLElement;
                        if (editor) editor.focus();
                      }
                    }}
                    className="w-full text-3xl font-bold bg-transparent outline-none mb-4 placeholder:text-muted-foreground/30 text-foreground"
                  />
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md border border-border/50">
                      <Calendar size={14}/>
                      {new Date(activeEntry.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md border border-border/50 group">
                      <Smile size={14}/>
                      <select 
                        value={activeEntry.mood} 
                        onChange={e => saveEntry(activeEntry._id!, { mood: e.target.value })}
                        className="bg-transparent outline-none cursor-pointer appearance-none uppercase"
                      >
                        {MOODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md border border-border/50">
                      <MapPin size={14}/>
                      <input type="text" placeholder="Location" value={activeEntry.location || ''} onChange={e => saveEntry(activeEntry._id!, { location: e.target.value })} className="bg-transparent outline-none w-20 uppercase placeholder:text-muted-foreground/50" />
                    </div>

                    <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md border border-border/50">
                      <Cloud size={14}/>
                      <input type="text" placeholder="Weather" value={activeEntry.weather || ''} onChange={e => saveEntry(activeEntry._id!, { weather: e.target.value })} className="bg-transparent outline-none w-20 uppercase placeholder:text-muted-foreground/50" />
                    </div>

                    <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-md border border-border/50 flex-1 min-w-[150px]">
                      <span className="text-muted-foreground/50">#</span>
                      <input type="text" placeholder="Tags (comma separated)" value={tagInput} onChange={e => setTagInput(e.target.value)} onBlur={() => saveEntry(activeEntry._id!, { tags: tagInput.split(',').map(t => t.trim()).filter(t=>t) })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEntry(activeEntry._id!, { tags: tagInput.split(',').map(t => t.trim()).filter(t=>t) }) } }} className="bg-transparent outline-none w-full uppercase placeholder:text-muted-foreground/50" />
                    </div>
                  </div>
                </div>

                {/* Media Gallery */}
                <div className="mb-8 relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Media Gallery</h3>
                    <button onClick={handleAttachMedia} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-accent hover:bg-primary/20 hover:text-primary rounded-lg transition-colors border border-border">
                      <Paperclip size={14}/> Add Media
                    </button>
                  </div>

                  {activeEntry.photos && activeEntry.photos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeEntry.photos.map((photo, i) => {
                        const isVideo = photo.match(/\.(mp4|webm|mkv|avi|mov|wmv|flv)$/i)
                        const isAudio = photo.match(/\.(mp3|wav|ogg|m4a|aac|wma|flac)$/i)
                        return (
                          <div key={i} className="relative group rounded-xl overflow-hidden shadow-sm border border-border bg-accent/10 flex items-center justify-center p-2">
                            {isVideo ? (
                              <video src={getSafeMediaUrl(photo)} controls className="w-full h-32 object-contain bg-black rounded-lg" />
                            ) : isAudio ? (
                              <div className="w-full flex flex-col items-center justify-center gap-2 py-4">
                                <Music size={24} className="text-cyan-500"/>
                                <audio src={getSafeMediaUrl(photo)} controls className="w-full h-10" />
                              </div>
                            ) : (
                              <img src={normalizeUrl(photo)} className="h-32 w-full object-cover rounded-lg" />
                            )}
                            <button onClick={() => handlePhotoRemove(i)} className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"><Trash2 size={12}/></button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                
                {/* Editor */}
                <div className="prose prose-lg dark:prose-invert max-w-none prose-a:text-primary relative z-10 w-full h-full flex-1 journal-lines">
                  <EditorContent editor={editor} className="min-h-[400px] outline-none focus:outline-none focus:ring-0 border-none" />
                  {editor && (
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-card border border-border shadow-2xl rounded-xl p-1.5 flex items-center gap-1 z-50">
                      <button title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('bold') ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Bold size={16}/></button>
                      <button title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('italic') ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Italic size={16}/></button>
                      <button title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('underline') ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><UnderlineIcon size={16}/></button>
                      <div className="w-px h-4 bg-border mx-1"></div>
                      <button title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('heading', { level: 1 }) ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Heading1 size={16}/></button>
                      <button title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-accent hover:text-foreground ${editor.isActive('heading', { level: 2 }) ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}><Heading2 size={16}/></button>
                      <div className="w-px h-4 bg-border mx-1"></div>
                      <label title="Text Color" className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 relative overflow-hidden">
                        <Palette size={16}/>
                        <input 
                          type="color" 
                          value={editor.getAttributes('textStyle').color || '#000000'}
                          onChange={e => editor.chain().focus().setColor(e.target.value).run()}
                          className="absolute w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      <label title="Highlight Color" className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 relative overflow-hidden">
                        <Highlighter size={16}/>
                        <input 
                          type="color" 
                          value={editor.getAttributes('highlight').color || '#ffff00'}
                          onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                          className="absolute w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                    </BubbleMenu>
                  )}
                </div>
                
              </div>
            </div>

            {/* AI Assistant Floating Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-md border border-border/50 rounded-full shadow-2xl flex items-center p-2 gap-1 z-40 transition-all hover:bg-card">
              <span className="px-4 text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Sparkles size={14} className="text-primary"/> AI Tools</span>
              <div className="w-px h-5 bg-border mx-2"></div>
              <button onClick={() => runAiTask('Summarize this journal entry')} disabled={isGenerating || !editor?.getText().trim()} className="px-4 py-1.5 hover:bg-accent text-sm font-medium rounded-full transition-colors disabled:opacity-50">Summarize</button>
              <button onClick={() => runAiTask('Improve the writing of this entry')} disabled={isGenerating || !editor?.getText().trim()} className="px-4 py-1.5 hover:bg-accent text-sm font-medium rounded-full transition-colors disabled:opacity-50">Improve Writing</button>
              <button onClick={() => runAiTask('Extract key themes from this entry')} disabled={isGenerating || !editor?.getText().trim()} className="px-4 py-1.5 hover:bg-accent text-sm font-medium rounded-full transition-colors disabled:opacity-50">Find Themes</button>
            </div>
            
            {/* AI Result Modal */}
            {aiResult && (
              <div className="absolute top-4 right-4 w-96 bg-card border border-border rounded-xl shadow-2xl p-4 animate-in slide-in-from-right z-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-primary"/> AI Suggestion</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { navigator.clipboard.writeText(aiResult); }} className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="Copy to clipboard"><Copy size={16}/></button>
                    <button onClick={() => setAiResult(null)} className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground" title="Close"><X size={16}/></button>
                  </div>
                </div>
                <div className="text-sm text-foreground max-h-96 overflow-y-auto prose dark:prose-invert prose-sm whitespace-pre-wrap">
                  {aiResult}
                </div>
              </div>
            )}
            
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <FileText size={48} className="opacity-20" />
            <p>Select an entry from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
      
      <JournalPreviewModal
        isOpen={showPreviewModal}
        entry={activeEntry}
        onClose={() => setShowPreviewModal(false)}
      />
    </div>
  )
}

function EntryCard({ entry, active, onClick }: { entry: JournalEntry, active: boolean, onClick: () => void }) {
  const mood = MOODS.find(m => m.value === entry.mood)
  
  // Extract a brief preview from content
  const preview = entry.content.replace(/<[^>]+>/g, '').substring(0, 60) + '...'
  
  // Extract images from content and combine with attached photos
  const imgMatches = entry.content.match(/<img[^>]+src=["']([^"'>]+)["']/g)
  const contentImages = imgMatches ? imgMatches.map(m => m.match(/src=["']([^"'>]+)["']/)?.[1]).filter(Boolean) as string[] : []
  const images = [...(entry.photos || []), ...contentImages].slice(0, 5) // Limit total just in case

  return (
    <div 
      id={`journal-entry-${entry._id}`}
      className="relative group p-[2px] rounded-xl cursor-pointer transition-all duration-1000"
      onClick={onClick}
    >
      {/* Animated Border Background */}
      <div 
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" 
        style={{ backgroundSize: '300% 100%', animation: 'border-dance 2s linear infinite' }} 
      />
      
      {/* Actual Card Content */}
      <div className={`relative h-full w-full p-3 rounded-[10px] transition-all border ${active ? 'bg-card border-primary/50 shadow-sm' : 'bg-card border-border/50 group-hover:border-transparent'}`}>
        <div className="flex justify-between items-start mb-1">
          <h4 className={`font-medium text-sm truncate pr-2 flex items-center gap-1.5 ${active ? 'text-primary' : 'text-foreground'}`}>
            <span className="opacity-0 translate-y-1 scale-75 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-out flex-shrink-0">{mood?.emoji}</span> 
            <span className="truncate">{entry.title || (entry.tags.length > 0 ? entry.tags[0] : 'Note')}</span>
          </h4>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(entry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
          {preview.length > 3 ? preview : 'Empty entry'}
        </p>

        {/* Image Thumbnails */}
        {images.length > 0 && (
          <div className="flex gap-1 mb-2 overflow-hidden h-8">
            {images.slice(0, 4).map((src, i) => {
              const isVideo = /\.(mp4|webm|ogg|mov|mkv)$/i.test(src)
              const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(src)
              if (isVideo) {
                return <div key={i} className="w-8 h-8 rounded-md bg-accent/50 flex items-center justify-center border border-border shrink-0" title="Video"><Film size={14} className="text-muted-foreground" /></div>
              }
              if (isAudio) {
                return <div key={i} className="w-8 h-8 rounded-md bg-accent/50 flex items-center justify-center border border-border shrink-0" title="Audio"><Music size={14} className="text-muted-foreground" /></div>
              }
              return <img key={i} src={src} className="w-8 h-8 rounded-md object-cover border border-border bg-accent/50 shrink-0" alt="thumbnail" />
            })}
            {images.length > 4 && (
              <div className="w-8 h-8 rounded-md bg-accent text-[10px] flex items-center justify-center font-bold text-muted-foreground border border-border shrink-0">
                +{images.length - 4}
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {(entry.photos?.length || 0) > 0 && (
            <span className="flex items-center gap-1"><ImageIcon size={10}/> {entry.photos!.length}</span>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-1 overflow-hidden items-center justify-end">
              {entry.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="bg-accent px-1.5 py-0.5 rounded-sm truncate max-w-[70px]">
                  {tag}
                </span>
              ))}
              {entry.tags.length > 3 && (
                <span className="bg-accent px-1.5 py-0.5 rounded-sm">
                  +{entry.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
