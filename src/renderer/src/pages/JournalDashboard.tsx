import { useState, useEffect, useMemo, useRef } from 'react'
import { JournalEntry } from '../types'
import { Search, Filter, Book, CheckSquare, Square, Trash2, Download, Copy, Archive, ArrowDownUp, ArchiveRestore, Image as ImageIcon, Star, ChevronLeft, Check, Edit2, Eye, Film, Music } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function JournalDashboard() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  
  // View & UI State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'updated' | 'alpha' | 'mood'>('newest')
  const [previewEntry, setPreviewEntry] = useState<JournalEntry | null>(null)
  
  // Filters
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    mood: '', hasImages: false, isFavorite: false, isArchived: false, dateRange: 'all'
  })

  const importInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const navigate = useNavigate()

  const fetchEntries = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('journal', {})
      setEntries(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') {
        if (isSelectionMode) {
          setIsSelectionMode(false)
          setSelectedIds(new Set())
        }
      }
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        if (!isSelectionMode) setIsSelectionMode(true)
        if (selectedIds.size === filteredEntries.length && filteredEntries.length > 0) {
          setSelectedIds(new Set())
        } else {
          setSelectedIds(new Set(filteredEntries.map(r => r._id!)))
        }
      }
      if (e.key === 'Delete' && selectedIds.size > 0) bulkAction('delete')
      if (e.ctrlKey && e.key === 'e' && selectedIds.size > 0) { e.preventDefault(); bulkAction('export') }
      if (e.ctrlKey && e.key === 'd' && selectedIds.size > 0) { e.preventDefault(); bulkAction('duplicate') }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Filtering & Sorting Logic
  const filteredEntries = useMemo(() => {
    let result = entries

    result = result.filter(r => filters.isArchived ? r.isArchived : !r.isArchived)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) || 
        (r.content && r.content.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
        (r.mood && r.mood.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      )
    }

    if (filters.mood) result = result.filter(r => r.mood?.toLowerCase().includes(filters.mood.toLowerCase()))
    if (filters.isFavorite) result = result.filter(r => r.isFavorite)
    if (filters.hasImages) result = result.filter(r => r.photos && r.photos.length > 0)
    
    if (filters.dateRange !== 'all') {
      const now = Date.now()
      const d = 86400000
      result = result.filter(r => {
        const rc = r.createdAt
        if (filters.dateRange === 'today') return now - rc < d
        if (filters.dateRange === 'week') return now - rc < 7 * d
        if (filters.dateRange === 'month') return now - rc < 30 * d
        if (filters.dateRange === 'year') return now - rc < 365 * d
        return true
      })
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.createdAt - a.createdAt
        case 'oldest': return a.createdAt - b.createdAt
        case 'updated': return b.updatedAt - a.updatedAt
        case 'alpha': return (a.title || 'Note').localeCompare(b.title || 'Note')
        case 'mood': return (a.mood || '').localeCompare(b.mood || '')
        default: return 0
      }
    })

    return result
  }, [entries, searchQuery, filters, sortBy])


  const handleAction = async (action: string, entry: JournalEntry) => {
    try {
      if (action === 'favorite') {
        // @ts-ignore
        await window.api.db.update('journal', { _id: entry._id }, { $set: { isFavorite: !entry.isFavorite } })
        fetchEntries()
      }
      if (action === 'archive') {
        // @ts-ignore
        await window.api.db.update('journal', { _id: entry._id }, { $set: { isArchived: true } })
        fetchEntries()
      }
      if (action === 'unarchive') {
        // @ts-ignore
        await window.api.db.update('journal', { _id: entry._id }, { $set: { isArchived: false } })
        fetchEntries()
      }
      if (action === 'delete') {
        if(confirm('Permanently delete?')) {
          // @ts-ignore
          await window.api.db.remove('journal', { _id: entry._id })
          NotificationEngine.notify('warning', 'Entry Deleted', `"${entry.title}" was deleted.`, 'Journal')
          fetchEntries()
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const bulkAction = async (action: string) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      if (action === 'delete') {
        if (!confirm(`Permanently delete ${ids.length} journal entries?`)) return
        for (const id of ids) {
          // @ts-ignore
          await window.api.db.remove('journal', { _id: id })
        }
        NotificationEngine.notify('warning', 'Entries Deleted', `${ids.length} entries were deleted.`, 'Journal')
      }
      if (action === 'archive') {
        for (const id of ids) {
          // @ts-ignore
          await window.api.db.update('journal', { _id: id }, { $set: { isArchived: true } })
        }
      }
      if (action === 'unarchive') {
        for (const id of ids) {
          // @ts-ignore
          await window.api.db.update('journal', { _id: id }, { $set: { isArchived: false } })
        }
      }
      if (action === 'export') {
        const selectedRecs = entries.filter(r => r._id && selectedIds.has(r._id))
        const blob = new Blob([JSON.stringify(selectedRecs, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kiseki-journal-export.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      if (action === 'duplicate') {
        const selectedRecs = entries.filter(r => r._id && selectedIds.has(r._id))
        for (const r of selectedRecs) {
          const copy = { ...r, title: `${r.title || 'Note'} (Copy)`, createdAt: Date.now(), updatedAt: Date.now() }
          delete copy._id
          // @ts-ignore
          await window.api.db.insert('journal', copy)
        }
      }
      
      setSelectedIds(new Set())
      if (action !== 'export') {
        fetchEntries()
        if (action === 'duplicate') NotificationEngine.notify('success', 'Entries Duplicated', 'Selected entries were duplicated.', 'Journal')
      }
    } catch(err) {
      console.error(err)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const content = ev.target?.result as string
      try {
        const imported = JSON.parse(content)
        const entriesToImport = Array.isArray(imported) ? imported : [imported]
        
        for (const entry of entriesToImport) {
          const newEntry: JournalEntry = {
            ...entry,
            _id: undefined,
            createdAt: entry.createdAt || Date.now(),
            updatedAt: entry.updatedAt || Date.now()
          }
          // @ts-ignore
          await window.api.db.insert('journal', newEntry)
          NotificationEngine.notify('success', 'Journal Entry Saved', 'Your journal entry has been saved.', 'Journal')
          NotificationEngine.checkAchievements()
        }
        fetchEntries()
      } catch (err) {
        console.error('Failed to parse JSON backup', err)
        alert('Failed to import: Invalid JSON file format.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Dashboard Statistics Component
  const JournalStatistics = () => {
    const stats = {
      total: 0,
      photos: 0,
      archived: 0,
      favorites: 0,
    }
    entries.forEach(r => {
      if (r.isArchived) {
        stats.archived++
        return
      }
      stats.total++
      if (r.photos && r.photos.length > 0) stats.photos++
      if (r.isFavorite) stats.favorites++
    })

    const toggleBoolean = (key: string) => {
      setFilters(f => ({ ...f, isFavorite: false, isArchived: false, hasImages: false, dateRange: 'all', mood: '', [key]: true }))
    }
    const resetFilters = () => setFilters(f => ({ ...f, isFavorite: false, isArchived: false, hasImages: false, dateRange: 'all', mood: '' }))

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button onClick={resetFilters} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Book size={20}/>
          </div>
          <div>
            <div className="text-2xl font-black">{stats.total}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Entries</div>
          </div>
        </button>
        <button onClick={() => toggleBoolean('isFavorite')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-yellow-500/50 hover:shadow-md transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
            <Star size={20}/>
          </div>
          <div>
            <div className="text-2xl font-black">{stats.favorites}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Favorites</div>
          </div>
        </button>
        <button onClick={() => toggleBoolean('hasImages')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-purple-500/50 hover:shadow-md transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <ImageIcon size={20}/>
          </div>
          <div>
            <div className="text-2xl font-black">{stats.photos}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Photos</div>
          </div>
        </button>
        <button onClick={() => toggleBoolean('isArchived')} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-orange-500/50 hover:shadow-md transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Archive size={20}/>
          </div>
          <div>
            <div className="text-2xl font-black">{stats.archived}</div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Archived</div>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative overflow-hidden">
      <style>{`
        @keyframes float-orb-up {
          0% { transform: translateY(120vh) scale(0.5); opacity: 0; }
          10% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-20vh) scale(1.2); opacity: 0; }
        }
        @keyframes drift {
          0% { transform: translateX(0px) rotate(0deg); }
          50% { transform: translateX(50px) rotate(180deg); }
          100% { transform: translateX(0px) rotate(360deg); }
        }
      `}</style>

      {/* 3D Ambient Background - Dreamy Memories */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        
        {/* Soft dreamy gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-purple-900/20" />

        {/* Floating Orbs (Memories) */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => {
            const size = 40 + Math.random() * 100;
            return (
              <div 
                key={`orb-wrap-${i}`}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  animation: `float-orb-up ${20 + Math.random() * 20}s linear infinite`,
                  animationDelay: `${Math.random() * -30}s`,
                }}
              >
                <svg 
                  viewBox="0 0 100 100" 
                  className="drop-shadow-sm"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    animation: `drift ${10 + Math.random() * 20}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * -20}s`,
                  }}
                >
                  <circle cx="50" cy="50" r="45" fill="none" stroke={i % 2 === 0 ? '#60a5fa' : '#c084fc'} strokeWidth="1.5" opacity="0.6" />
                  <circle cx="50" cy="50" r="45" fill={i % 2 === 0 ? 'rgba(96, 165, 250, 0.15)' : 'rgba(192, 132, 252, 0.15)'} />
                  <circle cx="35" cy="35" r="12" fill={i % 2 === 0 ? 'rgba(96, 165, 250, 0.5)' : 'rgba(192, 132, 252, 0.5)'} filter="blur(6px)" />
                </svg>
              </div>
            )
          })}
        </div>
      </div>

      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur z-20 flex flex-wrap gap-2 items-center justify-between shrink-0 relative">
        
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/journal')} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft size={20}/>
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Book className="text-primary" size={20} /> Journal Dashboard
          </h1>
          
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entries..."
              className="pl-9 pr-4 py-1.5 w-64 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-shadow"
            />
          </div>
          
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            <Filter size={14}/> Filters
            {(filters.isArchived || filters.isFavorite || filters.hasImages || filters.dateRange !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-primary ml-1"></span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded-xl bg-background overflow-hidden">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><ArrowDownUp size={14} className="text-muted-foreground"/></div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="alpha">Alphabetical</option>
              <option value="mood">By Mood</option>
            </select>
          </div>
          
          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${isSelectionMode ? 'bg-primary text-primary-foreground shadow-md' : 'bg-background border border-border hover:bg-accent text-foreground'}`}
          >
            {isSelectionMode ? <CheckSquare size={16}/> : <Square size={16}/>}
            Select
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Toolbar */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSelectionMode ? 'max-h-16 opacity-100 border-b border-border bg-accent/50' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm bg-background px-3 py-1 rounded-lg border border-border shadow-sm">{selectedIds.size} Selected</span>
            
            <button 
              onClick={() => {
                if (selectedIds.size === filteredEntries.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(filteredEntries.map(r => r._id!)))
              }} 
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14}/> {selectedIds.size === filteredEntries.length && filteredEntries.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card"><Download size={14} className="rotate-180"/> Import</button>
            <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImport} />
            <button onClick={() => bulkAction('export')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Download size={14}/> Export</button>
            <button onClick={() => bulkAction('duplicate')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Copy size={14}/> Duplicate</button>
            {!filters.isArchived && <button onClick={() => bulkAction('archive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Archive size={14}/> Archive</button>}
            {filters.isArchived && <button onClick={() => bulkAction('unarchive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveRestore size={14}/> Unarchive</button>}
            <button onClick={() => bulkAction('delete')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={14}/> Delete</button>
            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()) }} className="ml-2 text-muted-foreground hover:text-foreground text-sm font-bold">Cancel</button>
          </div>
        </div>
      </div>

      {/* Filter Options (Simple Bar) */}
      {isFilterOpen && (
        <div className="px-6 py-3 border-b border-border bg-card/80 backdrop-blur flex gap-4 text-sm animate-in slide-in-from-top-2 relative z-10">
          <label className="flex items-center gap-2 font-medium cursor-pointer">
            <input type="checkbox" checked={filters.isFavorite} onChange={e => setFilters(f=>({...f, isFavorite: e.target.checked}))} className="rounded text-primary focus:ring-primary"/>
            Favorites Only
          </label>
          <label className="flex items-center gap-2 font-medium cursor-pointer">
            <input type="checkbox" checked={filters.hasImages} onChange={e => setFilters(f=>({...f, hasImages: e.target.checked}))} className="rounded text-primary focus:ring-primary"/>
            Has Photos
          </label>
          <label className="flex items-center gap-2 font-medium cursor-pointer text-muted-foreground">
            <input type="checkbox" checked={filters.isArchived} onChange={e => setFilters(f=>({...f, isArchived: e.target.checked}))} className="rounded text-primary focus:ring-primary"/>
            Show Archived
          </label>
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-6 relative z-10 scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {!loading && entries.length > 0 && !isSelectionMode && (
          <JournalStatistics />
        )}

        {loading ? (
          <div className="flex items-center justify-center h-[50vh] text-primary animate-pulse font-bold">Loading...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
              <Book className="text-muted-foreground opacity-50" size={32} />
            </div>
            <h3 className="text-lg font-bold">No entries found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEntries.map(entry => (
              <DashboardEntryCard 
                key={entry._id}
                entry={entry}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(entry._id!)}
                onToggleSelect={() => {
                  const s = new Set(selectedIds)
                  if (s.has(entry._id!)) s.delete(entry._id!)
                  else s.add(entry._id!)
                  setSelectedIds(s)
                }}
                onAction={handleAction}
                onEdit={() => navigate('/journal', { state: { entryId: entry._id } })}
                onPreview={() => setPreviewEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>
      
      <JournalPreviewModal 
        isOpen={!!previewEntry}
        entry={previewEntry}
        onClose={() => setPreviewEntry(null)}
      />
    </div>
  )
}

function DashboardEntryCard({ 
  entry, 
  isSelectionMode, 
  isSelected, 
  onToggleSelect,
  onAction,
  onEdit,
  onPreview
}: { 
  entry: JournalEntry, 
  isSelectionMode: boolean, 
  isSelected: boolean,
  onToggleSelect: () => void,
  onAction: (action: string, entry: JournalEntry) => void,
  onEdit: () => void,
  onPreview: () => void
}) {
  const mood = MOODS.find(m => m.value === entry.mood)
  const preview = entry.content.replace(/<[^>]+>/g, '').substring(0, 100) + '...'
  
  // Extract images from content and combine with attached photos
  const imgMatches = entry.content.match(/<img[^>]+src=["']([^"'>]+)["']/g)
  const contentImages = imgMatches ? imgMatches.map(m => m.match(/src=["']([^"'>]+)["']/)?.[1]).filter(Boolean) as string[] : []
  const images = [...(entry.photos || []), ...contentImages].slice(0, 5)

  return (
    <div 
      className="relative group p-[2px] rounded-xl cursor-pointer"
      onClick={() => { if(isSelectionMode) onToggleSelect() }}
    >
      {/* Animated Border Background */}
      <div 
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" 
        style={{ backgroundSize: '300% 100%', animation: 'border-dance 2s linear infinite' }} 
      />
      
      {/* Actual Card Content */}
      <div className={`relative h-full w-full p-4 rounded-[10px] transition-all border ${isSelected ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border group-hover:border-transparent group-hover:shadow-md'}`}>
        
        {/* Selection Overlay */}
        {isSelectionMode && (
          <div className="absolute top-4 left-4 z-10 transition-transform hover:scale-110">
            {isSelected ? (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <Check size={12} strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center bg-card shadow-sm hover:border-primary transition-colors"></div>
            )}
          </div>
        )}

        <div className={`${isSelectionMode ? 'pl-8 opacity-75' : ''} transition-all`}>
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-base line-clamp-1 pr-2 text-foreground flex items-center gap-2">
              <span className="opacity-0 translate-y-1 scale-75 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-out flex-shrink-0">{mood?.emoji}</span> 
              <span className="truncate">{entry.title || (entry.tags.length > 0 ? entry.tags[0] : 'Note')}</span>
            </h4>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-3">
            {preview.length > 3 ? preview : 'Empty entry'}
          </p>

          {/* Image Thumbnails */}
          {images.length > 0 && (
            <div className="flex gap-1 mb-3 overflow-hidden h-10">
              {images.slice(0, 4).map((src, i) => {
                const isVideo = /\.(mp4|webm|ogg|mov|mkv)$/i.test(src)
                const isAudio = /\.(mp3|wav|ogg|m4a|aac)$/i.test(src)
                if (isVideo) {
                  return <div key={i} className="w-10 h-10 rounded-md bg-accent/50 flex items-center justify-center border border-border shrink-0" title="Video"><Film size={18} className="text-muted-foreground" /></div>
                }
                if (isAudio) {
                  return <div key={i} className="w-10 h-10 rounded-md bg-accent/50 flex items-center justify-center border border-border shrink-0" title="Audio"><Music size={18} className="text-muted-foreground" /></div>
                }
                return <img key={i} src={src} className="w-10 h-10 rounded-md object-cover border border-border bg-accent/50" alt="thumbnail" />
              })}
              {images.length > 4 && (
                <div className="w-10 h-10 rounded-md bg-accent text-[10px] flex items-center justify-center font-bold text-muted-foreground border border-border shrink-0">
                  +{images.length - 4}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs text-muted-foreground font-medium">
              {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {(entry.photos?.length || 0) > 0 && (
                <span className="flex items-center gap-1"><ImageIcon size={12}/> {entry.photos!.length}</span>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex gap-1 overflow-hidden items-center justify-end">
                  {entry.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="bg-accent/50 px-2 py-0.5 rounded text-foreground truncate max-w-[70px]">
                      {tag}
                    </span>
                  ))}
                  {entry.tags.length > 3 && (
                    <span className="bg-accent/50 px-1.5 py-0.5 rounded text-foreground">
                      +{entry.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover Actions (when not in selection mode) */}
        {!isSelectionMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur rounded-lg p-1 shadow-sm border border-border z-10">
            <button onClick={(e) => { e.stopPropagation(); onPreview() }} className="p-1.5 rounded-md hover:bg-accent text-primary" title="Preview">
              <Eye size={14}/>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-md hover:bg-accent text-primary" title="Edit">
              <Edit2 size={14}/>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onAction('favorite', entry) }} className={`p-1.5 rounded-md hover:bg-accent ${entry.isFavorite ? 'text-yellow-500' : 'text-muted-foreground'}`} title={entry.isFavorite ? 'Unfavorite' : 'Favorite'}>
              <Star size={14} fill={entry.isFavorite ? 'currentColor' : 'none'}/>
            </button>
            {!entry.isArchived ? (
              <button onClick={(e) => { e.stopPropagation(); onAction('archive', entry) }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Archive">
                <Archive size={14}/>
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onAction('unarchive', entry) }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Unarchive">
                <ArchiveRestore size={14}/>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onAction('delete', entry) }} className="p-1.5 rounded-md hover:bg-red-500/10 text-red-500" title="Delete">
              <Trash2 size={14}/>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
