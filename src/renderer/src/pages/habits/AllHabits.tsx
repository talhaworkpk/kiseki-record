import { useState, useEffect, useRef } from 'react'
import { Target, Search, ArrowDownUp, CheckSquare, Square, Star, Archive as ArchiveIcon, ArchiveRestore, Trash2, Edit2, ChevronDown, ListChecks } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { Habit } from '../../types'
import HabitsStatistics from '../../components/habits/HabitsStatistics'
import HabitFormModal from './HabitFormModal'

export default function AllHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ scheduleType: 'all', isFavorite: false, isArchived: false })
  const [sortBy, setSortBy] = useState('newest')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null)

  // Edit Modal State
  const [formOpen, setFormOpen] = useState(false)
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('habits', {})
      setHabits(data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { loadData() }, [])

  const filteredHabits = habits.filter(h => {
    if (filters.scheduleType !== 'all' && h.scheduleType !== filters.scheduleType) return false
    if (filters.isFavorite && !h.isFavorite) return false
    if (filters.isArchived && !h.archived) return false
    if (!filters.isArchived && h.archived) return false
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!h.title.toLowerCase().includes(q) && !(h.notes && h.notes.toLowerCase().includes(q))) return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0)
    if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0)
    if (sortBy === 'alpha') return a.title.localeCompare(b.title)
    return 0
  })

  const bulkAction = async (action: 'delete' | 'archive' | 'unarchive' | 'favorite') => {
    if (action === 'delete' && !confirm(`Delete ${selectedIds.size} habits?`)) return
    try {
      for (const id of selectedIds) {
        if (action === 'delete') {
          // @ts-ignore
          await window.api.db.remove('habits', { _id: id }, {})
          NotificationEngine.notify('info', 'Habit Deleted', 'The habit was permanently removed.', 'Habits')
        } else {
          const updateData = action === 'favorite' ? { isFavorite: true } 
                           : action === 'archive' ? { archived: true }
                           : { archived: false }
          // @ts-ignore
          await window.api.db.update('habits', { _id: id }, { $set: updateData }, {})
        }
      }
      setSelectedIds(new Set())
      if (action === 'delete') setIsSelectionMode(false)
      loadData()
    } catch (err) { console.error(err) }
  }

  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      // @ts-ignore
      await window.api.db.update('habits', { _id: id }, { $set: { isFavorite: !current } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const toggleArchive = async (id: string, current: boolean) => {
    try {
      // @ts-ignore
      await window.api.db.update('habits', { _id: id }, { $set: { archived: !current } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this habit?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('habits', { _id: id }, {})
      NotificationEngine.notify('info', 'Habit Deleted', 'The habit was permanently removed.', 'Habits')
      loadData()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: Habit) => {
    setActiveHabit(record)
    setFormOpen(true)
  }

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) return
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

  // Keyboard navigation
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
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden text-foreground">
      
      {/* Top Toolbar */}
      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur z-20 flex flex-wrap gap-2 items-center justify-between shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="text-primary" size={20} /> All Habits
          </h1>
          
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search habits..."
              className="pl-9 pr-4 py-1.5 w-64 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded-xl bg-background overflow-hidden">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><ArrowDownUp size={14} className="text-muted-foreground"/></div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alpha">Alphabetical</option>
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

      {/* Selection Toolbar */}
      {isSelectionMode && (
        <div className="px-6 py-3 bg-accent/50 border-b border-border flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold">{selectedIds.size} selected</span>
            <button 
              onClick={() => {
                if (selectedIds.size === filteredHabits.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(filteredHabits.map(r => r._id!)))
              }} 
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14}/> {selectedIds.size === filteredHabits.length && filteredHabits.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => bulkAction('favorite')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Star size={14}/> Favorite</button>
            {!filters.isArchived && <button onClick={() => bulkAction('archive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveIcon size={14}/> Archive</button>}
            {filters.isArchived && <button onClick={() => bulkAction('unarchive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveRestore size={14}/> Unarchive</button>}
            <button onClick={() => bulkAction('delete')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 disabled:opacity-50"><Trash2 size={14}/> Delete</button>
          </div>
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-8 z-10 scrollbar-none relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <HabitsStatistics habits={habits} setFilters={setFilters} />

        <div className="space-y-4">
          {filteredHabits.map(record => (
            <div key={record._id} className="bg-card/70 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm relative group hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-4">
                {isSelectionMode && (
                  <button 
                    onClick={() => {
                      const s = new Set(selectedIds)
                      if (s.has(record._id!)) s.delete(record._id!)
                      else s.add(record._id!)
                      setSelectedIds(s)
                    }}
                    className="mt-1 flex-shrink-0"
                  >
                    {selectedIds.has(record._id!) ? <CheckSquare size={20} className="text-primary"/> : <Square size={20} className="text-muted-foreground"/>}
                  </button>
                )}
                
                <div className="flex-1 min-w-0 pr-32">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-2xl">{record.icon === 'Sparkles' ? '✨' : record.icon}</span>
                    <h3 className="text-lg font-bold truncate">{record.title}</h3>
                    
                    {record.isFavorite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                    {record.archived && <ArchiveIcon size={14} className="text-gray-500" />}
                    
                    <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-accent rounded-full">
                      {record.category}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Schedule: {record.scheduleType}
                    </span>
                  </div>
                  
                  {record.notes && (
                    <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {record.notes}
                    </div>
                  )}
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleFavorite(record._id!, !!record.isFavorite)} className={`p-1.5 bg-background border border-border rounded-md hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 transition-colors ${record.isFavorite ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-foreground'}`} title={record.isFavorite ? "Unfavorite" : "Favorite"}><Star size={16} className={record.isFavorite ? "fill-yellow-500" : ""}/></button>
                  <button onClick={() => toggleArchive(record._id!, !!record.archived)} className={`p-1.5 bg-background border border-border rounded-md hover:bg-gray-500/20 hover:text-gray-500 hover:border-gray-500/50 transition-colors ${record.archived ? 'text-gray-500 bg-gray-500/10 border-gray-500/30' : 'text-foreground'}`} title={record.archived ? "Unarchive" : "Archive"}><ArchiveIcon size={16}/></button>
                  <button onClick={() => openEdit(record)} className="p-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(record._id!)} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10" title="Delete"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {filteredHabits.length === 0 && (
            <div className="text-center p-8 border border-dashed border-border rounded-2xl text-muted-foreground bg-accent/10">
              No habits found matching your filters.
            </div>
          )}
        </div>
      </div>

      <HabitFormModal 
        isOpen={formOpen} 
        onClose={() => setFormOpen(false)} 
        initialData={activeHabit || undefined}
        onSave={loadData}
        onDelete={handleDelete}
      />
    </div>
  )
}
