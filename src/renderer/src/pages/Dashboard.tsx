import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Settings2, Plus, Search, Users, Database, Book, Target, Award, Sparkles, FolderGit2, Mail, FileText, Briefcase, GraduationCap, ChevronRight, Activity } from 'lucide-react'
import { DynamicWelcome } from '../components/dashboard/DynamicWelcome'
import { SummaryWidget } from '../components/dashboard/SummaryWidget'
import { RecentMemoriesWidget } from '../components/dashboard/RecentMemoriesWidget'
import { TimelineWidget } from '../components/dashboard/TimelineWidget'
import { AiInsightWidget } from '../components/dashboard/AiInsightWidget'
import { KnowledgeGraphWidget } from '../components/dashboard/KnowledgeGraphWidget'
import { CalendarWidget } from '../components/dashboard/CalendarWidget'
import { RelationshipsWidget } from '../components/dashboard/RelationshipsWidget'
import { GoalsWidget } from '../components/dashboard/GoalsWidget'
import { CalendarMemoryModal } from '../components/dashboard/CalendarMemoryModal'
import { QuickAddModal } from '../components/dashboard/QuickAddModal'
import { BirthdayBackground } from '../components/dashboard/BirthdayBackground'
import { BirthdayWidget } from '../components/dashboard/BirthdayWidget'
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'

const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, '') : ''

const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!text) return null
  const str = stripHtml(String(text))
  if (!highlight.trim()) return <>{str}</>
  const parts = str.split(new RegExp(`(${highlight})`, 'gi'))
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-primary/20 text-primary font-bold rounded-[3px] px-0.5 border border-primary/20 shadow-sm">{part}</span>
        ) : (
          part
        )
      )}
    </>
  )
}

const WIDGET_REGISTRY: Record<string, { component: React.FC<any>, label: string, defaultVisible: boolean, gridCol: string }> = {
  summary: { component: SummaryWidget, label: 'Today\'s Progress', defaultVisible: true, gridCol: 'col-span-1 md:col-span-2 xl:col-span-3' },
  ai: { component: AiInsightWidget, label: 'AI Insights', defaultVisible: true, gridCol: 'col-span-1 md:col-span-2 xl:col-span-3' },
  memories: { component: RecentMemoriesWidget, label: 'Recent Memories', defaultVisible: true, gridCol: 'col-span-1 md:col-span-2 xl:col-span-2' },
  timeline: { component: TimelineWidget, label: 'Timeline', defaultVisible: true, gridCol: 'col-span-1' },
  knowledge_graph: { component: KnowledgeGraphWidget, label: 'Personal Knowledge Graph', defaultVisible: true, gridCol: 'col-span-1 md:col-span-2 xl:col-span-3' },
  calendar: { component: CalendarWidget, label: 'Calendar', defaultVisible: true, gridCol: 'col-span-1' },
  relationships: { component: RelationshipsWidget, label: 'Relationship Updates', defaultVisible: true, gridCol: 'col-span-1' },
  goals: { component: GoalsWidget, label: 'Goals', defaultVisible: true, gridCol: 'col-span-1' }
}

const SearchSectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="sticky top-0 bg-card/95 backdrop-blur-md z-10 px-2 py-2 mb-2 border-b border-border/50 flex items-center gap-2">
    <Icon size={14} className="text-muted-foreground" />
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
  </div>
)

const SearchResultItem = ({ icon: Icon, title, desc, onClick, highlight, isSelected, id }: { icon: any, title: string, desc?: string, onClick: () => void, highlight: string, isSelected?: boolean, id?: string }) => (
  <div id={id} onClick={onClick} className={`p-3 rounded-xl cursor-pointer flex items-center gap-4 transition-all duration-300 border group ${isSelected ? 'bg-accent shadow-md -translate-y-0.5 border-border' : 'hover:bg-accent hover:shadow-md hover:-translate-y-0.5 border-transparent hover:border-border'}`}>
    <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm border border-primary/10">
      {typeof Icon === 'string' ? <span className="text-lg font-bold">{Icon}</span> : <Icon size={20} />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-bold text-foreground mb-0.5"><HighlightText text={title} highlight={highlight} /></div>
      {desc && <div className="text-xs text-muted-foreground truncate"><HighlightText text={desc} highlight={highlight} /></div>}
    </div>
    <ChevronRight size={16} className={`text-muted-foreground transition-all duration-300 ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
  </div>
)

export default function Dashboard() {
  const [data, setData] = useState<any>({
    records: [], goals: [], habits: [], relationships: [], journal: [], calendarMemories: [], userProfile: null, achievements: [], skills: [], projects: [], memoryCapsules: [], certificates: [], career: [], education: []
  })
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSearchDragging, setIsSearchDragging] = useState(false)
  const [searchDragStartY, setSearchDragStartY] = useState(0)
  const [searchScrollTop, setSearchScrollTop] = useState(0)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Calendar Memory Modal State
  const [memoryModalDate, setMemoryModalDate] = useState<{ month: number, day: number } | null>(null)
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false)

  // Widget Settings
  const [widgetOrder, setWidgetOrder] = useState<string[]>(Object.keys(WIDGET_REGISTRY))
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({})

  // DND
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)

  // New Entry Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)

  const loadDashboard = async () => {
    try {
      // @ts-ignore
      const todayStr = new Date().toISOString().split('T')[0]
      const [records, goals, rawHabits, relationships, journal, habitRecords, calendarMemories, profiles, achievements, skills, projects, memoryCapsules, certificates, career, education] = await Promise.all([
        window.api.db.find('records', {}),
        window.api.db.find('goals', {}),
        window.api.db.find('habits', {}),
        window.api.db.find('relationships', {}),
        window.api.db.find('journal', {}),
        window.api.db.find('habitLogs', { date: todayStr }),
        window.api.db.find('calendarMemories', {}),
        window.api.db.find('userProfile', {}),
        window.api.db.find('achievements', {}),
        window.api.db.find('skills', {}),
        window.api.db.find('projects', {}),
        window.api.db.find('memoryCapsules', {}),
        window.api.db.find('certificates', {}),
        window.api.db.find('career', {}),
        window.api.db.find('education', {})
      ])
      
      const userProfile = profiles && profiles.length > 0 ? profiles[0] : null
      
      const habits = rawHabits
        .filter((h: any) => h.archived !== true)
        .map((h: any) => ({
          ...h,
          completedToday: habitRecords.some((r: any) => r.habitId === h._id && r.status === 'completed')
        }))
      
      setData({ records, goals, habits, relationships, journal, calendarMemories, userProfile, achievements, skills, projects, memoryCapsules, certificates, career, education })
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load saved layout
    const savedOrder = localStorage.getItem('dashboard_widget_order')
    const savedVisibility = localStorage.getItem('dashboard_widget_visibility')
    
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder)
      // Merge with new widgets that might have been added
      const missing = Object.keys(WIDGET_REGISTRY).filter(k => !parsed.includes(k))
      setWidgetOrder([...parsed, ...missing])
    }
    
    if (savedVisibility) {
      setWidgetVisibility(JSON.parse(savedVisibility))
    } else {
      const initialVisibility: Record<string, boolean> = {}
      Object.keys(WIDGET_REGISTRY).forEach(k => {
        initialVisibility[k] = WIDGET_REGISTRY[k].defaultVisible
      })
      setWidgetVisibility(initialVisibility)
    }

    loadDashboard()

    // Listen for memory updates from calendar
    window.addEventListener('calendar-memories-updated', loadDashboard)
    return () => {
      window.removeEventListener('calendar-memories-updated', loadDashboard)
    }
  }, [])

  // Auto-open modal from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const month = params.get('calendarMemoryMonth')
    const day = params.get('calendarMemoryDay')
    if (month && day) {
      setMemoryModalDate({ month: parseInt(month, 10), day: parseInt(day, 10) })
      setIsMemoryModalOpen(true)
    }
  }, [location.search])

  // Save layout changes
  useEffect(() => {
    if (Object.keys(widgetVisibility).length > 0) {
      localStorage.setItem('dashboard_widget_order', JSON.stringify(widgetOrder))
      localStorage.setItem('dashboard_widget_visibility', JSON.stringify(widgetVisibility))
    }
  }, [widgetOrder, widgetVisibility])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidget(id)
    e.dataTransfer.effectAllowed = 'move'
    // Slight delay to allow the drag image to capture before hiding the element
    setTimeout(() => {
      const el = document.getElementById(`widget-${id}`)
      if (el) el.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedWidget(null)
    const el = document.getElementById(`widget-${id}`)
    if (el) el.style.opacity = '1'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetId) return

    const newOrder = [...widgetOrder]
    const draggedIndex = newOrder.indexOf(draggedWidget)
    const targetIndex = newOrder.indexOf(targetId)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedWidget)

    setWidgetOrder(newOrder)
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

  const isBirthday = useMemo(() => {
    if (!data.userProfile?.dateOfBirth) return false
    
    // Parse YYYY-MM-DD safely to avoid timezone shift bugs
    const parts = data.userProfile.dateOfBirth.split('-')
    if (parts.length < 3) return false
    
    const birthMonth = parseInt(parts[1], 10)
    const birthDay = parseInt(parts[2], 10)
    
    const today = new Date()
    return birthMonth === today.getMonth() + 1 && birthDay === today.getDate()
  }, [data.userProfile])

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const q = searchQuery.toLowerCase()
    
    const matches = (str: any) => typeof str === 'string' && str.toLowerCase().includes(q)

    return {
      ...data,
      records: data.records?.filter((x:any) => matches(x.title) || matches(x.description)) || [],
      goals: data.goals?.filter((x:any) => matches(x.title) || matches(x.description)) || [],
      habits: data.habits?.filter((x:any) => matches(x.title) || matches(x.description)) || [],
      relationships: data.relationships?.filter((x:any) => matches(x.name) || matches(x.bio) || matches(x.relationshipType)) || [],
      journal: data.journal?.filter((x:any) => matches(x.title) || matches(x.content)) || [],
      achievements: data.achievements?.filter((x:any) => matches(x.title) || matches(x.description)) || [],
      skills: data.skills?.filter((x:any) => matches(x.name) || matches(x.description)) || [],
      projects: data.projects?.filter((x:any) => matches(x.title) || matches(x.description) || matches(x.role)) || [],
      memoryCapsules: data.memoryCapsules?.filter((x:any) => matches(x.title) || matches(x.message)) || [],
      certificates: data.certificates?.filter((x:any) => matches(x.name) || matches(x.organization)) || [],
      career: data.career?.filter((x:any) => matches(x.company) || matches(x.position) || matches(x.description)) || [],
      education: data.education?.filter((x:any) => matches(x.school) || matches(x.degree) || matches(x.fieldOfStudy) || matches(x.description)) || []
    }
  }, [data, searchQuery])

  const flattenedResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const fl: any[] = []
    filteredData.relationships.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/relationships/${x._id}` }))
    filteredData.records.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/records?highlight=${x._id}` }))
    filteredData.journal.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/journal?highlight=${x._id}` }))
    filteredData.habits.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/habits?highlight=${x._id}` }))
    filteredData.goals.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/goals?highlight=${x._id}` }))
    filteredData.achievements.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/achievements?highlight=${x._id}` }))
    filteredData.skills.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/skills?highlight=${x._id}` }))
    filteredData.projects.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/projects?highlight=${x._id}` }))
    filteredData.memoryCapsules.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/memory-capsules?highlight=${x._id}` }))
    filteredData.certificates.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/certificates?highlight=${x._id}` }))
    filteredData.career.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/career?highlight=${x._id}` }))
    filteredData.education.slice(0,5).forEach((x:any) => fl.push({ ...x, nav: `/career/education?highlight=${x._id}` }))
    return fl
  }, [filteredData, searchQuery])

  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  useEffect(() => {
    if (selectedIndex >= 0) {
      const el = document.getElementById(`search-result-${selectedIndex}`)
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  if (loading) return <div className="p-8 flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-500 relative overflow-hidden">
      {isBirthday && <BirthdayBackground />}
      
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('')
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => (prev < flattenedResults.length - 1 ? prev + 1 : prev))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
              } else if (e.key === 'Enter') {
                if (selectedIndex >= 0 && selectedIndex < flattenedResults.length) {
                  navigate(flattenedResults[selectedIndex].nav)
                  setSearchQuery('')
                }
              }
            }}
            type="text" 
            placeholder="Search People, Records, Journal, Goals, Photos..." 
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-full text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none shadow-sm"
          />
          {searchQuery.trim() && (() => {
            let currentIndex = 0
            return (
              <div 
                ref={searchDropdownRef}
                onMouseDown={(e) => {
                  if (e.button === 2) {
                    e.preventDefault()
                    setIsSearchDragging(true)
                    setSearchDragStartY(e.clientY)
                    setSearchScrollTop(searchDropdownRef.current?.scrollTop || 0)
                  }
                }}
                onMouseMove={(e) => {
                  if (!isSearchDragging) return
                  e.preventDefault()
                  const deltaY = e.clientY - searchDragStartY
                  if (searchDropdownRef.current) {
                    searchDropdownRef.current.scrollTop = searchScrollTop - deltaY
                  }
                }}
                onMouseUp={() => setIsSearchDragging(false)}
                onMouseLeave={() => setIsSearchDragging(false)}
                onContextMenu={(e) => { if (isSearchDragging) e.preventDefault() }}
                className="absolute top-full left-0 right-0 mt-3 bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto overflow-x-hidden p-3 custom-scrollbar ring-1 ring-black/5 flex flex-col gap-2"
              >
                {filteredData.relationships.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Users} title="People" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.relationships.slice(0, 5).map((r: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={r._id} onClick={() => navigate(`/relationships/${r._id}`)} icon={r.name ? r.name.substring(0, 2).toUpperCase() : '?'} title={r.name} desc={r.relationshipType || r.bio} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.records.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Database} title="Records & Memories" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.records.slice(0, 5).map((r: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={r._id} onClick={() => navigate(`/records?highlight=${r._id}`)} icon={Database} title={r.title} desc={r.description || r.type} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.journal.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Book} title="Journal" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.journal.slice(0, 5).map((j: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={j._id} onClick={() => navigate(`/journal?highlight=${j._id}`)} icon={Book} title={j.title || 'Journal Entry'} desc={j.content?.substring(0, 50)} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.habits.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Activity} title="Habits" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.habits.slice(0, 5).map((h: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={h._id} onClick={() => navigate(`/habits?highlight=${h._id}`)} icon={h.icon || '✨'} title={h.title} desc={h.description} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.goals.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Target} title="Goals" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.goals.slice(0, 5).map((g: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={g._id} onClick={() => navigate(`/career/goals?highlight=${g._id}`)} icon={Target} title={g.title} desc={g.description} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.achievements.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Award} title="Achievements" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.achievements.slice(0, 5).map((a: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={a._id} onClick={() => navigate(`/career/achievements?highlight=${a._id}`)} icon={Award} title={a.title} desc={a.description} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.skills.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Sparkles} title="Skills" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.skills.slice(0, 5).map((s: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={s._id} onClick={() => navigate(`/career/skills?highlight=${s._id}`)} icon={Sparkles} title={s.name} desc={s.description} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.projects.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={FolderGit2} title="Projects" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.projects.slice(0, 5).map((p: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={p._id} onClick={() => navigate(`/career/projects?highlight=${p._id}`)} icon={FolderGit2} title={p.title} desc={p.description || p.role} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.memoryCapsules.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Mail} title="Memory Capsules" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.memoryCapsules.slice(0, 5).map((c: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={c._id} onClick={() => navigate(`/memory-capsules?highlight=${c._id}`)} icon={Mail} title={c.title} desc={c.message} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.certificates.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={FileText} title="Certificates" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.certificates.slice(0, 5).map((c: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={c._id} onClick={() => navigate(`/career/certificates?highlight=${c._id}`)} icon={FileText} title={c.name} desc={c.organization} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.career.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={Briefcase} title="Career" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.career.slice(0, 5).map((job: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={job._id} onClick={() => navigate(`/career/career?highlight=${job._id}`)} icon={Briefcase} title={job.position} desc={job.company} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.education.length > 0 && (
                  <div className="relative">
                    <SearchSectionHeader icon={GraduationCap} title="Education" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredData.education.slice(0, 5).map((edu: any) => {
                        const isSelected = currentIndex === selectedIndex
                        currentIndex++
                        return <SearchResultItem key={edu._id} onClick={() => navigate(`/career/education?highlight=${edu._id}`)} icon={GraduationCap} title={edu.degree} desc={edu.school} highlight={searchQuery} isSelected={isSelected} id={`search-result-${currentIndex - 1}`} />
                      })}
                    </div>
                  </div>
                )}
                {filteredData.relationships.length === 0 && filteredData.records.length === 0 && filteredData.journal.length === 0 && filteredData.habits.length === 0 && filteredData.goals.length === 0 && filteredData.achievements.length === 0 && filteredData.skills.length === 0 && filteredData.projects.length === 0 && filteredData.memoryCapsules.length === 0 && filteredData.certificates.length === 0 && filteredData.career.length === 0 && filteredData.education.length === 0 && (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                      <Search size={24} />
                    </div>
                    <p className="text-muted-foreground font-medium text-lg">No results found for "{searchQuery}"</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Try searching for something else.</p>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}>
                <Settings2 size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Customize Dashboard Layout</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setIsNewModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20">
                <Plus size={16} /> New
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Create New Entry</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Dashboard Settings Panel (Moved outside scroll area so it's always visible) */}
      {showSettings && (
        <div className="bg-card border-b border-border p-6 shadow-md z-10 animate-in slide-in-from-top-2 shrink-0">
          <h3 className="text-lg font-bold mb-4">Customize Dashboard</h3>
          <div className="flex flex-wrap gap-4">
            {Object.keys(WIDGET_REGISTRY).map(id => (
              <label key={id} className="flex items-center gap-2 cursor-pointer bg-accent/50 hover:bg-accent px-4 py-2 rounded-lg transition-colors border border-border">
                <input 
                  type="checkbox" 
                  checked={widgetVisibility[id] || false}
                  onChange={(e) => setWidgetVisibility(prev => ({ ...prev, [id]: e.target.checked }))}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold">{WIDGET_REGISTRY[id].label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">Drag and drop widgets below to rearrange them.</p>
        </div>
      )}

      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto p-6 md:p-8 space-y-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        
        {/* Dynamic Welcome Header is inside the grid below */}

        {/* Birthday Celebration Widget */}
        {isBirthday && <BirthdayWidget userProfile={data.userProfile} />}

        {/* On This Day Section */}
        {(() => {
          const today = new Date()
          const todaysMemories = data.calendarMemories?.filter((m: any) => m.month === today.getMonth() + 1 && m.day === today.getDate())
          if (todaysMemories && todaysMemories.length > 0) {
            return (
              <div className="bg-indigo-500/10 border border-indigo-500/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <div className="w-16 h-16 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-indigo-500 mb-1">On This Day</h3>
                  <p className="text-foreground font-medium">You have {todaysMemories.length} {todaysMemories.length === 1 ? 'memory' : 'memories'} saved for today.</p>
                  <p className="text-sm text-muted-foreground">Check the calendar to relive {todaysMemories.length === 1 ? 'it' : 'them'}.</p>
                </div>
                <button 
                  onClick={() => {
                    // Quick way to open calendar for today
                    const calWidget = document.getElementById('widget-calendar')
                    if (calWidget) calWidget.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-full shadow-md hover:scale-105 transition-transform"
                >
                  View Memories
                </button>
              </div>
            )
          }
          return null
        })()}

        {/* Draggable Widget Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-2 relative pb-32">
          {/* Dynamic Welcome Widget spans all columns */}
          <div className="col-span-1 md:col-span-2 xl:col-span-3">
            <DynamicWelcome data={filteredData} />
          </div>

          {widgetOrder.map(id => {
            if (!widgetVisibility[id]) return null
            const Component = WIDGET_REGISTRY[id].component
            const gridCol = WIDGET_REGISTRY[id].gridCol
            
            return (
              <div 
                key={id}
                id={`widget-${id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, id)}
                onDragEnd={(e) => handleDragEnd(e, id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, id)}
                className={`${gridCol} group relative cursor-grab active:cursor-grabbing hover:z-10`}
              >
                {/* Subtle drag handle indicator on hover */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-accent px-3 py-1 rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shadow-sm border border-border z-10 pointer-events-none">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1"/><circle cx="5" cy="2" r="1"/><circle cx="8" cy="2" r="1"/><circle cx="2" cy="5" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="8" cy="5" r="1"/></svg>
                  Drag to reorder
                </div>
                <Component data={filteredData} />
              </div>
            )
          })}
        </div>

      </div>

      {/* Root Modals */}
      <CalendarMemoryModal 
        isOpen={isMemoryModalOpen} 
        onClose={() => {
          setIsMemoryModalOpen(false)
          setMemoryModalDate(null)
          // Also clear query params
          const url = new URL(window.location.href)
          url.searchParams.delete('calendarMemoryMonth')
          url.searchParams.delete('calendarMemoryDay')
          window.history.replaceState({}, '', url.pathname + url.search)
        }} 
        date={memoryModalDate} 
        existingMemories={data.calendarMemories || []}
      />

      {/* Quick Add Modal */}
      <QuickAddModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        onSuccess={() => {
          setIsNewModalOpen(false)
          setShowSuccessOverlay(true)
          loadDashboard()
          setTimeout(() => setShowSuccessOverlay(false), 3000)
        }} 
      />

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="absolute inset-0 z-[120] pointer-events-none flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/30 via-background/90 to-background/95 backdrop-blur-md animate-in fade-in duration-300">
          <style>{`
            @keyframes popCreate {
              0% { transform: scale(0) rotate(-15deg); opacity: 0; }
              40% { transform: scale(1.1) rotate(5deg); opacity: 1; }
              60% { transform: scale(0.95) rotate(-2deg); }
              80% { transform: scale(1.05) rotate(2deg); }
              100% { transform: scale(1) rotate(0); opacity: 1; }
            }
            @keyframes floatUp {
              0% { transform: translateY(0); opacity: 1; }
              100% { transform: translateY(-50px); opacity: 0; }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popCreate 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              <rect x="40" y="40" width="160" height="160" rx="30" fill="#3b82f6" opacity="0.2" />
              <rect x="50" y="50" width="140" height="140" rx="25" fill="#3b82f6" opacity="0.4" transform="rotate(5 120 120)" />
              <rect x="60" y="60" width="120" height="120" rx="20" fill="#2563eb" />
              <path d="M 120 85 L 120 155 M 85 120 L 155 120" stroke="white" strokeWidth="16" strokeLinecap="round" />
              <g style={{ animation: 'floatUp 2s infinite ease-in-out' }}>
                <circle cx="120" cy="120" r="40" stroke="white" strokeWidth="4" strokeDasharray="4 8" opacity="0.5" />
              </g>
            </svg>
            <h2 className="text-4xl font-extrabold text-primary drop-shadow-lg tracking-tight text-center z-50">
              Entry Created!
            </h2>
          </div>
        </div>
      )}
    </div>
  )
}
