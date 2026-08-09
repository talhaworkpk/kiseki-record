import { useState, useEffect, useMemo, useRef } from 'react'
import { History as HistoryIcon, Search, Loader2, Filter, Edit, Check, X, Clock, Archive, Trash2, Zap, RefreshCw } from 'lucide-react'
import { HabitActivityLog, Habit } from '../../types'

export default function History() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<HabitActivityLog[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterHabit, setFilterHabit] = useState('all')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const allLogs = await window.api.db.find('habitActivityLogs', {})
      // @ts-ignore
      const allHabits = await window.api.db.find('habits', {})
      
      setLogs(allLogs.sort((a:any, b:any) => b.timestamp - a.timestamp))
      setHabits(allHabits)
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

  const filteredLogs = useMemo(() => {
    let result = logs
    if (filterAction !== 'all') result = result.filter(l => l.action === filterAction)
    if (filterHabit !== 'all') result = result.filter(l => l.habitId === filterHabit)
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l => l.details?.toLowerCase().includes(q) || habits.find(h => h._id === l.habitId)?.title.toLowerCase().includes(q))
    }
    return result
  }, [logs, habits, filterAction, filterHabit, searchQuery])

  const getActionIcon = (action: string) => {
    switch(action) {
      case 'created': return <Zap size={14} className="text-yellow-500" />
      case 'edited': return <Edit size={14} className="text-blue-500" />
      case 'completed': return <Check size={14} className="text-green-500" />
      case 'missed': 
      case 'auto_missed': return <X size={14} className="text-red-500" />
      case 'timer_started':
      case 'timer_paused':
      case 'timer_completed': return <Clock size={14} className="text-indigo-500" />
      case 'archived': return <Archive size={14} className="text-orange-500" />
      case 'restored': return <RefreshCw size={14} className="text-green-500" />
      case 'deleted': return <Trash2 size={14} className="text-red-500" />
      default: return <HistoryIcon size={14} className="text-muted-foreground" />
    }
  }

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
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1">Activity History</h1>
          <p className="text-muted-foreground font-medium">A complete timeline of all your habit interactions.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl">
            <Filter size={14} className="text-muted-foreground"/>
            <select value={filterHabit} onChange={e=>setFilterHabit(e.target.value)} className="bg-transparent text-sm font-bold outline-none cursor-pointer max-w-[150px]">
              <option value="all">All Habits</option>
              {habits.map(h => <option key={h._id} value={h._id}>{h.title}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl">
            <Filter size={14} className="text-muted-foreground"/>
            <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} className="bg-transparent text-sm font-bold outline-none cursor-pointer">
              <option value="all">All Actions</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed / Auto-Missed</option>
              <option value="edited">Edited</option>
              <option value="archived">Archived / Restored</option>
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/>
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border pl-10 pr-4 py-2 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center p-12 bg-card border border-dashed border-border rounded-3xl max-w-2xl mx-auto mt-20">
          <HistoryIcon size={48} className="mx-auto text-primary/30 mb-4"/>
          <h2 className="text-2xl font-bold mb-2">No activity found.</h2>
          <p className="text-muted-foreground">Adjust your filters or start interacting with your habits to see logs here.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
            {filteredLogs.map((log, index) => {
              const habit = habits.find(h => h._id === log.habitId)
              const date = new Date(log.timestamp)
              const isLast = index === filteredLogs.length - 1
              
              return (
                <div key={log._id} className={`p-4 sm:p-6 flex gap-4 sm:gap-6 hover:bg-accent/30 transition-colors ${!isLast ? 'border-b border-border' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center shrink-0 shadow-sm">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1">
                      <div className="font-bold text-foreground">
                        {habit ? habit.title : <span className="text-muted-foreground italic">Deleted Habit</span>}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {date.toLocaleDateString()} at {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <div className="text-sm text-foreground/80 font-medium capitalize">
                      {log.action.replace('_', ' ')}
                    </div>
                    {log.details && (
                      <div className="text-xs text-muted-foreground mt-2 bg-background border border-border p-2 rounded-lg">
                        {log.details}
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
  )
}
