import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, FileText, Book, Target, Sparkles, Award, CalendarDays, Zap, Star, Calendar } from 'lucide-react'

export default function Overview() {
  const [stats, setStats] = useState({
    records: 0, journal: 0, goals: 0, skills: 0, certificates: 0, daysActive: 0, productivity: 0
  })
  
  const [highlights, setHighlights] = useState<{ id: string, title: string, icon: any, color: string }[]>([])
  const [upcoming, setUpcoming] = useState<{ id: string, title: string, date: string, type: string }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

      // Fetch all required data
      // @ts-ignore
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const journals = await window.api.db.find('journal', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      // @ts-ignore
      const skills = await window.api.db.find('skills', {})
      // @ts-ignore
      const certificates = await window.api.db.find('certificates', {})

      // Calculate this month's stats
      const recordsThisMonth = records.filter((r: any) => r.createdAt >= startOfMonth)
      const journalsThisMonth = journals.filter((j: any) => j.createdAt >= startOfMonth)
      const goalsCompletedThisMonth = goals.filter((g: any) => g.status === 'Completed' && g.updatedAt >= startOfMonth)
      const skillsThisMonth = skills.filter((s: any) => s.createdAt >= startOfMonth)
      const certsThisMonth = certificates.filter((c: any) => c.createdAt >= startOfMonth)

      // Calculate active days
      const activeDates = new Set([
        ...recordsThisMonth.map((r: any) => new Date(r.createdAt).toDateString()),
        ...journalsThisMonth.map((j: any) => new Date(j.createdAt).toDateString())
      ])
      
      const currentDayOfMonth = now.getDate()
      const productivity = Math.round((activeDates.size / currentDayOfMonth) * 100)

      setStats({
        records: recordsThisMonth.length,
        journal: journalsThisMonth.length,
        goals: goalsCompletedThisMonth.length,
        skills: skillsThisMonth.length,
        certificates: certsThisMonth.length,
        daysActive: activeDates.size,
        productivity: productivity > 100 ? 100 : productivity
      })

      // Generate Highlights (recent important things)
      const recentHighlights: { id: string, title: string, icon: any, color: string }[] = []
      goalsCompletedThisMonth.slice(0, 2).forEach((g: any) => recentHighlights.push({ id: g._id, title: `Completed Goal: ${g.title}`, icon: Target, color: 'text-red-500' }))
      certsThisMonth.slice(0, 1).forEach((c: any) => recentHighlights.push({ id: c._id, title: `Earned Certificate: ${c.name}`, icon: Award, color: 'text-green-500' }))
      skillsThisMonth.slice(0, 1).forEach((s: any) => recentHighlights.push({ id: s._id, title: `Learned Skill: ${s.name}`, icon: Sparkles, color: 'text-purple-500' }))
      
      if (recentHighlights.length === 0) {
        recentHighlights.push({ id: '1', title: 'Started logging your journey', icon: Star, color: 'text-yellow-500' })
      }
      setHighlights(recentHighlights)

      // Generate Upcoming (goals approaching deadline)
      const upcomingEvents: { id: string, title: string, date: string, type: string }[] = []
      const activeGoals = goals.filter((g: any) => g.status === 'Active' && g.targetDate)
      activeGoals.sort((a: any, b: any) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      
      activeGoals.slice(0, 4).forEach((g: any) => {
        upcomingEvents.push({
          id: g._id,
          title: g.title,
          date: new Date(g.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          type: 'Goal Deadline'
        })
      })
      setUpcoming(upcomingEvents)

    } catch (err) {
      console.error(err)
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="text-primary" /> 
            Overview
          </h1>
          <p className="text-muted-foreground mt-1">A quick glance at your activity this month.</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Month</div>
          <div className="text-xl font-bold text-foreground">{new Date().toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Records Added" value={stats.records} color="text-blue-500" />
        <StatCard icon={Book} label="Journal Entries" value={stats.journal} color="text-orange-500" />
        <StatCard icon={Target} label="Goals Completed" value={stats.goals} color="text-red-500" />
        <StatCard icon={Sparkles} label="New Skills" value={stats.skills} color="text-purple-500" />
        <StatCard icon={Award} label="Certificates" value={stats.certificates} color="text-green-500" />
        <StatCard icon={CalendarDays} label="Days Active" value={stats.daysActive} color="text-indigo-500" />
        <StatCard icon={Zap} label="Productivity" value={`${stats.productivity}%`} color="text-yellow-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Highlights */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Star className="text-yellow-500" /> Recent Highlights
          </h3>
          <div className="space-y-4">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                <div className={`p-2 rounded-full bg-accent ${h.color}`}><h.icon size={16} /></div>
                <span className="font-medium text-foreground">{h.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
            <Calendar className="text-blue-500" /> Upcoming
          </h3>
          <div className="space-y-4">
            {upcoming.length > 0 ? upcoming.map((u, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                <div>
                  <div className="font-medium text-foreground">{u.title}</div>
                  <div className="text-xs text-muted-foreground">{u.type}</div>
                </div>
                <div className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-md">{u.date}</div>
              </div>
            )) : (
              <div className="text-center p-6 text-muted-foreground border border-dashed border-border rounded-lg">
                No upcoming deadlines this month.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors">
      <div className={`w-12 h-12 rounded-full bg-accent flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </div>
  )
}
