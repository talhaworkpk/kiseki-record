import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Habit } from '../../types'
import { useHabitAnalytics, FilterPeriod } from '../../hooks/useHabitAnalytics'
import { format, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns'
import { X, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  habit: Habit
  onClose: () => void
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    
    let diffIcon = ''
    let diffText = ''
    let urgeText = ''
    if (data.difficultyLevel === 'easy') { diffIcon = '🟢'; diffText = 'Easy'; urgeText = 'None' }
    else if (data.difficultyLevel === 'slight') { diffIcon = '🟡'; diffText = 'Slight Resistance'; urgeText = 'Small' }
    else if (data.difficultyLevel === 'difficult') { diffIcon = '🟠'; diffText = 'Difficult'; urgeText = 'Noticeable' }
    else if (data.difficultyLevel === 'very_difficult') { diffIcon = '🔴'; diffText = 'Very Difficult'; urgeText = 'Strong' }
    else if (data.difficultyLevel === 'couldnt_resist') { diffIcon = '⚫'; diffText = "Couldn't Resist"; urgeText = 'Extreme' }

    return (
      <div className="bg-card border border-border p-3 rounded-xl shadow-lg text-sm min-w-[160px]">
        <div className="font-bold border-b border-border pb-2 mb-2">{data.date || label}</div>
        {data.completed > 1 || data.missed > 1 ? (
          <>
            <div className="flex justify-between items-center text-green-500 font-medium mb-1">
              <span>Completed</span>
              <span>{data.completed}</span>
            </div>
            <div className="flex justify-between items-center text-red-500 font-medium mb-3">
              <span>Missed</span>
              <span>{data.missed}</span>
            </div>
          </>
        ) : data.completed === 1 ? (
          <div className="font-bold text-green-500 mb-3">Completed</div>
        ) : data.missed === 1 ? (
          <div className="font-bold text-red-500 mb-3">Missed</div>
        ) : (
          <div className="font-bold text-muted-foreground mb-3">No activity</div>
        )}
        
        {data.difficultyLevel !== undefined ? (
          diffText ? (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Resistance</div>
              <div className="font-bold flex items-center gap-1.5 mb-2">{diffIcon} {diffText}</div>
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Urge to skip</div>
              <div className="font-bold text-xs">{urgeText}</div>
            </div>
          ) : (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground uppercase font-bold mb-1">Resistance</div>
              <div className="font-medium text-xs text-muted-foreground">Not recorded</div>
            </div>
          )
        ) : null}
      </div>
    )
  }
  return null
}

export default function HabitAnalyticsModal({ habit, onClose }: Props) {
  const [filter, setFilter] = useState<FilterPeriod>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const { loading, analytics } = useHabitAnalytics(habit, filter, currentDate)

  const handlePrev = () => {
    if (filter === 'week') setCurrentDate(prev => subWeeks(prev, 1))
    if (filter === 'month') setCurrentDate(prev => subMonths(prev, 1))
    if (filter === 'year') setCurrentDate(prev => subYears(prev, 1))
  }

  const handleNext = () => {
    if (filter === 'week') setCurrentDate(prev => addWeeks(prev, 1))
    if (filter === 'month') setCurrentDate(prev => addMonths(prev, 1))
    if (filter === 'year') setCurrentDate(prev => addYears(prev, 1))
  }

  const renderDateLabel = () => {
    if (filter === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    if (filter === 'month') return format(currentDate, 'MMMM yyyy')
    if (filter === 'year') return format(currentDate, 'yyyy')
    return format(currentDate, 'MMM d, yyyy')
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-start bg-accent/30 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{habit.icon === 'Sparkles' ? '✨' : habit.icon}</span>
              <h2 className="text-2xl font-black">{habit.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Created {format(new Date(habit.createdAt || Date.now()), 'MMM d, yyyy')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-background border border-border hover:bg-accent rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex bg-accent rounded-xl p-1 shrink-0 w-full md:w-auto overflow-x-auto">
              {(['date', 'week', 'month', 'year'] as FilterPeriod[]).map(r => (
                <button 
                  key={r} 
                  onClick={() => { setFilter(r); setCurrentDate(new Date()) }} 
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors capitalize whitespace-nowrap ${filter === r ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {filter !== 'date' && (
              <div className="flex items-center gap-4 bg-background border border-border px-2 py-1 rounded-xl">
                <button onClick={handlePrev} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"><ChevronLeft size={18}/></button>
                <span className="text-sm font-bold min-w-[120px] text-center">{renderDateLabel()}</span>
                <button onClick={handleNext} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"><ChevronRight size={18}/></button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !analytics ? (
            <div className="text-center py-20 text-muted-foreground">Error loading analytics data.</div>
          ) : analytics.isBeforeCreation ? (
            <div className="text-center py-20 px-6 bg-accent/20 border border-dashed border-border rounded-2xl">
              <BarChart2 size={48} className="mx-auto text-muted-foreground/30 mb-4"/>
              <h3 className="text-xl font-bold mb-2">Habit didn't exist during this period.</h3>
              <p className="text-muted-foreground">This habit was created on {format(new Date(habit.createdAt || Date.now()), 'MMMM d, yyyy')}.</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Completed</div>
                  <div className="text-3xl font-black text-green-500">{analytics.completedCount}</div>
                </div>
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Missed</div>
                  <div className="text-3xl font-black text-red-500">{analytics.missedCount}</div>
                </div>
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Overcame</div>
                  <div className="text-3xl font-black text-primary">{analytics.overcameResistanceCount}</div>
                </div>
                <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Break</div>
                  <div className="text-3xl font-black text-orange-500">{analytics.breakDurationFormatted}</div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                <h3 className="font-bold text-lg mb-4">Habit Activity</h3>
                
                {analytics.chartData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No activity to display.
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMissed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} minTickGap={15} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                        <Area type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorMissed)" name="Missed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}
