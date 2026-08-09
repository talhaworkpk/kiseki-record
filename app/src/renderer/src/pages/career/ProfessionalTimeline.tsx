import { useState, useEffect, useRef } from 'react'
import { Clock, GraduationCap, Briefcase, FolderGit2, FileText, Award } from 'lucide-react'

type TimelineEvent = {
  id: string
  date: Date
  type: 'Education' | 'Career' | 'Project' | 'Certificate' | 'Achievement'
  title: string
  subtitle: string
  description?: string
  icon: any
  colorClass: string
}

export default function ProfessionalTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const allEvents: TimelineEvent[] = []
      
      // @ts-ignore
      const edu = await window.api.db.find('education', {})
      edu.forEach((e: any) => {
        allEvents.push({
          id: `edu-${e._id}`, date: new Date(e.startDate), type: 'Education',
          title: `Started ${e.degree}`, subtitle: e.school,
          icon: GraduationCap, colorClass: 'bg-primary'
        })
        if (e.endDate && e.status === 'Graduated') {
          allEvents.push({
            id: `edu-end-${e._id}`, date: new Date(e.endDate), type: 'Education',
            title: `Graduated with ${e.degree}`, subtitle: e.school,
            icon: GraduationCap, colorClass: 'bg-primary'
          })
        }
      })

      // @ts-ignore
      const career = await window.api.db.find('career', {})
      career.forEach((c: any) => {
        allEvents.push({
          id: `car-${c._id}`, date: new Date(c.startDate), type: 'Career',
          title: `Started as ${c.position}`, subtitle: c.company,
          icon: Briefcase, colorClass: 'bg-blue-500'
        })
      })

      // @ts-ignore
      const proj = await window.api.db.find('projects', {})
      proj.forEach((p: any) => {
        allEvents.push({
          id: `proj-${p._id}`, date: new Date(p.startDate), type: 'Project',
          title: `Started Project: ${p.title}`, subtitle: p.technologies?.join(', ') || '',
          icon: FolderGit2, colorClass: 'bg-pink-500'
        })
      })

      // @ts-ignore
      const certs = await window.api.db.find('certificates', {})
      certs.forEach((c: any) => {
        allEvents.push({
          id: `cert-${c._id}`, date: new Date(c.issueDate), type: 'Certificate',
          title: `Earned ${c.name}`, subtitle: c.organization,
          icon: FileText, colorClass: 'bg-green-500'
        })
      })

      // @ts-ignore
      const ach = await window.api.db.find('achievements', {})
      ach.forEach((a: any) => {
        allEvents.push({
          id: `ach-${a._id}`, date: new Date(a.date), type: 'Achievement',
          title: a.title, subtitle: '', description: a.description,
          icon: Award, colorClass: 'bg-yellow-500'
        })
      })

      allEvents.sort((a, b) => b.date.getTime() - a.date.getTime())
      setEvents(allEvents)
    } catch (err) {
      console.error(err)
    }
  }

  // Group by year
  const groupedEvents: { [year: string]: TimelineEvent[] } = {}
  events.forEach(e => {
    const year = e.date.getFullYear().toString()
    if (!groupedEvents[year]) groupedEvents[year] = []
    groupedEvents[year].push(e)
  })

  const openEdit = (record: any) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Clock className="text-foreground" /> 
          Professional Timeline
        </h1>
        <p className="text-muted-foreground mt-1">A chronological view of your entire career journey.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-12">
        {Object.keys(groupedEvents).sort((a, b) => Number(b) - Number(a)).map(year => (
          <div key={year}>
            <div className="flex items-center gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
              <h2 className="text-3xl font-black text-foreground/20">{year}</h2>
              <div className="h-px bg-border flex-1"></div>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:ml-[1.125rem] before:h-full before:w-0.5 before:bg-border">
              {groupedEvents[year].map(event => (
                <div key={event.id} className="relative flex items-center justify-start group">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full border-4 border-background ${event.colorClass} text-white shadow z-10 shrink-0`}>
                    <event.icon size={14} />
                  </div>
                  <div className="w-[calc(100%-3rem)] pl-4">
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:border-primary/50 transition-colors">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">{event.date.toLocaleDateString([], { month: 'long', day: 'numeric' })}</div>
                      <h3 className="text-lg font-bold">{event.title}</h3>
                      {event.subtitle && <p className="text-sm text-muted-foreground mt-1">{event.subtitle}</p>}
                      {event.description && <p className="text-sm text-foreground/80 mt-2">{event.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground">
            No milestones added yet. Add Education, Career, Projects, or Certificates to see them here.
          </div>
        )}
      </div>
    </div>
  )
}
