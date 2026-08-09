import { useState, useEffect, useMemo, useRef } from 'react'
import { Archive, RefreshCw, Trash2, Search, Loader2 } from 'lucide-react'
import { Habit } from '../../types'
import { logHabitActivity } from './HabitManager'

export default function Archived() {
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const archivedHabits = await window.api.db.find('habits', { archived: true })
      setHabits(archivedHabits)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

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

  const handleRestore = async (habitId: string) => {
    try {
      // @ts-ignore
      await window.api.db.update('habits', { _id: habitId }, { $set: { archived: false, updatedAt: Date.now() } })
      await logHabitActivity(habitId, 'restored')
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (habitId: string) => {
    if (!confirm('Are you sure you want to permanently delete this habit? All history and timer sessions will be wiped.')) return
    try {
      // @ts-ignore
      await window.api.db.remove('habits', { _id: habitId })
      // Clean up logs
      // @ts-ignore
      await window.api.db.remove('habitLogs', { habitId }, { multi: true })
      // @ts-ignore
      await window.api.db.remove('habitTimerSessions', { habitId }, { multi: true })
      // @ts-ignore
      await window.api.db.remove('habitBreaks', { habitId }, { multi: true })
      // @ts-ignore
      await window.api.db.remove('habitActivityLogs', { habitId }, { multi: true })
      loadData()
    } catch (err) { console.error(err) }
  }

  const filteredHabits = useMemo(() => {
    if (!searchQuery) return habits
    const q = searchQuery.toLowerCase()
    return habits.filter(h => h.title.toLowerCase().includes(q) || h.category.toLowerCase().includes(q))
  }, [habits, searchQuery])

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1">Archived Habits</h1>
          <p className="text-muted-foreground font-medium">Habits you've paused indefinitely. Restore them anytime.</p>
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/>
          <input 
            type="text" 
            placeholder="Search archived..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border pl-10 pr-4 py-2 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
          />
        </div>
      </div>

      {filteredHabits.length === 0 ? (
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-3xl max-w-2xl mx-auto mt-20">
          <Archive size={48} className="mx-auto text-primary/30 mb-4"/>
          <h2 className="text-2xl font-bold mb-2">No archived habits found.</h2>
          <p className="text-muted-foreground">When you archive a habit, it will appear here safely preserved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHabits.map(habit => (
            <div key={habit._id} className="bg-card border border-border p-5 rounded-2xl flex flex-col hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-foreground truncate pr-2">{habit.title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-accent px-2 py-1 rounded-md">{habit.category}</span>
              </div>
              
              <div className="text-sm text-muted-foreground mb-6 flex-1">
                {habit.description || 'No description provided.'}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border mt-auto">
                <span className="text-xs text-muted-foreground font-medium">Since {new Date(habit.createdAt).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleRestore(habit._id!)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-foreground hover:bg-primary/20 hover:text-primary transition-colors tooltip-trigger" title="Restore">
                    <RefreshCw size={14}/>
                  </button>
                  <button onClick={() => handleDelete(habit._id!)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent text-foreground hover:bg-red-500/20 hover:text-red-500 transition-colors tooltip-trigger" title="Delete Permanently">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
