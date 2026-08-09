import { useState, useMemo } from 'react'
import { Plus, Search, Calendar, Filter, Sparkles, Star, MoreVertical, Loader2, Image as ImageIcon, Video, Heart, Clock, Edit2, Trash2, Copy } from 'lucide-react'
import EventFormModal from './EventFormModal'
import EventPreviewModal from './EventPreviewModal'

interface RelationshipEventsTabProps {
  person: any
  records: any[]
  relationships: any[]
  loadData: (id: string) => void
}

export default function RelationshipEventsTab({ person, records, relationships, loadData }: RelationshipEventsTabProps) {
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [previewEvent, setPreviewEvent] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('All') // All, Favorites, Archived
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Only get 'Event' type records
  const allEvents = useMemo(() => {
    return records.filter(r => r.type === 'Event')
  }, [records])

  const filteredEvents = useMemo(() => {
    let filtered = allEvents
    
    if (filterMode === 'Favorites') filtered = filtered.filter(e => e.isFavorite)
    else if (filterMode === 'Archived') filtered = filtered.filter(e => e.isArchived)
    else filtered = filtered.filter(e => !e.isArchived) // 'All' mode excludes archived by default

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(q) || 
        e.category?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allEvents, searchQuery, filterMode])

  // Analytics Calculation
  const stats = useMemo(() => {
    const totalEvents = allEvents.length
    const photos = allEvents.reduce((acc, e) => acc + (e.attachments?.filter((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0), 0)
    
    const catCounts: Record<string, number> = {}
    allEvents.forEach(e => {
      if (e.category) catCounts[e.category] = (catCounts[e.category] || 0) + 1
    })
    const favCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None'

    const moodCounts: Record<string, number> = {}
    allEvents.forEach(e => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1
    })
    const favMood = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A'

    const sortedDates = allEvents.map(e => new Date(e.date).getTime()).sort((a,b)=>b-a)
    let lastMeetingStr = 'Never'
    if (sortedDates.length > 0) {
      const diffDays = Math.floor((Date.now() - sortedDates[0]) / (1000 * 60 * 60 * 24))
      if (diffDays === 0) lastMeetingStr = 'Today'
      else if (diffDays === 1) lastMeetingStr = 'Yesterday'
      else lastMeetingStr = `${diffDays} Days Ago`
    }

    return { totalEvents, photos, favCat, favMood, lastMeetingStr }
  }, [allEvents])

  // Handlers
  const handleArchiveToggle = async (e: React.MouseEvent, event: any) => {
    e.stopPropagation()
    try {
      // @ts-ignore
      await window.api.db.update('records', { _id: event._id }, { $set: { isArchived: !event.isArchived } })
      loadData(person._id)
      if (previewEvent && previewEvent._id === event._id) setPreviewEvent({...previewEvent, isArchived: !event.isArchived})
    } catch(err) { console.error(err) }
  }

  const handleFavoriteToggle = async (e: React.MouseEvent, event: any) => {
    e.stopPropagation()
    try {
      // @ts-ignore
      await window.api.db.update('records', { _id: event._id }, { $set: { isFavorite: !event.isFavorite } })
      loadData(person._id)
      if (previewEvent && previewEvent._id === event._id) setPreviewEvent({...previewEvent, isFavorite: !event.isFavorite})
    } catch(err) { console.error(err) }
  }

  const handleDelete = async (e?: React.MouseEvent, eventId?: string) => {
    if (e) e.stopPropagation()
    const id = eventId || (previewEvent && previewEvent._id)
    if (!id || !confirm('Permanently delete this event?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('records', { _id: id })
      loadData(person._id)
      if (previewEvent && previewEvent._id === id) setPreviewEvent(null)
    } catch(err) { console.error(err) }
  }

  const handleDuplicate = async (e?: React.MouseEvent, event?: any) => {
    if (e) e.stopPropagation()
    const target = event || previewEvent
    if (!target) return
    const copy = { ...target, _id: undefined, title: `${target.title} (Copy)`, createdAt: Date.now(), updatedAt: Date.now() }
    try {
      // @ts-ignore
      await window.api.db.insert('records', copy)
      loadData(person._id)
      if (previewEvent) setPreviewEvent(null)
    } catch(err) { console.error(err) }
  }

  const handleEdit = (e?: React.MouseEvent, event?: any) => {
    if (e) e.stopPropagation()
    const target = event || previewEvent
    setEditingEvent(target)
    setShowEventForm(true)
    if (previewEvent) setPreviewEvent(null)
  }

  const generateAIInsight = async () => {
    setIsGenerating(true)
    setAiInsight(null)
    const prompt = `Act as a relationship counselor and memory analyst. I have ${allEvents.length} events recorded with ${person.name}. Average mood: ${stats.favMood}. Most common category: ${stats.favCat}. Write a 3 sentence psychological insight about my relationship patterns based on this metadata. Be encouraging.`
    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1:8b', prompt, stream: false })
      })
      const data = res.ok ? await res.json() : await (await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama3', prompt, stream: false })})).json()
      setAiInsight(data.response)
    } catch (err) {
      setAiInsight('Could not connect to Ollama. Ensure the local AI server is running.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Analytics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black">{stats.totalEvents}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Events</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black">{stats.photos}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Photos Shared</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-black truncate w-full">{stats.favMood.split(' ')[0] || 'N/A'}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Avg Mood</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-lg font-black truncate w-full">{stats.favCat}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Top Category</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-lg font-black truncate w-full">{stats.lastMeetingStr}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Last Meeting</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-2 rounded-2xl border border-border">
        <div className="flex gap-2">
          {['All', 'Favorites', 'Archived'].map(f => (
            <button key={f} onClick={() => setFilterMode(f)} className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-colors ${filterMode === f ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-foreground/70'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} type="text" placeholder="Search events..." className="w-full pl-9 pr-4 py-1.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none" />
          </div>
          <button onClick={() => { setEditingEvent(null); setShowEventForm(true); }} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20 shrink-0">
            <Plus size={16} /> New Event
          </button>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-10 pointer-events-none"><Sparkles size={100}/></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
            <Sparkles size={24}/>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Relationship AI Insights</h3>
            {aiInsight ? (
              <p className="text-sm text-foreground/90 leading-relaxed font-medium">{aiInsight}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Ask the AI to analyze your event history to discover hidden relationship patterns and consistency insights.</p>
            )}
          </div>
          <button onClick={generateAIInsight} disabled={isGenerating} className="shrink-0 px-6 py-2 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2">
            {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
            {aiInsight ? 'Regenerate' : 'Analyze Pattern'}
          </button>
        </div>
      </div>

      {/* Timeline Layout */}
      <div className="space-y-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground bg-card/50">
            No events found. Start capturing your shared moments!
          </div>
        ) : (
          <div className="relative pl-8 md:pl-0">
            {/* Timeline Line */}
            <div className="absolute left-[39px] md:left-1/2 md:-ml-px top-0 bottom-0 w-0.5 bg-border rounded-full"></div>

            <div className="space-y-12">
              {filteredEvents.map((event, index) => {
                const dateObj = new Date(event.date)
                const isLeft = index % 2 === 0
                const photosCount = event.attachments?.filter((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0

                return (
                  <div key={event._id} className={`relative flex flex-col md:flex-row items-center md:justify-between w-full group cursor-pointer`} onClick={() => setPreviewEvent(event)}>
                    
                    {/* Dot */}
                    <div className="absolute left-[35px] md:left-1/2 md:-translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background z-10 transition-transform group-hover:scale-150"></div>

                    {/* Left Side (Empty on small, populated alternatively on md) */}
                    <div className={`hidden md:block w-5/12 ${isLeft ? 'text-right pr-12' : 'order-2 text-left pl-12'}`}>
                      {isLeft ? (
                        <div>
                          <div className="text-2xl font-black text-foreground">{dateObj.toLocaleDateString([], { month: 'long', day: 'numeric' })}</div>
                          <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{dateObj.getFullYear()}</div>
                        </div>
                      ) : (
                        <EventCardContent event={event} photosCount={photosCount} onFavorite={(e)=>handleFavoriteToggle(e,event)} onArchive={(e)=>handleArchiveToggle(e,event)} onDelete={(e)=>handleDelete(e,event._id)} onEdit={(e)=>handleEdit(e,event)} onDuplicate={(e)=>handleDuplicate(e,event)} />
                      )}
                    </div>

                    {/* Right Side (Content on small, populated alternatively on md) */}
                    <div className={`w-full pl-16 md:pl-0 md:w-5/12 ${isLeft ? 'md:text-left md:pl-12' : 'md:text-right md:pr-12 md:order-1'}`}>
                      <div className="md:hidden mb-2">
                        <div className="text-lg font-black text-foreground">{dateObj.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      
                      {isLeft ? (
                        <EventCardContent event={event} photosCount={photosCount} onFavorite={(e)=>handleFavoriteToggle(e,event)} onArchive={(e)=>handleArchiveToggle(e,event)} onDelete={(e)=>handleDelete(e,event._id)} onEdit={(e)=>handleEdit(e,event)} onDuplicate={(e)=>handleDuplicate(e,event)} />
                      ) : (
                        <div className="hidden md:block">
                          <div className="text-2xl font-black text-foreground">{dateObj.toLocaleDateString([], { month: 'long', day: 'numeric' })}</div>
                          <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{dateObj.getFullYear()}</div>
                        </div>
                      )}
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <EventFormModal 
        isOpen={showEventForm} 
        onClose={() => {setShowEventForm(false); setEditingEvent(null)}}
        personId={person._id}
        initialData={editingEvent}
        onSave={() => loadData(person._id)}
      />

      <EventPreviewModal
        isOpen={!!previewEvent}
        onClose={() => setPreviewEvent(null)}
        event={previewEvent}
        relationships={relationships}
        onEdit={() => handleEdit()}
        onDelete={() => handleDelete()}
        onDuplicate={() => handleDuplicate()}
      />

    </div>
  )
}

function EventCardContent({ event, photosCount, onFavorite, onArchive, onDelete, onEdit, onDuplicate }: any) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="bg-card border border-border p-5 rounded-2xl shadow-sm group-hover:border-primary/50 group-hover:shadow-lg transition-all relative text-left">
      <div className="absolute right-4 top-4 flex gap-1">
        <button onClick={onFavorite} className="p-1.5 hover:bg-accent rounded-md transition-colors text-yellow-500">
          <Star size={16} className={event.isFavorite ? 'fill-yellow-500' : ''}/>
        </button>
        <div className="relative">
          <button onClick={(e) => {e.stopPropagation(); setShowMenu(!showMenu)}} className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground">
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 w-48 bg-background border border-border rounded-xl shadow-2xl py-1 z-50 text-sm font-medium">
              <button onClick={(e)=>{setShowMenu(false); onEdit(e)}} className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2"><Edit2 size={14}/> Edit Event</button>
              <button onClick={(e)=>{setShowMenu(false); onDuplicate(e)}} className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2">Duplicate Event</button>
              <button onClick={(e)=>{setShowMenu(false); onArchive(e)}} className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2 text-yellow-500">{event.isArchived ? 'Restore Event' : 'Archive Event'}</button>
              <div className="my-1 border-t border-border"></div>
              <button onClick={(e)=>{setShowMenu(false); onDelete(e)}} className="w-full text-left px-4 py-2 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 text-red-500"><Trash2 size={14}/> Delete Event</button>
            </div>
          )}
        </div>
      </div>
      
      <h3 className="text-xl font-black mb-2 pr-16 leading-tight">{event.title}</h3>
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-4">
        {event.mood && <span className="bg-background border border-border px-2 py-0.5 rounded-md">{event.mood}</span>}
        <span className="bg-accent px-2 py-0.5 rounded-md text-foreground">{event.category}</span>
        {photosCount > 0 && <span className="flex items-center gap-1"><ImageIcon size={14}/> {photosCount}</span>}
      </div>

      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground border-t border-border pt-3">
        <div className="flex gap-1 text-yellow-500">
          {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= (event.importance||0) ? 'fill-yellow-500' : 'text-muted-foreground/30'}/>)}
        </div>
        <span>View Preview →</span>
      </div>
      
      {/* Click away layer to close menu */}
      {showMenu && <div className="fixed inset-0 z-40" onClick={(e) => {e.stopPropagation(); setShowMenu(false)}}></div>}
    </div>
  )
}
