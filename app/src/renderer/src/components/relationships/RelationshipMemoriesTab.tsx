import { useState, useMemo } from 'react'
import { Plus, Search, Folder, Sparkles, Star, Loader2, Image as ImageIcon, Video, Heart, MapPin, Grid, Archive, History, X, Edit2, Copy, Trash2 } from 'lucide-react'
import MemoryFormModal from './MemoryFormModal'
import MemoryPreviewModal from './MemoryPreviewModal'

interface RelationshipMemoriesTabProps {
  person: any
  records: any[]
  relationships: any[]
  loadData: (id: string) => void
}

export default function RelationshipMemoriesTab({ person, records, relationships, loadData }: RelationshipMemoriesTabProps) {
  const [showMemoryForm, setShowMemoryForm] = useState(false)
  const [editingMemory, setEditingMemory] = useState<any>(null)
  const [previewMemory, setPreviewMemory] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('Recent') // Recent, Albums, Timeline, Places
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState('All') // All, Favorites, Archived
  
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Only get 'Memory' type records
  const allMemories = useMemo(() => {
    return records.filter(r => r.type === 'Memory')
  }, [records])

  const filteredMemories = useMemo(() => {
    let filtered = allMemories
    
    if (filterMode === 'Favorites') filtered = filtered.filter(e => e.isFavorite)
    else if (filterMode === 'Archived') filtered = filtered.filter(e => e.isArchived)
    else filtered = filtered.filter(e => !e.isArchived) // Exclude archived by default

    if (selectedAlbum) filtered = filtered.filter(e => e.category === selectedAlbum)
    if (selectedPlace) filtered = filtered.filter(e => e.location === selectedPlace)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.title?.toLowerCase().includes(q) || 
        e.category?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [allMemories, searchQuery, filterMode, selectedAlbum, selectedPlace])

  // Analytics Calculation
  const stats = useMemo(() => {
    const activeMemories = allMemories.filter(m => !m.isArchived)
    const totalMemories = activeMemories.length
    const photos = activeMemories.reduce((acc, e) => acc + (e.attachments?.filter((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0), 0)
    const videos = activeMemories.reduce((acc, e) => acc + (e.attachments?.filter((a:string)=>a.match(/\.(mp4|webm|ogg|mov)$/i))?.length || 0), 0)
    const audio = activeMemories.reduce((acc, e) => acc + (e.attachments?.filter((a:string)=>a.match(/\.(mp3|wav|ogg|m4a)$/i))?.length || 0), 0)
    const favMemories = activeMemories.filter(m => m.isFavorite).length

    const albums = new Set(activeMemories.map(m => m.category || 'General')).size

    const moodCounts: Record<string, number> = {}
    activeMemories.forEach(e => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1
    })
    const favMood = Object.entries(moodCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A'

    const yearCounts: Record<string, number> = {}
    activeMemories.forEach(e => {
      if (e.date) {
        const y = new Date(e.date).getFullYear().toString()
        yearCounts[y] = (yearCounts[y] || 0) + 1
      }
    })
    const mostActiveYear = Object.entries(yearCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A'

    return { totalMemories, photos, videos, audio, favMemories, albums, favMood, mostActiveYear }
  }, [allMemories])

  // Aggregate Albums
  const albumAggregates = useMemo(() => {
    const agg: Record<string, { memories: number, photos: number, videos: number, cover: string | null }> = {}
    const activeMemories = allMemories.filter(m => !m.isArchived)
    activeMemories.forEach(m => {
      const a = m.category || 'General'
      if (!agg[a]) agg[a] = { memories: 0, photos: 0, videos: 0, cover: null }

      agg[a].memories += 1
      const pCount = m.attachments?.filter((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0
      const vCount = m.attachments?.filter((a:string)=>a.match(/\.(mp4|webm|ogg|mov)$/i))?.length || 0
      agg[a].photos += pCount
      agg[a].videos += vCount

      if (!agg[a].cover && pCount > 0) {
        agg[a].cover = m.attachments?.find((at:string)=>at.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      }
    })
    return Object.entries(agg).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.memories - a.memories)
  }, [allMemories])

  // Aggregate Places
  const placeAggregates = useMemo(() => {
    const agg: Record<string, { memories: number }> = {}
    const activeMemories = allMemories.filter(m => !m.isArchived)
    activeMemories.forEach(m => {
      if (m.location) {
        const p = m.location
        if (!agg[p]) agg[p] = { memories: 0 }
        agg[p].memories += 1
      }
    })
    return Object.entries(agg).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.memories - a.memories)
  }, [allMemories])

  // Handlers
  const handleArchiveToggle = async (e: React.MouseEvent, memory: any) => {
    e.stopPropagation()
    try {
      // @ts-ignore
      await window.api.db.update('records', { _id: memory._id }, { $set: { isArchived: !memory.isArchived } })
      loadData(person._id)
      if (previewMemory && previewMemory._id === memory._id) setPreviewMemory({...previewMemory, isArchived: !memory.isArchived})
    } catch(err) { console.error(err) }
  }

  const handleFavoriteToggle = async (e: React.MouseEvent, memory: any) => {
    e.stopPropagation()
    try {
      // @ts-ignore
      await window.api.db.update('records', { _id: memory._id }, { $set: { isFavorite: !memory.isFavorite } })
      loadData(person._id)
      if (previewMemory && previewMemory._id === memory._id) setPreviewMemory({...previewMemory, isFavorite: !memory.isFavorite})
    } catch(err) { console.error(err) }
  }

  const handleDelete = async (e?: React.MouseEvent, memoryId?: string) => {
    if (e) e.stopPropagation()
    const id = memoryId || (previewMemory && previewMemory._id)
    if (!id || !confirm('Permanently delete this memory?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('records', { _id: id })
      loadData(person._id)
      if (previewMemory && previewMemory._id === id) setPreviewMemory(null)
    } catch(err) { console.error(err) }
  }

  const handleDuplicate = async (e?: React.MouseEvent, memory?: any) => {
    if (e) e.stopPropagation()
    const target = memory || previewMemory
    if (!target) return
    const copy = { ...target, _id: undefined, title: `${target.title} (Copy)`, createdAt: Date.now(), updatedAt: Date.now() }
    try {
      // @ts-ignore
      await window.api.db.insert('records', copy)
      loadData(person._id)
      if (previewMemory) setPreviewMemory(null)
    } catch(err) { console.error(err) }
  }

  const handleEdit = (e?: React.MouseEvent, memory?: any) => {
    if (e) e.stopPropagation()
    const target = memory || previewMemory
    setEditingMemory(target)
    setShowMemoryForm(true)
    if (previewMemory) setPreviewMemory(null)
    // Highlight the memory card when editing from preview modal
    if (target && target._id) {
      const el = document.getElementById(`memory-card-${target._id}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
        setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
      }
    }
  }

  const generateAIInsight = async () => {
    setIsGenerating(true)
    setAiInsight(null)
    const prompt = `Act as a memory analyst. I have ${allMemories.length} memories with ${person.name}. We have ${stats.photos} photos together. Average mood is ${stats.favMood}. Most active year: ${stats.mostActiveYear}. Write a 3 sentence psychological insight about my relationship memories based on this metadata. Be encouraging.`
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
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-2xl font-black">{stats.totalMemories}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Memories</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-2xl font-black">{stats.photos}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Photos</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-2xl font-black">{stats.videos}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Videos</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-2xl font-black">{stats.audio}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Audio</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-2xl font-black">{stats.albums}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Albums</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-xl font-black truncate w-full">{stats.favMood.split(' ')[0] || 'N/A'}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Avg Mood</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm text-center">
          <div className="text-xl font-black">{stats.mostActiveYear}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Active Year</div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between bg-card p-3 rounded-3xl border border-border shadow-sm">
        
        {/* View Tabs */}
        <div className="flex bg-accent rounded-2xl p-1 overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: 'Recent', icon: Grid },
            { id: 'Albums', icon: Folder },
            { id: 'Timeline', icon: History },
            { id: 'Places', icon: MapPin },
          ].map(v => (
            <button key={v.id} onClick={() => { setViewMode(v.id); setSelectedAlbum(null); setSelectedPlace(null); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === v.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}>
              <v.icon size={16} /> {v.id}
            </button>
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {viewMode === 'Recent' && (
            <div className="flex gap-2 mr-auto xl:mr-0 shrink-0">
              {['All', 'Favorites', 'Archived'].map(f => (
                <button key={f} onClick={() => setFilterMode(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterMode === f ? 'bg-primary text-primary-foreground' : 'bg-background border border-border hover:bg-accent'}`}>
                  {f === 'Favorites' && <Heart size={12} className="inline mr-1 -mt-0.5"/>}
                  {f === 'Archived' && <Archive size={12} className="inline mr-1 -mt-0.5"/>}
                  {f}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} type="text" placeholder="Search memories..." className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none" />
          </div>
          <button onClick={() => { setEditingMemory(null); setShowMemoryForm(true); }} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20 shrink-0">
            <Plus size={18} /> Add Memory
          </button>
        </div>
      </div>

      {/* Selected Filters Chips */}
      {(selectedAlbum || selectedPlace) && (
        <div className="flex gap-2">
          {selectedAlbum && (
            <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <Folder size={14}/> Album: {selectedAlbum}
              <button onClick={() => setSelectedAlbum(null)} className="hover:bg-primary-foreground/20 rounded-full p-0.5"><X size={14}/></button>
            </div>
          )}
          {selectedPlace && (
            <div className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
              <MapPin size={14}/> Place: {selectedPlace}
              <button onClick={() => setSelectedPlace(null)} className="hover:bg-white/20 rounded-full p-0.5"><X size={14}/></button>
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEW RENDERER */}
      <div className="space-y-8 min-h-[400px]">
        
        {/* RECENT / DEFAULT VIEW */}
        {viewMode === 'Recent' && (
          <div>
            {/* AI Insights Card */}
            {!searchQuery && !selectedAlbum && !selectedPlace && filterMode === 'All' && (
              <div className="bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-3xl p-6 relative overflow-hidden mb-8">
                <div className="absolute right-0 top-0 p-4 opacity-10 pointer-events-none"><Sparkles size={120}/></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles size={28}/>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">AI Memory Insights</h3>
                    {aiInsight ? (
                      <p className="text-sm text-foreground/90 leading-relaxed font-medium">{aiInsight}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Kiseki can analyze your memories locally to uncover patterns about the best moments you share.</p>
                    )}
                  </div>
                  <button onClick={generateAIInsight} disabled={isGenerating} className="shrink-0 px-6 py-2.5 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/20 disabled:opacity-50 flex items-center gap-2">
                    {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                    {aiInsight ? 'Regenerate' : 'Analyze Memories'}
                  </button>
                </div>
              </div>
            )}

            {filteredMemories.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-3xl text-muted-foreground bg-card/30">
                No memories found. Start adding photos and stories!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMemories.map((memory) => {
                  const photosCount = memory.attachments?.filter((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))?.length || 0
                  const vidsCount = memory.attachments?.filter((a:string)=>a.match(/\.(mp4|webm|ogg|mov)$/i))?.length || 0
                  const cover = memory.attachments?.find((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))

                  return (
                    <MemoryCard 
                      key={memory._id} 
                      memory={memory} 
                      cover={cover}
                      photosCount={photosCount} 
                      vidsCount={vidsCount}
                      memoryId={memory._id}
                      onClick={() => setPreviewMemory(memory)}
                      onFavorite={(e)=>handleFavoriteToggle(e,memory)} 
                      onArchive={(e)=>handleArchiveToggle(e,memory)} 
                      onDelete={(e)=>handleDelete(e,memory._id)} 
                      onEdit={(e)=>handleEdit(e,memory)} 
                      onDuplicate={(e)=>handleDuplicate(e,memory)} 
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ALBUMS VIEW */}
        {viewMode === 'Albums' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {albumAggregates.map((album) => (
              <div key={album.name} onClick={() => { setSelectedAlbum(album.name); setViewMode('Recent'); }} className="bg-card border border-border rounded-3xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl transition-all">
                <div className="aspect-square bg-accent relative flex items-center justify-center overflow-hidden">
                  {album.cover ? (
                    <img src={album.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <Folder size={48} className="text-muted-foreground/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-black text-lg truncate drop-shadow-md">{album.name}</h3>
                    <div className="text-xs font-bold opacity-80 mt-1">{album.memories} Memories</div>
                  </div>
                </div>
                <div className="p-3 bg-card flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span className="flex items-center gap-1"><ImageIcon size={14}/> {album.photos}</span>
                  <span className="flex items-center gap-1"><Video size={14}/> {album.videos}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TIMELINE VIEW */}
        {viewMode === 'Timeline' && (
          <div className="max-w-3xl mx-auto space-y-8 relative py-8">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-border rounded-full"></div>
            {filteredMemories.map((memory, index) => {
              const isLeft = index % 2 === 0
              return (
                <div key={memory._id} onClick={() => setPreviewMemory(memory)} className={`relative flex flex-col md:flex-row items-center md:justify-between w-full group cursor-pointer`}>
                  <div className="absolute left-[30px] md:left-1/2 md:-translate-x-1/2 w-4 h-4 rounded-full bg-primary ring-4 ring-background z-10 transition-transform group-hover:scale-150"></div>
                  <div className={`hidden md:block w-5/12 ${isLeft ? 'text-right pr-12' : 'order-2 text-left pl-12'}`}>
                    {isLeft ? (
                      <div className="space-y-1">
                        <div className="text-2xl font-black">{new Date(memory.date).toLocaleDateString([], { month: 'long', day: 'numeric' })}</div>
                        <div className="text-sm font-bold text-primary">{new Date(memory.date).getFullYear()}</div>
                      </div>
                    ) : (
                      <MemoryTimelineCard memory={memory} />
                    )}
                  </div>
                  <div className={`w-full pl-16 md:pl-0 md:w-5/12 ${isLeft ? 'md:text-left md:pl-12' : 'md:text-right md:pr-12 md:order-1'}`}>
                    <div className="md:hidden mb-2 font-black">{new Date(memory.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    {isLeft ? (
                      <MemoryTimelineCard memory={memory} />
                    ) : (
                      <div className="hidden md:block space-y-1">
                        <div className="text-2xl font-black">{new Date(memory.date).toLocaleDateString([], { month: 'long', day: 'numeric' })}</div>
                        <div className="text-sm font-bold text-primary">{new Date(memory.date).getFullYear()}</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PLACES (MAP) VIEW */}
        {viewMode === 'Places' && (
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><MapPin className="text-blue-500"/> Memory Map (Locations)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {placeAggregates.length === 0 && <div className="text-muted-foreground">No locations recorded. Add locations to your memories to see them here!</div>}
              {placeAggregates.map(place => (
                <button key={place.name} onClick={() => { setSelectedPlace(place.name); setViewMode('Recent'); }} className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl hover:border-blue-500 hover:shadow-md transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><MapPin size={20}/></div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{place.name}</h3>
                      <div className="text-xs font-bold text-muted-foreground uppercase">{place.memories} Memories</div>
                    </div>
                  </div>
                  <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">View →</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <MemoryFormModal 
        isOpen={showMemoryForm} 
        onClose={() => {setShowMemoryForm(false); setEditingMemory(null)}}
        personId={person._id}
        initialData={editingMemory}
        onSave={() => loadData(person._id)}
      />

      <MemoryPreviewModal
        isOpen={!!previewMemory}
        onClose={() => setPreviewMemory(null)}
        memory={previewMemory}
        relationships={relationships}
        onEdit={() => handleEdit()}
        onDelete={() => handleDelete()}
      />

    </div>
  )
}

function MemoryCard({ memory, cover, photosCount, vidsCount, memoryId, onClick, onFavorite, onArchive, onDelete, onEdit, onDuplicate }: any) {
  return (
    <div id={`memory-card-${memoryId}`} className="bg-card border border-border rounded-3xl shadow-sm hover:shadow-xl transition-all relative flex flex-col group h-full">
      <div className="absolute right-3 top-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button onClick={onFavorite} className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors text-yellow-400" title="Favorite">
          <Star size={14} className={memory.isFavorite ? 'fill-yellow-400' : ''}/>
        </button>
        <button onClick={(e) => {e.stopPropagation(); onEdit(e)}} className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors text-white" title="Edit">
          <Edit2 size={14}/>
        </button>
        <button onClick={(e) => {e.stopPropagation(); onDuplicate(e)}} className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors text-white" title="Duplicate">
          <Copy size={14}/>
        </button>
        <button onClick={(e) => {e.stopPropagation(); onArchive(e)}} className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition-colors text-yellow-500" title={memory.isArchived ? 'Restore' : 'Archive'}>
          <Archive size={14}/>
        </button>
        <button onClick={(e) => {e.stopPropagation(); onDelete(e)}} className="p-2 bg-black/40 hover:bg-red-600 rounded-full backdrop-blur-md transition-colors text-red-500 hover:text-white" title="Delete">
          <Trash2 size={14}/>
        </button>
      </div>

      <div className="aspect-[4/3] bg-accent relative overflow-hidden rounded-t-3xl cursor-pointer" onClick={onClick}>
        {cover ? (
          <img src={cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-accent to-background">
            <Sparkles size={32} className="opacity-20 mb-2"/>
            <span className="text-xs font-bold uppercase tracking-widest opacity-50">No Cover</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="text-white text-sm font-black drop-shadow-md truncate">{memory.title}</div>
          <div className="text-white/80 text-xs font-medium drop-shadow-md">{new Date(memory.date).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 cursor-pointer bg-card rounded-b-3xl" onClick={onClick}>
        <div className="flex flex-wrap gap-2 mb-3">
          {memory.mood && <span className="text-xs font-bold bg-accent text-foreground px-2 py-1 rounded-md">{memory.mood}</span>}
          {memory.category && <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md">{memory.category}</span>}
        </div>

        {memory.description && (
          <div className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed flex-1">
            {memory.description.replace(/<[^>]*>?/gm, '')}
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground mt-auto pt-3 border-t border-border">
          <div className="flex gap-2">
            {(photosCount > 0 || vidsCount > 0) && (
              <span className="flex items-center gap-1 text-foreground"><ImageIcon size={12}/> {photosCount + vidsCount}</span>
            )}
            <span className="flex items-center gap-1 text-yellow-500"><Star size={12} className="fill-yellow-500"/> {memory.importance}/10</span>
          </div>
          <span className="text-primary group-hover:text-primary/80 transition-colors">Preview →</span>
        </div>
      </div>
    </div>
  )
}

function MemoryTimelineCard({ memory }: { memory: any }) {
  const cover = memory.attachments?.find((a:string)=>a.match(/\.(jpg|jpeg|png|gif|webp)$/i))
  return (
    <div className="bg-card border border-border p-4 rounded-3xl shadow-sm hover:shadow-lg transition-all text-left">
      {cover && (
        <div className="w-full h-32 mb-4 rounded-2xl overflow-hidden bg-accent">
          <img src={cover} className="w-full h-full object-cover" />
        </div>
      )}
      <h3 className="font-black text-lg mb-1">{memory.title}</h3>
      <div className="flex flex-wrap gap-2 mb-3 text-xs font-bold text-muted-foreground">
        {memory.category && <span className="bg-accent px-2 py-0.5 rounded-md text-foreground">{memory.category}</span>}
        {memory.mood && <span>{memory.mood}</span>}
      </div>
      {memory.description && <p className="text-sm text-muted-foreground line-clamp-3">{memory.description.replace(/<[^>]*>?/gm, '')}</p>}
    </div>
  )
}
