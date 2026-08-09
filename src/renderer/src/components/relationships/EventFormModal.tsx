import { useState, useEffect } from 'react'
import { X, Calendar as CalendarIcon, MapPin, Tag, Users, Paperclip, Star } from 'lucide-react'
import TipTapEditor from '../ResumeEditor/TipTapEditor'

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  personId: string
  initialData?: any
  onSave: () => void
}

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😍', label: 'Loved' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '😌', label: 'Peaceful' },
  { emoji: '😰', label: 'Stressful' },
  { emoji: '🤩', label: 'Exciting' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😔', label: 'Disappointed' },
  { emoji: '😎', label: 'Relaxed' },
  { emoji: '❤️', label: 'Romantic' },
  { emoji: '🤝', label: 'Meaningful' },
  { emoji: '🎉', label: 'Celebratory' },
  { emoji: '🤒', label: 'Sick' }
]

const CATEGORIES = [
  'Birthday', 'Meeting', 'Graduation', 'Wedding', 'Party', 'Dinner', 'Trip', 'Vacation', 'Gaming', 'Study', 'Coffee', 'Hospital', 'Home Visit', 'Movie', 'Concert', 'Gift', 'Call', 'Conversation', 'Date', 'Religious', 'Custom'
]

export default function EventFormModal({ isOpen, onClose, personId, initialData, onSave }: EventFormModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [mood, setMood] = useState('😊 Happy')
  const [category, setCategory] = useState('Meeting')
  const [rating, setRating] = useState(3)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  
  const [relationships, setRelationships] = useState<any[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([personId])

  useEffect(() => {
    if (isOpen) {
      loadRelationships()
      if (initialData) {
        setTitle(initialData.title || '')
        setDate(initialData.date ? new Date(initialData.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16))
        setMood(initialData.mood || '😊 Happy')
        setCategory(initialData.category || 'Meeting')
        setRating(initialData.importance || 3)
        setLocation(initialData.location || '')
        setNotes(initialData.description || '')
        setTags(initialData.tags || [])
        setAttachments(initialData.attachments || [])
        setSelectedPeople(initialData.people || [personId])
      } else {
        setTitle('')
        setDate(new Date().toISOString().slice(0, 16))
        setMood('😊 Happy')
        setCategory('Meeting')
        setRating(3)
        setLocation('')
        setNotes('')
        setTags([])
        setAttachments([])
        setSelectedPeople([personId])
      }
    }
  }, [isOpen, initialData, personId])

  const loadRelationships = async () => {
    try {
      // @ts-ignore
      const rels = await window.api.db.find('relationships', {})
      setRelationships(rels)
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

    const eventRecord = {
      title,
      type: 'Event',
      category,
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
        await window.api.db.update('records', { _id: initialData._id }, { $set: eventRecord })
      } else {
        // @ts-ignore
        await window.api.db.insert('records', eventRecord)
      }
      onSave()
      onClose()
    } catch(err) { console.error(err) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {initialData ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Event Title</label>
                  <input required autoFocus value={title} onChange={e=>setTitle(e.target.value)} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Birthday Dinner" />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><CalendarIcon size={14} className="inline mr-1 -mt-0.5"/> Date & Time</label>
                  <input required value={date} onChange={e=>setDate(e.target.value)} type="datetime-local" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Category</label>
                    <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Mood</label>
                    <select value={mood} onChange={e=>setMood(e.target.value)} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none">
                      {MOODS.map(m => <option key={m.label} value={`${m.emoji} ${m.label}`}>{m.emoji} {m.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 flex items-center justify-between">
                    <span>Rating</span>
                    <span className="text-yellow-500 font-bold">{rating} / 5</span>
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button type="button" key={star} onClick={() => setRating(star)} className="p-1 transition-transform hover:scale-110">
                        <Star size={32} className={star <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><MapPin size={14} className="inline mr-1 -mt-0.5"/> Location</label>
                  <input value={location} onChange={e=>setLocation(e.target.value)} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Monal Restaurant" />
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
                    <option value="">Add person...</option>
                    {relationships.filter(r => !selectedPeople.includes(r._id)).map(r => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6 flex flex-col">
                <div className="flex-1 flex flex-col min-h-[250px]">
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Notes</label>
                  <div className="flex-1 border border-border rounded-xl bg-background overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/50">
                    <div className="flex-1 overflow-y-auto p-4 prose prose-invert max-w-none prose-sm">
                      <TipTapEditor content={notes} onChange={setNotes} placeholder="Write down the details of this event..." />
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
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block"><Paperclip size={14} className="inline mr-1 -mt-0.5"/> Attachments ({attachments.length})</label>
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

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                {initialData ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
