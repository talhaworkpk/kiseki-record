import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, Archive, TrendingUp, Calendar, Trophy, Zap, AlertTriangle, Edit, Play } from 'lucide-react'
import { Habit, HabitDailyRecord, HabitTimerSession, HabitBreak, HabitActivityLog } from '../../types'
import HabitFormModal from './HabitFormModal'
import HabitBreakModal from './HabitBreakModal'

export default function HabitDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [habit, setHabit] = useState<Habit | null>(null)
  
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [timers, setTimers] = useState<HabitTimerSession[]>([])
  const [breaks, setBreaks] = useState<HabitBreak[]>([])
  const [activity, setActivity] = useState<HabitActivityLog[]>([])
  
  const [formOpen, setFormOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const h = await window.api.db.find('habits', { _id: id })
      if (!h || h.length === 0) { navigate('/habits'); return; }
      setHabit(h[0])

      // @ts-ignore
      const l = await window.api.db.find('habitLogs', { habitId: id })
      // @ts-ignore
      const t = await window.api.db.find('habitTimerSessions', { habitId: id })
      // @ts-ignore
      const b = await window.api.db.find('habitBreaks', { habitId: id })
      // @ts-ignore
      const a = await window.api.db.find('habitActivityLogs', { habitId: id })
      
      setLogs(l)
      setTimers(t)
      setBreaks(b)
      setActivity(a.sort((x:any, y:any) => y.timestamp - x.timestamp))

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

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

  if (loading || !habit) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  const comp = logs.filter(l => l.status === 'completed').length
  const miss = logs.filter(l => l.status === 'missed').length
  const totalTrackedSeconds = timers.reduce((acc, curr) => acc + curr.duration, 0)
  const rate = (comp + miss) > 0 ? Math.round((comp / (comp + miss)) * 100) : 0

  // Heatmap generation
  const heatmapData: Record<string, string> = {}
  logs.forEach(l => heatmapData[l.date] = l.status)

  const today = new Date()
  const days: Date[] = []
  for (let i = 97; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(d)
  }

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
      <button onClick={() => navigate('/habits')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 font-medium transition-colors">
        <ArrowLeft size={16}/> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black">{habit.title}</h1>
            {habit.archived && <span className="bg-yellow-500/20 text-yellow-500 text-xs font-bold uppercase px-2 py-1 rounded-md">Archived</span>}
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Calendar size={14}/> Started {new Date(habit.createdAt).toLocaleDateString()}
            {habit.isTimerEnabled && <><span className="mx-1">•</span> <Play size={14}/> {Math.round((habit.targetDuration||0)/60)} min target</>}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setFormOpen(true)} className="px-4 py-2 rounded-xl font-bold bg-accent text-foreground hover:bg-primary/20 hover:text-primary transition-colors flex items-center gap-2">
            <Edit size={16}/> Edit
          </button>
          {!habit.archived && (
            <button onClick={() => setBreakOpen(true)} className="px-4 py-2 rounded-xl font-bold bg-accent text-foreground hover:bg-yellow-500/20 hover:text-yellow-500 transition-colors flex items-center gap-2">
              Start Break
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><TrendingUp size={16}/> Success Rate</div>
          <div className="text-4xl font-black">{rate}%</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><Trophy size={16}/> Completed</div>
          <div className="text-4xl font-black text-green-500">{comp}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Missed</div>
          <div className="text-4xl font-black text-red-500">{miss}</div>
        </div>
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
          <div className="text-sm font-bold text-muted-foreground uppercase mb-2 flex items-center gap-2"><Play size={16}/> Total Tracked</div>
          <div className="text-4xl font-black text-blue-500">{Math.round(totalTrackedSeconds / 3600)}h</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
            <h3 className="font-bold text-lg mb-6">Recent Consistency</h3>
            <div className="flex flex-wrap gap-2">
              {days.map((d, i) => {
                const dateStr = d.toISOString().split('T')[0]
                const status = heatmapData[dateStr]
                let colorClass = "bg-accent border-border"
                if (status === 'completed') colorClass = "bg-green-500 border-green-600 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                else if (status === 'missed') colorClass = "bg-red-500 border-red-600"
                else if (status === 'paused') colorClass = "bg-yellow-500 border-yellow-600"

                return (
                  <div 
                    key={i} 
                    title={`${dateStr}: ${status || 'No data'}`}
                    className={`w-4 h-4 rounded-[4px] border transition-transform hover:scale-150 cursor-pointer ${colorClass}`}
                  ></div>
                )
              })}
            </div>
          </div>

          <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
            <h3 className="font-bold text-lg mb-6">Description & Notes</h3>
            {habit.description ? (
              <p className="text-foreground/90 leading-relaxed font-medium">{habit.description}</p>
            ) : (
              <p className="text-muted-foreground italic">No description provided for this habit.</p>
            )}
            
            {breaks.length > 0 && (
              <div className="mt-8 pt-8 border-t border-border">
                <h4 className="font-bold mb-4 flex items-center gap-2"><Archive size={16}/> Habit Breaks</h4>
                <div className="space-y-3">
                  {breaks.map(b => (
                    <div key={b._id} className="bg-accent/30 p-3 rounded-xl border border-border flex justify-between items-center">
                      <div>
                        <span className="font-bold">{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">{b.reason || 'No reason provided.'}</div>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Break</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col h-[600px]">
          <h3 className="font-bold text-lg mb-6">Activity Log</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {activity.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">No activity logged yet.</div>
            ) : (
              activity.map(act => (
                <div key={act._id} className="flex gap-4 group">
                  <div className="w-2 bg-accent rounded-full shrink-0 group-hover:bg-primary transition-colors"></div>
                  <div>
                    <div className="text-sm font-bold capitalize">{act.action.replace('_', ' ')}</div>
                    {act.details && <div className="text-xs text-muted-foreground mt-0.5">{act.details}</div>}
                    <div className="text-[10px] text-muted-foreground/60 font-medium mt-1">{new Date(act.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <HabitFormModal 
        isOpen={formOpen} 
        onClose={() => setFormOpen(false)} 
        initialData={habit}
        onSave={loadData}
        onDelete={() => {
          // Handled via Dashboard or Archive, here we just return to habits list after deletion
          navigate('/habits')
        }}
      />

      <HabitBreakModal 
        isOpen={breakOpen} 
        onClose={() => setBreakOpen(false)} 
        habit={habit}
        onSave={loadData}
      />

    </div>
  )
}
