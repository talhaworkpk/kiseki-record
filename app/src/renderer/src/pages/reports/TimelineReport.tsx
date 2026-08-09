import { useState, useEffect, useRef } from 'react'
import { Clock, Filter, Book, Target, Sparkles, Award, Briefcase, GraduationCap, FolderGit2, FileText, Activity, Heart, Plane, DollarSign } from 'lucide-react'

type TimelineEvent = {
  id: string
  date: Date
  type: string
  title: string
  subtitle: string
  description?: string
  icon: any
  colorClass: string
}

export default function TimelineReport() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [filterType, setFilterType] = useState('All') // 'Day', 'Week', 'Month', 'Year', 'Lifetime', 'All'
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const categories = [
    { name: 'Journal', icon: Book, color: 'bg-orange-500' },
    { name: 'Records', icon: FileText, color: 'bg-blue-500' },
    { name: 'Goals', icon: Target, color: 'text-red-500' },
    { name: 'Education', icon: GraduationCap, color: 'bg-primary' },
    { name: 'Career', icon: Briefcase, color: 'bg-blue-600' },
    { name: 'Projects', icon: FolderGit2, color: 'bg-pink-500' },
    { name: 'Certificates', icon: Award, color: 'bg-green-500' },
    { name: 'Skills', icon: Sparkles, color: 'bg-purple-500' }
  ]

  const loadData = async () => {
    try {
      const allEvents: TimelineEvent[] = []
      
      // Load Journal
      // @ts-ignore
      const journals = await window.api.db.find('journal', {})
      journals.forEach((j: any) => {
        const plainText = j.content ? j.content.replace(/<[^>]*>?/gm, '') : ''
        allEvents.push({ id: `j-${j._id}`, date: new Date(j.createdAt), type: 'Journal', title: 'Journal Entry', subtitle: j.tags?.join(', ') || '', description: plainText.substring(0, 100) + '...', icon: Book, colorClass: 'bg-orange-500 text-white' })
      })

      // Load Records
      // @ts-ignore
      const records = await window.api.db.find('records', {})
      records.forEach((r: any) => {
        allEvents.push({ id: `r-${r._id}`, date: new Date(r.createdAt), type: 'Records', title: r.title, subtitle: r.category, description: r.description, icon: FileText, colorClass: 'bg-blue-500 text-white' })
      })

      // Load Education
      // @ts-ignore
      const edu = await window.api.db.find('education', {})
      edu.forEach((e: any) => {
        allEvents.push({ id: `edu-${e._id}`, date: new Date(e.startDate), type: 'Education', title: `Started ${e.degree}`, subtitle: e.school, icon: GraduationCap, colorClass: 'bg-primary text-primary-foreground' })
        if (e.endDate && e.status === 'Graduated') allEvents.push({ id: `edu-end-${e._id}`, date: new Date(e.endDate), type: 'Education', title: `Graduated with ${e.degree}`, subtitle: e.school, icon: GraduationCap, colorClass: 'bg-primary text-primary-foreground' })
      })

      // Load Career
      // @ts-ignore
      const career = await window.api.db.find('career', {})
      career.forEach((c: any) => {
        allEvents.push({ id: `car-${c._id}`, date: new Date(c.startDate), type: 'Career', title: `Started as ${c.position}`, subtitle: c.company, icon: Briefcase, colorClass: 'bg-blue-600 text-white' })
      })

      // Load Projects
      // @ts-ignore
      const proj = await window.api.db.find('projects', {})
      proj.forEach((p: any) => {
        allEvents.push({ id: `proj-${p._id}`, date: new Date(p.startDate), type: 'Projects', title: `Started Project: ${p.title}`, subtitle: p.technologies?.join(', ') || '', icon: FolderGit2, colorClass: 'bg-pink-500 text-white' })
      })

      // Load Certificates
      // @ts-ignore
      const certs = await window.api.db.find('certificates', {})
      certs.forEach((c: any) => {
        allEvents.push({ id: `cert-${c._id}`, date: new Date(c.issueDate), type: 'Certificates', title: `Earned ${c.name}`, subtitle: c.organization, icon: Award, colorClass: 'bg-green-500 text-white' })
      })

      // Load Goals
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})
      goals.forEach((g: any) => {
        if (g.status === 'Completed') {
          allEvents.push({ id: `goal-${g._id}`, date: new Date(g.updatedAt), type: 'Goals', title: `Completed Goal: ${g.title}`, subtitle: g.category, icon: Target, colorClass: 'bg-red-500 text-white' })
        }
      })

      // Load Skills
      // @ts-ignore
      const skills = await window.api.db.find('skills', {})
      skills.forEach((s: any) => {
        allEvents.push({ id: `skill-${s._id}`, date: new Date(s.createdAt), type: 'Skills', title: `Added Skill: ${s.name}`, subtitle: `Level ${s.level}%`, icon: Sparkles, colorClass: 'bg-purple-500 text-white' })
      })

      allEvents.sort((a, b) => b.date.getTime() - a.date.getTime())
      setEvents(allEvents)
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

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  // Apply filters
  let filteredEvents = events
  if (selectedCategories.length > 0) {
    filteredEvents = filteredEvents.filter(e => selectedCategories.includes(e.type))
  }

  // Timeframe filter
  const now = new Date()
  if (filterType === 'Day') {
    filteredEvents = filteredEvents.filter(e => e.date.toDateString() === now.toDateString())
  } else if (filterType === 'Week') {
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    filteredEvents = filteredEvents.filter(e => e.date >= lastWeek)
  } else if (filterType === 'Month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    filteredEvents = filteredEvents.filter(e => e.date >= lastMonth)
  } else if (filterType === 'Year') {
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    filteredEvents = filteredEvents.filter(e => e.date >= lastYear)
  }

  // Group by Date String
  const groupedEvents: { [dateStr: string]: TimelineEvent[] } = {}
  filteredEvents.forEach(e => {
    // For 'Lifetime', group by Year/Month to avoid massive lists, but standard is Day.
    const key = filterType === 'Lifetime' || filterType === 'Year' 
      ? e.date.toLocaleDateString([], { month: 'long', year: 'numeric' })
      : e.date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    if (!groupedEvents[key]) groupedEvents[key] = []
    groupedEvents[key].push(e)
  })

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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="text-primary" /> 
            Life Timeline
          </h1>
          <p className="text-muted-foreground mt-1">A consolidated chronological view of your entire life.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Filters Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Filter size={18}/> Timeframe</h3>
            <div className="space-y-2">
              {['Day', 'Week', 'Month', 'Year', 'Lifetime', 'All'].map(tf => (
                <button 
                  key={tf} 
                  onClick={() => setFilterType(tf)}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${filterType === tf ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground/80'}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-4"><Filter size={18}/> Categories</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <button 
                  key={cat.name} 
                  onClick={() => toggleCategory(cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedCategories.includes(cat.name) ? 'bg-accent border border-border' : 'hover:bg-accent/50 text-foreground/80 border border-transparent'}`}
                >
                  <span className="flex items-center gap-2"><cat.icon size={16} /> {cat.name}</span>
                  {selectedCategories.includes(cat.name) && <div className="w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
            {selectedCategories.length > 0 && (
              <button onClick={() => setSelectedCategories([])} className="w-full mt-4 text-xs font-bold text-muted-foreground hover:text-foreground">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="md:col-span-3">
          <div className="space-y-12">
            {Object.keys(groupedEvents).map(dateKey => (
              <div key={dateKey}>
                <div className="flex items-center gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-xl font-bold text-foreground">{dateKey}</h2>
                  <div className="h-px bg-border flex-1"></div>
                </div>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:ml-[1.125rem] before:h-full before:w-0.5 before:bg-border">
                  {groupedEvents[dateKey].map(event => (
                    <div key={event.id} className="relative flex items-center justify-start group">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full border-4 border-background ${event.colorClass} shadow z-10 shrink-0`}>
                        <event.icon size={14} />
                      </div>
                      <div className="w-[calc(100%-3rem)] pl-4">
                        <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-base font-bold">{event.title}</h3>
                            <span className="text-xs font-semibold text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{event.type}</span>
                          </div>
                          
                          {event.subtitle && <p className="text-sm font-medium text-primary mb-2">{event.subtitle}</p>}
                          {event.description && <p className="text-sm text-foreground/80 line-clamp-3">{event.description}</p>}
                          
                          {/* Sub-time display (HH:MM) if viewing Day/Week */}
                          {(filterType === 'Day' || filterType === 'Week' || filterType === 'All') && (
                            <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                              <Clock size={12}/> {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(groupedEvents).length === 0 && (
              <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground">
                No events found for the selected filters.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
