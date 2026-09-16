import { useState, useEffect, useMemo, useRef } from 'react'
import { Calendar as CalendarIcon, Loader2, Check, X, Circle, HelpCircle, AlertCircle, Trash2, ChevronLeft, ChevronRight, Settings, BarChart2 } from 'lucide-react'
import { Habit, HabitDailyRecord, HabitBreak } from '../../types'
import { isBefore, isAfter, startOfDay, parseISO, format } from 'date-fns'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../components/ui/tooltip'
import MissReasonModal from './MissReasonModal'
import MissReasonPromptModal from './MissReasonPromptModal'
import TimelineSettingsModal from './TimelineSettingsModal'
import MonthAnalyticsModal from './MonthAnalyticsModal'
import { normalizeUrl, getSafeMediaUrl } from '../../lib/utils'

// Renders a background image at pixel-perfect native resolution.
// offsetX: 0-100, fraction of horizontal overflow (width-based, container-width-independent)
// offsetY: 0-100, fraction of scaled image height from top (container-height-independent)
// zoom: 100-300, scale relative to container width
function BgImage({ src, offsetX, offsetY, zoom, fit = 'cover' }: { src: string; offsetX: number; offsetY: number; zoom: number; fit?: 'cover' | 'contain' | 'fill' }) {
  const divRef = useRef<HTMLDivElement>(null)
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({
    backgroundImage: `url(${src})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  })

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      const apply = () => {
        if (!divRef.current) return
        const cw = divRef.current.offsetWidth
        const ch = divRef.current.offsetHeight
        if (!cw || !ch) return
        let sw: number, sh: number
        if (fit === 'fill') {
          sw = Math.round(cw * (zoom / 100))
          sh = Math.round(ch * (zoom / 100))
        } else {
          const baseScale = fit === 'contain'
            ? Math.min(cw / nw, ch / nh)
            : Math.max(cw / nw, ch / nh)
          const scale = baseScale * (zoom / 100)
          sw = Math.round(nw * scale)
          sh = Math.round(nh * scale)
        }
        const px = -Math.round((offsetX / 100) * Math.max(0, sw - cw))
        const py = -Math.round((offsetY / 100) * Math.max(0, sh - ch))
        setBgStyle({
          backgroundImage: `url(${src})`,
          backgroundSize: `${sw}px ${sh}px`,
          backgroundPosition: `${px}px ${py}px`,
          backgroundRepeat: 'no-repeat',
        })
      }
      apply()
      const ro = new ResizeObserver(apply)
      if (divRef.current) ro.observe(divRef.current)
      return () => ro.disconnect()
    }
    img.src = src
  }, [src, offsetX, offsetY, zoom, fit])

  return <div ref={divRef} className="absolute inset-0 pointer-events-none" style={bgStyle} />
}

// Named aliases so JSX stays readable
const CalBgImage = BgImage
const HdrBgImage = BgImage

export default function Timeline() {
  // Inject keyframes for all movement types
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'timeline-gradient-styles'
    style.textContent = `
      /* Clockwise spin */
      @keyframes tl-clockwise {
        from { transform: rotate(0deg) scale(2); }
        to   { transform: rotate(360deg) scale(2); }
      }
      /* Counter-clockwise spin */
      @keyframes tl-counter-clockwise {
        from { transform: rotate(0deg) scale(2); }
        to   { transform: rotate(-360deg) scale(2); }
      }
      /* Pulse — the border ring fades in and out */
      @keyframes tl-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.15; }
      }
      /* Bounce — conic-gradient rocks back and forth 90° */
      @keyframes tl-bounce {
        0%   { transform: rotate(0deg) scale(2); }
        25%  { transform: rotate(90deg) scale(2); }
        50%  { transform: rotate(0deg) scale(2); }
        75%  { transform: rotate(-90deg) scale(2); }
        100% { transform: rotate(0deg) scale(2); }
      }
      /* Sweep — rotates only 180° back and forth */
      @keyframes tl-sweep {
        0%   { transform: rotate(0deg) scale(2); }
        50%  { transform: rotate(180deg) scale(2); }
        100% { transform: rotate(0deg) scale(2); }
      }

      .tl-anim-clockwise         { animation: tl-clockwise         var(--spin-speed, 5s) linear infinite; transform-origin: center; }
      .tl-anim-counter-clockwise { animation: tl-counter-clockwise var(--spin-speed, 5s) linear infinite; transform-origin: center; }
      .tl-anim-pulse             { animation: tl-pulse             var(--spin-speed, 5s) ease-in-out infinite; transform-origin: center; }
      .tl-anim-bounce            { animation: tl-bounce            var(--spin-speed, 5s) ease-in-out infinite; transform-origin: center; }
      .tl-anim-sweep             { animation: tl-sweep             var(--spin-speed, 5s) ease-in-out infinite; transform-origin: center; }
    `
    const existing = document.getElementById('timeline-gradient-styles')
    if (existing) existing.remove()
    document.head.appendChild(style)
    return () => {
      document.getElementById('timeline-gradient-styles')?.remove()
    }
  }, [])
  const [loading, setLoading] = useState(true)
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitDailyRecord[]>([])
  const [breaks, setBreaks] = useState<HabitBreak[]>([])

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [missReasonModalOpen, setMissReasonModalOpen] = useState(false)
  const [missReasonPromptOpen, setMissReasonPromptOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<HabitDailyRecord | null>(null)
  const [selectedHabitTitle, setSelectedHabitTitle] = useState('')
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [monthAnalyticsModalOpen, setMonthAnalyticsModalOpen] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [publicSettings, setPublicSettings] = useState<any>(null)
  const [timelineSettings, setTimelineSettings] = useState({
    calendarBgImage: '',
    calendarBgVideo: '',
    calendarBgOpacity: 0.5,
    calendarBgOffsetX: 50,
    calendarBgOffsetY: 50,
    calendarBgZoom: 100,
    calendarBgFit: 'cover' as const,
    calendarBorderColors: ['#ff0000', '#ff6666', '#990000'],
    calendarBoxShadows: [],
    calendarDateColor: '#64748b',
    calendarDateHoverColor: '#0f172a',
    calendarBorderHoverColor: '#3b82f6',
    calendarBorderWidth: 2,
    calendarBorderRotation: false,
    calendarBorderRotationSpeed: 5,
    calendarBorderMovementType: 'clockwise',
    headerBgImage: '',
    headerBgVideo: '',
    headerBgOpacity: 0.5,
    headerBgOffsetX: 50,
    headerBgOffsetY: 50,
    headerBgZoom: 100,
    headerBgFit: 'cover' as const,
    headerBorderColors: ['#ff0000', '#ff6666', '#990000'],
    headerBoxShadows: [],
    headerBorderWidth: 2,
    headerBorderRotation: false,
    headerBorderRotationSpeed: 5,
    headerBorderMovementType: 'clockwise',
    sameAsPublic: true, // New property for private mode

    // Card settings
    cardGlassmorphism: true,
    cardBlur: 12,
    cardOpacity: 0.6
  })

  const loadData = async () => {
    try {
      // @ts-ignore
      const allHabits = await window.api.db.find('habits', { archived: { $ne: true } })
      // @ts-ignore
      const allLogs = await window.api.db.find('habitLogs', {})
      // @ts-ignore
      const allBreaks = await window.api.db.find('habitBreaks', {})
      
      setHabits(allHabits)
      setLogs(allLogs)
      setBreaks(allBreaks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // @ts-ignore
        const profile = await window.api.profile.getCurrent()
        const isPriv = profile === 'private'
        setIsPrivate(isPriv)

        // @ts-ignore
        const pubSettings = await window.api.settings.get('timelineSettings', timelineSettings)
        setPublicSettings(pubSettings)

        if (isPriv) {
          // @ts-ignore
          const privSettings = await window.api.settings.get('timelineSettings_private', { ...pubSettings, sameAsPublic: true })
          if (privSettings.sameAsPublic) {
            setTimelineSettings({ ...pubSettings, sameAsPublic: true })
          } else {
            setTimelineSettings(privSettings)
          }
        } else {
          setTimelineSettings(pubSettings)
        }
      } catch (err) {
        console.error('Error loading timeline settings:', err)
      }
    }
    loadSettings()
  }, [])

  const handleSaveSettings = async (settings: typeof timelineSettings) => {
    setTimelineSettings(settings)
    try {
      if (isPrivate) {
        // @ts-ignore
        await window.api.settings.set('timelineSettings_private', settings)
      } else {
        // @ts-ignore
        await window.api.settings.set('timelineSettings', settings)
      }
    } catch (err) {
      console.error('Error saving timeline settings:', err)
    }
  }

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

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days: Date[] = []
    
    // Pad previous month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // Pad next month
    const endPadding = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [currentMonth])

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const getStatusIcon = (status: string, colorClass: string) => {
    if (status === 'completed') return <Check size={12} className={colorClass} strokeWidth={3}/>
    if (status === 'missed') return <X size={12} className={colorClass} strokeWidth={3}/>
    if (status === 'paused') return <Circle size={12} className={colorClass} strokeWidth={3}/>
    return <HelpCircle size={12} className={colorClass} strokeWidth={3}/>
  }

  // Inferred missed logs
  const inferredLogs = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const inferred: HabitDailyRecord[] = []

    // Helper to check if habit is scheduled for a given date
    const isScheduled = (d: Date, habit: Habit) => {
      const day = d.getDay()
      if (habit.scheduleType === 'daily') return true
      if (habit.scheduleType === 'weekdays') return day >= 1 && day <= 5
      if (habit.scheduleType === 'weekends') return day === 0 || day === 6
      if (habit.scheduleType === 'specific_days' && habit.scheduleDays) {
        return habit.scheduleDays.includes(day)
      }
      return true
    }

    // Helper to check if a date is within any habit break for a specific habit
    const isWithinBreak = (d: Date, habitId: string) => {
      const habitBreaks = breaks.filter(b => b.habitId === habitId)
      return habitBreaks.some(b => {
        const bStart = startOfDay(parseISO(b.startDate))
        const bEnd = b.endDate ? startOfDay(parseISO(b.endDate)) : todayStart
        return (!isBefore(d, bStart) && !isAfter(d, bEnd))
      })
    }

    // Set of existing logs for quick lookup (date + habitId)
    const existingLogKeys = new Set(logs.map(l => `${l.date}_${l.habitId}`))

    calendarDays.forEach(d => {
      const dStart = startOfDay(d)
      if (!isBefore(dStart, todayStart)) return // only infer in the past
      
      const dKey = format(d, 'yyyy-MM-dd')
      
      habits.forEach(habit => {
        if (!habit.createdAt) return
        const hCreated = startOfDay(new Date(habit.createdAt))
        if (isBefore(dStart, hCreated)) return // skip days before habit creation
        
        const logKey = `${dKey}_${habit._id}`
        if (!existingLogKeys.has(logKey)) {
          if (isScheduled(d, habit) && !isWithinBreak(dStart, habit._id!)) {
            inferred.push({
              habitId: habit._id!,
              date: dKey,
              status: habit.category === 'Bad Habit' ? 'completed' : 'missed',
              createdAt: Date.now(),
              updatedAt: Date.now()
            })
          }
        }
      })
    })

    return inferred
  }, [calendarDays, logs, habits, breaks])

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  return (
    <TooltipProvider delayDuration={200}>
      <div 
        ref={scrollContainerRef}
        className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 bg-background/50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">Timeline</h1>
            <p className="text-muted-foreground font-medium text-lg">Your habit consistency mapped out in detail.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMonthAnalyticsModalOpen(true)}
              className="p-3 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-sm border border-white/50 dark:border-white/5 text-foreground rounded-2xl hover:bg-white/80 dark:hover:bg-white/20 transition-all hover:scale-[1.03] active:scale-95 group"
              title="Month Analytics"
            >
              <BarChart2 size={24} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="p-3 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-sm border border-white/50 dark:border-white/5 text-foreground rounded-2xl hover:bg-white/80 dark:hover:bg-white/20 transition-all hover:scale-[1.03] active:scale-95 group"
              title="Customize Timeline"
            >
              <Settings size={24} className="group-hover:rotate-90 transition-transform opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* ── Calendar gradient-border wrapper ─────────────────────────── */}
        {(() => {
          const cal = timelineSettings
          const bw = cal.calendarBorderWidth
          const colors = cal.calendarBorderColors
          const spin = cal.calendarBorderRotation
          const speed = cal.calendarBorderRotationSpeed
          const movement = cal.calendarBorderMovementType ?? 'clockwise'

          // Build the gradient background for the wrapper
          const gradientBg = colors.length > 1
            ? `linear-gradient(to right, ${colors.join(', ')})`
            : colors.length === 1
              ? colors[0]
              : 'transparent'

          const boxShadow = cal.calendarBoxShadows.length > 0
            ? cal.calendarBoxShadows.map(s => `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`).join(', ')
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'

          return (
            <div
              key={`cal-wrap-${colors.join(',')}-${bw}-${spin}-${speed}`}
              style={{
                borderRadius: '2rem',
                padding: colors.length > 0 ? `${bw}px` : '1px',
                background: gradientBg,
                boxShadow,
                position: 'relative',
                overflow: 'hidden',
                '--spin-speed': `${speed}s`,
              } as React.CSSProperties}
            >
              {/* Animated overlay — sits behind inner card, clips to wrapper */}
              {colors.length > 1 && spin && (
                <div
                  className={`tl-anim-${movement} pointer-events-none`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `conic-gradient(from 0deg, ${colors.join(', ')}, ${colors[0]})`,
                    '--spin-speed': `${speed}s`,
                    zIndex: 0,
                  } as React.CSSProperties}
                />
              )}

              {/* Inner card — covers the center, leaving only the padding ring as border */}
              <div
                style={{
                  borderRadius: 'calc(2rem - ' + bw + 'px)',
                  overflow: 'hidden',
                  position: 'relative',
                  zIndex: 1,
                  padding: '2rem',
                  backgroundColor: 'hsl(var(--card))',
                }}
              >
              {/* Background image — pixel-computed background-size for native resolution rendering */}
              {cal.calendarBgImage && (
                <CalBgImage
                  src={getSafeMediaUrl(cal.calendarBgImage)}
                  offsetX={cal.calendarBgOffsetX ?? 50}
                  offsetY={cal.calendarBgOffsetY ?? 50}
                  zoom={cal.calendarBgZoom ?? 100}
                  fit={cal.calendarBgFit ?? 'cover'}
                />
              )}
              {/* Background video */}
              {cal.calendarBgVideo && (
                <video
                  src={getSafeMediaUrl(cal.calendarBgVideo)}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
              {/* Background opacity overlay */}
              {(cal.calendarBgImage || cal.calendarBgVideo) && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: 'hsl(var(--card))', opacity: cal.calendarBgOpacity }}
                />
              )}
              {/* Subtle background gradient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none z-0"></div>

          {/* ── Header gradient-border wrapper ───────────────────────────── */}
          {(() => {
            const hdr = timelineSettings
            const hbw = hdr.headerBorderWidth
            const hcolors = hdr.headerBorderColors
            const hspin = hdr.headerBorderRotation
            const hspeed = hdr.headerBorderRotationSpeed
            const hmovement = hdr.headerBorderMovementType ?? 'clockwise'

            const hGradientBg = hcolors.length > 1
              ? `linear-gradient(to right, ${hcolors.join(', ')})`
              : hcolors.length === 1
                ? hcolors[0]
                : 'rgba(255,255,255,0.6)'

            const hBoxShadow = hdr.headerBoxShadows.length > 0
              ? hdr.headerBoxShadows.map(s => `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`).join(', ')
              : '0 8px 32px rgba(0,0,0,0.04),inset 0 1px 1px rgba(255,255,255,0.4)'

            return (
              <div
                key={`hdr-wrap-${hcolors.join(',')}-${hbw}-${hspin}-${hspeed}`}
                style={{
                  borderRadius: '2rem',
                  padding: hcolors.length > 0 ? `${hbw}px` : '1px',
                  background: hGradientBg,
                  boxShadow: hBoxShadow,
                  marginBottom: '2rem',
                  position: 'relative',
                  overflow: 'hidden',
                  '--spin-speed': `${hspeed}s`,
                } as React.CSSProperties}
              >
                {/* Animated overlay for header */}
                {hcolors.length > 1 && hspin && (
                  <div
                    className={`tl-anim-${hmovement} pointer-events-none`}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `conic-gradient(from 0deg, ${hcolors.join(', ')}, ${hcolors[0]})`,
                      '--spin-speed': `${hspeed}s`,
                      zIndex: 0,
                    } as React.CSSProperties}
                  />
                )}

                {/* Header inner card */}
                <div
                  style={{
                    borderRadius: 'calc(2rem - ' + hbw + 'px)',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  {/* Background image — uses same scale+object-position as the editor preview */}
                  {hdr.headerBgImage && (
                    <HdrBgImage
                      src={getSafeMediaUrl(hdr.headerBgImage)}
                      offsetX={hdr.headerBgOffsetX ?? 50}
                      offsetY={hdr.headerBgOffsetY ?? 50}
                      zoom={hdr.headerBgZoom ?? 100}
                      fit={hdr.headerBgFit ?? 'cover'}
                    />
                  )}
                  {/* Background video */}
                  {hdr.headerBgVideo && (
                    <video
                      src={getSafeMediaUrl(hdr.headerBgVideo)}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  )}
                  {/* Header background opacity overlay */}
                  {(hdr.headerBgImage || hdr.headerBgVideo) && (
                    <div
                      className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-3xl pointer-events-none"
                      style={{ opacity: hdr.headerBgOpacity }}
                    />
                  )}
                  <div className="p-6 relative z-10 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <button onClick={prevMonth} className="p-3 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-sm border border-white/50 dark:border-white/5 text-foreground rounded-2xl hover:bg-white/80 dark:hover:bg-white/20 transition-all hover:scale-[1.03] active:scale-95 group">
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform opacity-70 group-hover:opacity-100"/>
                      </button>
                      
                      <div className="text-2xl font-black flex items-center gap-4 px-8 py-3 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.03)] border border-white/60 dark:border-white/10 rounded-2xl">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-inner">
                          <CalendarIcon size={24} strokeWidth={2.5}/>
                        </div>
                        <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                          {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <button onClick={nextMonth} className="p-3 bg-white/50 dark:bg-white/10 backdrop-blur-md shadow-sm border border-white/50 dark:border-white/5 text-foreground rounded-2xl hover:bg-white/80 dark:hover:bg-white/20 transition-all hover:scale-[1.03] active:scale-95 group">
                        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform opacity-70 group-hover:opacity-100"/>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-4">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                        <div key={d} className={`text-center font-bold uppercase text-[10px] tracking-[0.2em] py-2.5 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] border border-white/50 dark:border-white/5 backdrop-blur-sm ${i === 0 || i === 6 ? 'bg-primary/10 text-primary' : 'bg-white/60 dark:bg-white/5 text-muted-foreground'}`}>
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="grid grid-cols-7 gap-4 relative z-10">
            {calendarDays.map((d, i) => {
              const isCurrentMonth = d.getMonth() === currentMonth.getMonth()
              
              const pad = (n: number) => String(n).padStart(2, '0')
              const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
              
              const today = new Date()
              const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
              
              const dayLogs = [...logs, ...inferredLogs].filter(l => l.date === dateStr)
              const isToday = dateStr === todayStr

              return (
                <div 
                  key={i} 
                  className={`min-h-[140px] p-4 rounded-[2rem] border transition-all flex flex-col group hover:shadow-xl ${isCurrentMonth ? 'border-white/15 dark:border-white/10 shadow-md' : 'border-transparent opacity-50'} ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent shadow-lg shadow-primary/30' : ''}`}
                  style={{
                    borderColor: isCurrentMonth ? 'rgba(255,255,255,0.4)' : 'transparent',
                    backgroundColor: `rgba(0, 0, 0, ${isCurrentMonth ? (timelineSettings.cardOpacity ?? 0.6) : (timelineSettings.cardOpacity ?? 0.6) * 0.5})`,
                    backdropFilter: (timelineSettings.cardGlassmorphism ?? true) ? `blur(${timelineSettings.cardBlur ?? 12}px)` : 'none',
                    WebkitBackdropFilter: (timelineSettings.cardGlassmorphism ?? true) ? `blur(${timelineSettings.cardBlur ?? 12}px)` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    const dateElement = e.currentTarget.querySelector('.date-number')
                    if (dateElement && !isToday) {
                      dateElement.style.color = timelineSettings.calendarDateHoverColor
                    }
                    if (isCurrentMonth) {
                      e.currentTarget.style.borderColor = timelineSettings.calendarBorderHoverColor
                    }
                  }}
                  onMouseLeave={(e) => {
                    const dateElement = e.currentTarget.querySelector('.date-number')
                    if (dateElement && !isToday) {
                      dateElement.style.color = timelineSettings.calendarDateColor
                    }
                    if (isCurrentMonth) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
                    }
                  }}
                >
                  <div 
                    className={`font-black mb-3 transition-colors date-number ${isToday ? 'text-primary text-xl' : 'text-white/80'}`}
                    style={{
                      color: isToday ? undefined : timelineSettings.calendarDateColor,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {d.getDate()}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden no-scrollbar pb-1">
                    {dayLogs.map((log, idx) => {
                      const habit = habits.find(h => h._id === log.habitId)
                      const isDeleted = !habit
                      const habitTitle = habit ? habit.title : (log.habitTitle || 'Deleted Habit')

                      let colorClass = 'bg-white/15 text-white border-white/20'
                      let iconColor = 'text-white/70'
                      let tooltipBorderColor = 'border-border/50'
                      let tooltipShadow = 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]'
                      
                      if (log.status === 'completed') {
                        colorClass = 'bg-green-500/50 border-green-400/60 text-green-100 hover:bg-green-500/60'
                        iconColor = 'text-green-300'
                        tooltipBorderColor = 'border-green-500/30'
                        tooltipShadow = 'shadow-[0_15px_40px_-10px_rgba(34,197,94,0.3)]'
                      } else if (log.status === 'missed') {
                        colorClass = 'bg-red-500/50 border-red-400/60 text-red-100 hover:bg-red-500/60'
                        iconColor = 'text-red-300'
                        tooltipBorderColor = 'border-red-500/30'
                        tooltipShadow = 'shadow-[0_15px_40px_-10px_rgba(239,68,68,0.3)]'
                      } else if (log.status === 'paused') {
                        colorClass = 'bg-yellow-500/50 border-yellow-400/60 text-yellow-100 hover:bg-yellow-500/60'
                        iconColor = 'text-yellow-300'
                        tooltipBorderColor = 'border-yellow-500/30'
                        tooltipShadow = 'shadow-[0_15px_40px_-10px_rgba(234,179,8,0.3)]'
                      }

                      return (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div 
                              className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors cursor-default backdrop-blur-sm shadow-sm group relative ${colorClass}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getStatusIcon(log.status, iconColor)}
                                <span className="text-[11px] font-bold truncate tracking-wide leading-none pt-0.5">{habitTitle}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {log.status === 'missed' && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedLog(log)
                                      setSelectedHabitTitle(habitTitle)
                                      if (log.missReason) {
                                        setMissReasonModalOpen(true)
                                      } else {
                                        setMissReasonPromptOpen(true)
                                      }
                                    }}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-md"
                                    title={log.missReason ? "View/Edit miss reason" : "Add miss reason"}
                                  >
                                    {log.missReason ? (
                                      <HelpCircle size={12} className={iconColor} />
                                    ) : (
                                      <AlertCircle size={12} className={iconColor} />
                                    )}
                                  </button>
                                )}
                                {isDeleted && (
                                  <div className="shrink-0">
                                    <Trash2 size={12} className="opacity-50 hover:opacity-100 transition-opacity text-red-500" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={8} className={`z-50 flex flex-col gap-1.5 px-4 py-3 ${tooltipShadow} border-2 ${tooltipBorderColor} bg-background/90 backdrop-blur-xl rounded-2xl items-start`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              {getStatusIcon(log.status, iconColor)}
                              <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
                                {log.status}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-xs text-muted-foreground max-w-[200px] break-words mt-1">
                                {log.notes}
                              </p>
                            )}
                            {log.missReason && (
                              <p className="text-xs text-red-400 max-w-[200px] break-words mt-1">
                                Reason: {log.missReason}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )
    })()}
  </div>

{missReasonModalOpen && selectedLog && (
  <MissReasonModal
    isOpen={missReasonModalOpen}
    onClose={() => { setMissReasonModalOpen(false); setSelectedLog(null); }}
    log={selectedLog}
    habitTitle={selectedHabitTitle}
    onSave={loadData}
  />
)}

{missReasonPromptOpen && selectedLog && (
  <MissReasonPromptModal
    isOpen={missReasonPromptOpen}
    onClose={() => { setMissReasonPromptOpen(false); setSelectedLog(null); }}
    log={selectedLog}
    habitTitle={selectedHabitTitle}
    onSave={loadData}
  />
)}

{settingsModalOpen && (
  <TimelineSettingsModal
    isOpen={settingsModalOpen}
    onClose={() => setSettingsModalOpen(false)}
    initialSettings={timelineSettings}
    onSave={handleSaveSettings}
  />
)}

{monthAnalyticsModalOpen && (
  <MonthAnalyticsModal
    habits={habits}
    logs={logs}
    breaks={breaks}
    initialMonth={currentMonth}
    onClose={() => setMonthAnalyticsModalOpen(false)}
  />
)}

    </TooltipProvider>
  )
}

