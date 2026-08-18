import { useState, useEffect, useRef } from 'react'
import { X, Calendar as CalendarIcon, MapPin, Tag, Users, Paperclip, Folder } from 'lucide-react'
import TipTapEditor from '../ResumeEditor/TipTapEditor'

interface MemoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  personId: string
  initialData?: any
  onSave: () => void
}

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '😍', label: 'Loved' },
  { emoji: '😌', label: 'Peaceful' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '🤩', label: 'Exciting' },
  { emoji: '❤️', label: 'Romantic' },
  { emoji: '🤝', label: 'Meaningful' },
  { emoji: '🎉', label: 'Celebration' }
]

const ALBUMS = [
  'General', 'Birthday', 'Family Trips', 'Eid', 'School', 'University', 'Wedding', 'Vacations', 'Work', 'Gaming', 'Custom'
]

export default function MemoryFormModal({ isOpen, onClose, personId, initialData, onSave }: MemoryFormModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [mood, setMood] = useState('😊 Happy')
  const [album, setAlbum] = useState('General')
  const [rating, setRating] = useState(10) // 1 to 10
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  
  const [relationships, setRelationships] = useState<any[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([personId])
  const [allAlbums, setAllAlbums] = useState<string[]>(ALBUMS.filter(a => a !== 'Custom'))
  const submitBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadRelationships()
      loadAlbums()
      if (initialData) {
        setTitle(initialData.title || '')
        setDate(initialData.date ? new Date(initialData.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))
        setMood(initialData.mood || '😊 Happy')
        setAlbum(initialData.category || 'General')
        setRating(initialData.importance || 10)
        setLocation(initialData.location || '')
        setNotes(initialData.description || '')
        setTags(initialData.tags || [])
        setAttachments(initialData.attachments || [])
        setSelectedPeople(initialData.people || [personId])
      } else {
        setTitle('')
        setDate(new Date().toISOString().slice(0, 10))
        setMood('😊 Happy')
        setAlbum('General')
        setRating(10)
        setLocation('')
        setNotes('')
        setTags([])
        setAttachments([])
        setSelectedPeople([personId])
      }
    }
  }, [isOpen, initialData, personId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        submitBtnRef.current?.click()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const loadRelationships = async () => {
    try {
      // @ts-ignore
      const rels = await window.api.db.find('relationships', {})
      setRelationships(rels)
    } catch(e) { console.error(e) }
  }

  const loadAlbums = async () => {
    try {
      // @ts-ignore
      const records = await window.api.db.find('records', { type: 'Memory' })
      const customCategories = records.map((r: any) => r.category).filter((c: string) => c && !ALBUMS.includes(c))
      const uniqueCustomCategories = Array.from(new Set(customCategories)) as string[]
      setAllAlbums([...ALBUMS.filter(a => a !== 'Custom'), ...uniqueCustomCategories])
    } catch(e) { console.error(e) }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleUpload = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add()
      if (result.success && result.files && result.files.length > 0) {
        setAttachments([...attachments, result.files[0].filePath])
      }
    } catch(e) { console.error(e) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const finalAlbum = album.trim() || 'General'

    const memoryRecord = {
      title,
      type: 'Memory', // Memory Type
      category: finalAlbum, // Store Album in category
      date: new Date(date).getTime(),
      mood,
      importance: rating,
      location,
      people: selectedPeople,
      description: notes,
      tags,
      attachments,
      createdAt: initialData ? initialData.createdAt : Date.now(),
      updatedAt: Date.now(),
      isArchived: false,
      isFavorite: initialData ? initialData.isFavorite : false
    }

    try {
      if (initialData && initialData._id) {
        // @ts-ignore
        await window.api.db.update('records', { _id: initialData._id }, { $set: memoryRecord })
      } else {
        // @ts-ignore
        await window.api.db.insert('records', memoryRecord)
      }
      onSave()
      onClose()
    } catch(err) { console.error(err) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card z-10 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {initialData ? 'Edit Memory' : 'Create New Memory'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column (Metadata) */}
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Memory Title</label>
                  <input required autoFocus value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Birthday Celebration" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><CalendarIcon size={14} className="inline mr-1 -mt-0.5"/> Date</label>
                    <input required value={date} onChange={e=>setDate(e.target.value)} type="date" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><Folder size={14} className="inline mr-1 -mt-0.5"/> Album</label>
                    <input
                      list="albums-list"
                      value={album}
                      onChange={e=>setAlbum(e.target.value)}
                      placeholder="Select or type an album..."
                      className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                    <datalist id="albums-list">
                      {allAlbums.map(a => <option key={a} value={a} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center justify-between">
                    <span>Mood</span>
                    <span className="text-foreground">{mood}</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {MOODS.map(m => (
                      <button type="button" key={m.label} onClick={() => setMood(`${m.emoji} ${m.label}`)} className={`p-2 rounded-xl text-xl flex items-center justify-center border transition-all hover:scale-105 ${mood === `${m.emoji} ${m.label}` ? 'bg-primary/20 border-primary shadow-sm' : 'bg-background border-border hover:border-primary/50'}`}>
                        {m.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center justify-between">
                    <span>Rating (1-10)</span>
                    <span className="text-yellow-500 font-bold">{rating} / 10</span>
                  </label>
                  <input type="range" min="1" max="10" value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="w-full accent-yellow-500" />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><MapPin size={14} className="inline mr-1 -mt-0.5"/> Location</label>
                  <input value={location} onChange={e=>setLocation(e.target.value)} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Lahore" />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><Users size={14} className="inline mr-1 -mt-0.5"/> People Present</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPeople.map(pid => {
                      const p = relationships.find(r => r._id === pid)
                      return (
                        <div key={pid} className="bg-accent text-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          {p ? p.name : pid}
                          <button type="button" onClick={() => setSelectedPeople(selectedPeople.filter(id => id !== pid))} className="hover:text-red-500 text-muted-foreground"><X size={14}/></button>
                        </div>
                      )
                    })}
                  </div>
                  <select onChange={e => {
                    if (e.target.value && !selectedPeople.includes(e.target.value)) {
                      setSelectedPeople([...selectedPeople, e.target.value])
                    }
                    e.target.value = ""
                  }} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm">
                    <option value="">Link another person...</option>
                    {relationships.filter(r => !selectedPeople.includes(r._id)).map(r => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column (Story & Media) */}
              <div className="space-y-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Story Mode</label>
                  <div className="flex-1 border border-border rounded-xl bg-background overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/50">
                    <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none prose-sm">
                      <TipTapEditor content={notes} onChange={setNotes} placeholder="Write down the details of this memory like a diary entry..." />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><Tag size={14} className="inline mr-1 -mt-0.5"/> Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(t => (
                      <div key={t} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1 font-medium">
                        {t}
                        <button type="button" onClick={() => setTags(tags.filter(tag => tag !== t))} className="hover:text-red-500 rounded-full"><X size={14}/></button>
                      </div>
                    ))}
                  </div>
                  <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={handleAddTag} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="Type a tag and press Enter" />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><Paperclip size={14} className="inline mr-1 -mt-0.5"/> Media & Attachments ({attachments.length})</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((a, i) => (
                      <div key={i} className="relative group w-16 h-16 rounded-lg border border-border overflow-hidden bg-accent flex items-center justify-center">
                        {a.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <img src={a} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] uppercase text-muted-foreground font-bold p-1 break-all text-center">{a.split('/').pop()?.slice(0,10)}</span>
                        )}
                        <button type="button" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={16}/>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={handleUpload} className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors hover:text-foreground">
                      <Paperclip size={16} />
                      <span className="text-[10px] font-bold mt-1">Add</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3 shrink-0">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
              <button type="submit" ref={submitBtnRef} className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                {initialData ? 'Save Changes' : 'Create Memory'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
