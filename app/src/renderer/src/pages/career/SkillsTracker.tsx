import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Trash2, Search, Filter, Plus, Edit2, X, Star, Archive, MoreVertical, BrainCircuit, TrendingUp, Award, ImageIcon, Sparkles, FolderDown, ArrowDownUp, CheckSquare, Square, Archive as ArchiveIcon, ArchiveRestore, Download, Upload } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { SkillRecord } from '../../types'
import { normalizeUrl } from '../../lib/utils'
import SkillsStatistics from '../../components/career/SkillsStatistics'

function getDurationText(start: string, end?: string) {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return ''
  
  let diffInMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
  if (diffInMonths < 0) return ''
  
  const years = Math.floor(diffInMonths / 12)
  const months = diffInMonths % 12
  
  let text = ''
  if (years > 0) text += `${years} yr${years > 1 ? 's' : ''} `
  if (months > 0) text += `${months} mo${months > 1 ? 's' : ''}`
  return text.trim() || '< 1 mo'
}

export default function SkillsTracker() {
  const [skills, setSkills] = useState<SkillRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [celebrationLevel, setCelebrationLevel] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ level: 'all', isFavorite: false, isArchived: false })
  const [sortBy, setSortBy] = useState('highest')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [importConflicts, setImportConflicts] = useState<{imported: SkillRecord, existing: SkillRecord}[]>([])
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [pendingImports, setPendingImports] = useState<{toInsert: SkillRecord[], toReplace: SkillRecord[]}>({ toInsert: [], toReplace: [] })

  const [form, setForm] = useState<Partial<SkillRecord>>({
    name: '', level: 50, yearsOfExperience: 0, lastUsed: '', notes: '', backgroundImage: '', imageOpacity: 10
  })

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('skills', {})
      setSkills(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    loadData()
  }, [])

  const handleExportSelected = () => {
    const dataToExport = skills.filter(s => selectedIds.has(s._id!))
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "selected_skills.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }

  const handleExportAll = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(skills, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "all_skills.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
    setIsMenuOpen(false)
  }

  const executeImports = async (toInsert: SkillRecord[], toReplace: SkillRecord[]) => {
    try {
      for (const skill of toInsert) {
        const { _id, ...skillData } = skill
        // @ts-ignore
        await window.api.db.insert('skills', skillData)
      }
      for (const skill of toReplace) {
        const { _id, ...skillData } = skill
        // @ts-ignore
        await window.api.db.update('skills', { _id }, { $set: skillData }, {})
      }
      loadData()
      NotificationEngine.notify('success', 'Import Complete', `Imported ${toInsert.length + toReplace.length} skills.`, 'Skills')
    } catch (err) {
      console.error("Error executing imports", err)
    }
  }

  const processConflict = async (action: 'replace' | 'skip' | 'replace_all' | 'skip_all') => {
    let { toInsert, toReplace } = pendingImports
    const remainingConflicts = importConflicts.slice(currentConflictIndex)
    
    if (action === 'replace_all') {
      remainingConflicts.forEach(c => toReplace.push({...c.imported, _id: c.existing._id}))
      setImportConflicts([])
    } else if (action === 'skip_all') {
      setImportConflicts([])
    } else if (action === 'replace') {
      const current = importConflicts[currentConflictIndex]
      toReplace.push({...current.imported, _id: current.existing._id})
      if (currentConflictIndex + 1 < importConflicts.length) {
        setCurrentConflictIndex(currentConflictIndex + 1)
        setPendingImports({ toInsert, toReplace })
        return
      } else {
        setImportConflicts([])
      }
    } else if (action === 'skip') {
      if (currentConflictIndex + 1 < importConflicts.length) {
        setCurrentConflictIndex(currentConflictIndex + 1)
        return
      } else {
        setImportConflicts([])
      }
    }

    await executeImports(toInsert, toReplace)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const importedSkills = JSON.parse(event.target?.result as string)
          if (Array.isArray(importedSkills)) {
            const toInsert: SkillRecord[] = []
            const toReplace: SkillRecord[] = []
            const conflicts: {imported: SkillRecord, existing: SkillRecord}[] = []

            for (const importedSkill of importedSkills) {
              let existingSkill = skills.find(s => s._id === importedSkill._id)
              if (!existingSkill) existingSkill = skills.find(s => s.name === importedSkill.name)

              if (!existingSkill) {
                toInsert.push(importedSkill)
              } else {
                const importedTime = importedSkill.updatedAt || importedSkill.createdAt || 0
                const existingTime = existingSkill.updatedAt || existingSkill.createdAt || 0
                
                if (importedTime > existingTime) {
                  toReplace.push({...importedSkill, _id: existingSkill._id})
                } else if (importedTime < existingTime) {
                  conflicts.push({ imported: importedSkill, existing: existingSkill })
                } else if (importedTime === 0 && existingTime === 0) {
                  conflicts.push({ imported: importedSkill, existing: existingSkill })
                }
              }
            }

            if (conflicts.length > 0) {
              setPendingImports({ toInsert, toReplace })
              setImportConflicts(conflicts)
              setCurrentConflictIndex(0)
              setIsMenuOpen(false)
            } else {
              await executeImports(toInsert, toReplace)
            }
          }
        } catch (error) {
          console.error("Error importing skills", error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
    setIsMenuOpen(false)
  }

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && skills.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`skill-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, skills.length])

  const filteredSkills = skills.filter(s => {
    if (filters.level !== 'all') {
      if (filters.level === 'beginner' && s.level >= 40) return false
      if (filters.level === 'intermediate' && (s.level < 40 || s.level >= 80)) return false
      if (filters.level === 'expert' && s.level < 80) return false
    }
    if (filters.isFavorite && !s.isFavorite) return false
    if (filters.isArchived && !s.isArchived) return false
    if (!filters.isArchived && s.isArchived) return false
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !(s.notes && s.notes.toLowerCase().includes(q))) return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'highest') return b.level - a.level
    if (sortBy === 'lowest') return a.level - b.level
    if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    if (sortBy === 'alpha') return a.name.localeCompare(b.name)
    return 0
  })

  const bulkAction = async (action: 'delete' | 'archive' | 'unarchive' | 'favorite') => {
    if (action === 'delete' && !confirm(`Delete ${selectedIds.size} skills?`)) return
    try {
      for (const id of selectedIds) {
        if (action === 'delete') {
          // @ts-ignore
          await window.api.db.remove('skills', { _id: id }, {})
        } else {
          const updateData = action === 'favorite' ? { isFavorite: true } 
                           : action === 'archive' ? { isArchived: true }
                           : { isArchived: false }
          // @ts-ignore
          await window.api.db.update('skills', { _id: id }, { $set: { ...updateData, updatedAt: Date.now() } }, {})
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
      await window.api.db.update('skills', { _id: id }, { $set: { isFavorite: !current, updatedAt: Date.now() } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const toggleArchive = async (id: string, current: boolean) => {
    try {
      // @ts-ignore
      await window.api.db.update('skills', { _id: id }, { $set: { isArchived: !current, updatedAt: Date.now() } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleSave = async () => {
    const now = Date.now()
    try {
      if (editingId) {
        const update = { ...form, updatedAt: now }
        // @ts-ignore
        await window.api.db.update('skills', { _id: editingId }, { $set: update })
        NotificationEngine.notify('success', 'Skill Updated', `"${form.name}" has been updated.`, 'Skills')

        const oldRecord = skills.find(s => s._id === editingId)
        const oldLevel = oldRecord?.level || 0
        const newLevel = form.level || 0
        if (newLevel > oldLevel) {
          setCelebrationLevel(newLevel)
          setTimeout(() => setCelebrationLevel(null), 5000)
        }
      } else {
        // @ts-ignore
        await window.api.db.insert('skills', { ...form, createdAt: now, updatedAt: now })
        NotificationEngine.notify('success', 'Skill Added', `You started tracking "${form.name}".`, 'Skills')
        setCelebrationLevel(form.level || 0)
        setTimeout(() => setCelebrationLevel(null), 5000)
      }
      setIsAdding(false)
      setEditingId(null)
      loadData()
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (isAdding) {
          e.preventDefault()
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [isAdding, form, editingId])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this skill?')) {
      try {
        const skill = skills.find(s => s._id === id)
        // @ts-ignore
        await window.api.db.remove('skills', { _id: id })
        if (skill) NotificationEngine.notify('info', 'Skill Deleted', `"${skill.name}" was removed.`, 'Skills')
        loadData()
      } catch (err) { console.error(err) }
    }
  }

  const handleAttachBgImage = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, backgroundImage: result.files[0].filePath })
    }
  }

  const openEdit = (record: SkillRecord) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleAddSkill = () => {
    setForm({ level: 50, yearsOfExperience: 0, backgroundImage: '', imageOpacity: 10 })
    setEditingId(null)
    setIsAdding(true)
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
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
    <div className="flex-1 flex flex-col h-full bg-background animate-in fade-in duration-500 relative overflow-hidden text-foreground">

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translateY(-20vh) scale(1.5); opacity: 0; }
        }
        @keyframes wave-ribbon {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
          50% { transform: translateY(5px) scaleY(1.05); opacity: 0.9; }
        }
        @keyframes skill-celebrate {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes text-celebrate {
          0% { transform: scale(0.5); opacity: 0; }
          20% { transform: scale(1.1); opacity: 1; }
          80% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 animate-in fade-in duration-700">
        {/* 3D Ambient Background - Hope Giving (Waves & Sparks) */}

        {/* Soft morning/hope gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-teal-500/5 to-purple-500/5 dark:from-cyan-900/20 dark:via-teal-900/10" />

        {/* Abstract Wavy Shapes (Clouds/Waves of Hope) */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute bottom-0 w-full h-[40vh] opacity-80">
          <defs>
            <linearGradient id="wave-grad-1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" /> {/* cyan-400 */}
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave-grad-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" /> {/* emerald-400 */}
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wave-grad-3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.2" /> {/* purple-400 */}
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0 50 Q 25 30 50 60 T 100 40 L 100 100 L 0 100 Z" fill="url(#wave-grad-1)" className="animate-[wave-ribbon_12s_ease-in-out_infinite]" style={{ transformOrigin: 'bottom' }} />
          <path d="M 0 60 Q 30 80 60 40 T 100 50 L 100 100 L 0 100 Z" fill="url(#wave-grad-2)" className="animate-[wave-ribbon_16s_ease-in-out_infinite]" style={{ animationDelay: '3s', transformOrigin: 'bottom' }} />
          <path d="M 0 70 Q 40 40 70 70 T 100 60 L 100 100 L 0 100 Z" fill="url(#wave-grad-3)" className="animate-[wave-ribbon_20s_ease-in-out_infinite]" style={{ animationDelay: '6s', transformOrigin: 'bottom' }} />
        </svg>

        {/* Floating Hope Particles (Sparks) */}
        <div className="absolute inset-0">
          {[...Array(25)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full bg-cyan-400"
              style={{
                width: `${3 + Math.random() * 6}px`,
                height: `${3 + Math.random() * 6}px`,
                left: `${Math.random() * 100}%`,
                filter: 'blur(1px)',
                boxShadow: '0 0 10px 2px rgba(6, 182, 212, 0.4)',
                animation: `float-up ${12 + Math.random() * 20}s linear infinite`,
                animationDelay: `${Math.random() * 15}s`
              }}
            />
          ))}
          {[...Array(15)].map((_, i) => (
            <div
              key={`particle-teal-${i}`}
              className="absolute rounded-full bg-teal-400"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                left: `${Math.random() * 100}%`,
                filter: 'blur(1px)',
                boxShadow: '0 0 12px 3px rgba(20, 184, 166, 0.4)',
                animation: `float-up ${15 + Math.random() * 25}s linear infinite`,
                animationDelay: `${Math.random() * 20}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur z-20 flex flex-wrap gap-2 items-center justify-between shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-purple-500" size={20} /> Skills
          </h1>
          
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-9 pr-4 py-1.5 w-64 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded-xl bg-background overflow-hidden">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><ArrowDownUp size={14} className="text-muted-foreground"/></div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer">
              <option value="highest">Highest Level</option>
              <option value="lowest">Lowest Level</option>
              <option value="newest">Newest First</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
          
          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${isSelectionMode ? 'bg-purple-500 text-white shadow-md' : 'bg-background border border-border hover:bg-accent text-foreground'}`}
          >
            {isSelectionMode ? <CheckSquare size={16}/> : <Square size={16}/>}
            Select
          </button>

          {!isAdding && (
            <button onClick={handleAddSkill} className="px-4 py-1.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 font-bold flex items-center gap-2 text-sm shadow-sm transition-transform hover:scale-105">
              <Plus size={16}/> New Skill
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-xl transition-colors hover:bg-accent text-muted-foreground"
            >
              <MoreVertical size={18} />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2">
                  <button onClick={handleImport} className="w-full text-left px-4 py-3 hover:bg-accent flex items-center gap-2 text-sm font-medium transition-colors">
                    <Upload size={16} /> Import Skills
                  </button>
                  <button onClick={handleExportAll} className="w-full text-left px-4 py-3 hover:bg-accent flex items-center gap-2 text-sm font-medium transition-colors border-t border-border">
                    <Download size={16} /> Export All Skills
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selection Toolbar */}
      {isSelectionMode && (
        <div className="px-6 py-3 bg-accent/50 border-b border-border flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold">{selectedIds.size} selected</span>
            <button 
              onClick={() => {
                if (selectedIds.size === filteredSkills.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(filteredSkills.map(r => r._id!)))
              }} 
              className="text-sm font-bold text-purple-500 hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14}/> {selectedIds.size === filteredSkills.length && filteredSkills.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => bulkAction('favorite')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Star size={14}/> Favorite</button>
            {!filters.isArchived && <button onClick={() => bulkAction('archive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveIcon size={14}/> Archive</button>}
            {filters.isArchived && <button onClick={() => bulkAction('unarchive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveRestore size={14}/> Unarchive</button>}
            <button onClick={handleExportSelected} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Download size={14}/> Export</button>
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
        <SkillsStatistics skills={skills} setFilters={setFilters} />

        {isAdding ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Skill' : 'Add Skill'}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Skill Name</label>
                <input autoFocus type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" placeholder="e.g. React, Project Management" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Proficiency Level ({form.level}%)</label>
                <input type="range" min="0" max="100" value={form.level} onChange={e => setForm({ ...form, level: Number(e.target.value) })} className="w-full accent-purple-500" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Beginner</span>
                  <span>Intermediate</span>
                  <span>Expert</span>
                </div>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium mb-1">
                  Experience
                  <button type="button" onClick={() => setForm({ ...form, startDate: form.startDate !== undefined ? undefined : '' })} className="text-xs text-purple-500 hover:underline">
                    {form.startDate !== undefined ? 'Enter Years' : 'Use Start Date'}
                  </button>
                </label>
                {form.startDate !== undefined ? (
                  <input type="month" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
                ) : (
                  <input type="number" step="0.5" min="0" value={form.yearsOfExperience} onChange={e => setForm({ ...form, yearsOfExperience: Number(e.target.value) })} className="w-full p-2 bg-background border border-border rounded-md" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Last Used Date</label>
                <input type="month" value={form.lastUsed || ''} onChange={e => setForm({ ...form, lastUsed: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Background Image</label>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    {form.backgroundImage && (
                      <div className="relative group rounded-md overflow-hidden border border-border w-16 h-16 shrink-0">
                        <img src={normalizeUrl(form.backgroundImage)} alt="bg" className="w-full h-full object-cover" />
                        <button onClick={() => setForm({ ...form, backgroundImage: '' })} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                      </div>
                    )}
                    <button onClick={handleAttachBgImage} className="flex items-center gap-2 px-4 py-2 bg-background border border-dashed border-border rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <ImageIcon size={16} /> {form.backgroundImage ? 'Change Image' : 'Add Background Image'}
                    </button>
                  </div>
                  
                  {form.backgroundImage && (
                    <div className="bg-accent/30 p-4 rounded-md border border-border">
                      <label className="block text-sm font-medium mb-2">Image Opacity ({form.imageOpacity || 10}%)</label>
                      <input 
                        type="range" 
                        min="5" 
                        max="100" 
                        value={form.imageOpacity || 10} 
                        onChange={e => setForm({ ...form, imageOpacity: Number(e.target.value) })} 
                        className="w-full accent-purple-500" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Adjust how visible the background image is on the card.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Notes / Context</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 font-medium">Save Skill</button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map(record => (
            <div key={record._id} id={`skill-${record._id}`} className="bg-card/70 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm relative group hover:border-purple-500/50 transition-all duration-1000 flex flex-col overflow-hidden">
              {record.backgroundImage && (
                <div 
                  className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-300 z-0 group-hover:scale-105 group-hover:brightness-110"
                  style={{ 
                    backgroundImage: `url("${normalizeUrl(record.backgroundImage).replace(/"/g, '%22')}")`,
                    opacity: (record.imageOpacity !== undefined ? record.imageOpacity : 10) / 100
                  }}
                />
              )}
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-3">
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
                        {selectedIds.has(record._id!) ? <CheckSquare size={20} className="text-purple-500"/> : <Square size={20} className="text-muted-foreground"/>}
                      </button>
                    )}
                    <div>
                      <h3 className="text-xl font-bold truncate pr-2">{record.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {record.isFavorite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                        {record.isArchived && <ArchiveIcon size={14} className="text-gray-500" />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded-md p-1 border border-border shadow-sm">
                    <button onClick={() => toggleFavorite(record._id!, !!record.isFavorite)} className={`p-1.5 rounded-md hover:bg-yellow-500/20 hover:text-yellow-500 transition-colors ${record.isFavorite ? 'text-yellow-500 bg-yellow-500/10' : 'text-foreground'}`} title={record.isFavorite ? "Unfavorite" : "Favorite"}><Star size={14} className={record.isFavorite ? "fill-yellow-500" : ""}/></button>
                    <button onClick={() => toggleArchive(record._id!, !!record.isArchived)} className={`p-1.5 rounded-md hover:bg-gray-500/20 hover:text-gray-500 transition-colors ${record.isArchived ? 'text-gray-500 bg-gray-500/10' : 'text-foreground'}`} title={record.isArchived ? "Unarchive" : "Archive"}><ArchiveIcon size={14}/></button>
                    <button onClick={() => openEdit(record)} className="p-1.5 rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={(e) => handleDelete(record._id!, e)} className="p-1.5 text-destructive rounded-md hover:bg-destructive/10" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Proficiency</span>
                    <span className="text-sm font-bold text-purple-500">{record.level}%</span>
                  </div>
                  <div className="w-full bg-accent rounded-full h-2.5 mb-6 overflow-hidden">
                    <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${record.level}%` }}></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground block mb-1">Experience</span>
                      <span className="font-medium block leading-snug">
                        {record.startDate 
                          ? <span>{getDurationText(record.startDate, record.lastUsed)}<br/><span className="text-xs text-muted-foreground font-normal">(Since {new Date(record.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })})</span></span>
                          : `${record.yearsOfExperience || 0} ${record.yearsOfExperience === 1 ? 'year' : 'years'}`}
                      </span>
                    </div>
                    {record.lastUsed ? (
                      <div>
                        <span className="text-muted-foreground block mb-1">Last Used</span>
                        <span className="font-medium">{new Date(record.lastUsed).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                      </div>
                    ) : (
                      record.startDate ? (
                        <div>
                          <span className="text-muted-foreground block mb-1">Status</span>
                          <span className="font-medium text-green-500 flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div> Active
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>

                  {record.notes && <p className="text-xs text-muted-foreground line-clamp-2">{record.notes}</p>}
                </div>
              </div>
            </div>
          ))}
          {skills.length === 0 && !isAdding && (
            <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground bg-card/50 backdrop-blur">
              No skills tracked yet. Time to level up!
            </div>
          )}
        </div>
      </div>

      {importConflicts.length > 0 && currentConflictIndex < importConflicts.length && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-amber-500/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-amber-500">
                Conflict Detected ({currentConflictIndex + 1} of {importConflicts.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                The imported skill <strong>"{importConflicts[currentConflictIndex].imported.name}"</strong> is older than your current version in the app.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-accent/50 rounded-xl border border-border">
                  <h3 className="text-sm font-bold mb-1">App Version (Keep)</h3>
                  <p className="text-xs text-muted-foreground">Updated: {new Date(importConflicts[currentConflictIndex].existing.updatedAt || importConflicts[currentConflictIndex].existing.createdAt || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-background rounded-xl border border-border">
                  <h3 className="text-sm font-bold mb-1">Import Version</h3>
                  <p className="text-xs text-muted-foreground">Updated: {new Date(importConflicts[currentConflictIndex].imported.updatedAt || importConflicts[currentConflictIndex].imported.createdAt || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border bg-accent/30 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => processConflict('replace')} className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors">Replace</button>
                <button onClick={() => processConflict('skip')} className="w-full px-4 py-2 bg-background border border-border hover:bg-accent font-bold rounded-xl transition-colors">Skip</button>
              </div>
              {importConflicts.length > 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => processConflict('replace_all')} className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors">Replace All</button>
                  <button onClick={() => processConflict('skip_all')} className="w-full px-4 py-2 bg-background border border-border hover:bg-accent font-bold rounded-xl transition-colors">Skip All</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {celebrationLevel !== null && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-50 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 transition-colors duration-1000"
            style={{
              background: celebrationLevel === 100
                ? 'linear-gradient(to top right, rgba(234, 179, 8, 0.3), rgba(168, 85, 247, 0.4))'
                : celebrationLevel >= 50
                  ? 'linear-gradient(to top right, rgba(16, 185, 129, 0.3), rgba(6, 182, 212, 0.4))'
                  : 'linear-gradient(to top right, rgba(59, 130, 246, 0.3), rgba(16, 185, 129, 0.4))'
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none backdrop-blur-[2px]">
            <h2
              className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
              style={{ animation: 'text-celebrate 4s ease-out forwards' }}
            >
              {celebrationLevel === 100 ? 'MASTERY!' : celebrationLevel >= 50 ? 'LEVEL UP!' : 'GREAT WORK!'}
            </h2>
          </div>

          <div className="absolute inset-0">
            {[...Array(Math.floor(20 + (celebrationLevel / 100) * 80))].map((_, i) => {
              const isHigh = celebrationLevel === 100;
              const isMed = celebrationLevel >= 50;
              const colorClass = isHigh ? (i % 2 === 0 ? 'text-yellow-400' : 'text-purple-400') : isMed ? (i % 2 === 0 ? 'text-emerald-400' : 'text-cyan-400') : (i % 2 === 0 ? 'text-blue-400' : 'text-emerald-400');
              const duration = (2 + Math.random() * 3) * (1 - (celebrationLevel / 300));
              const baseSize = 10 + (celebrationLevel / 100) * 15;
              const size = baseSize + Math.random() * baseSize;
              return (
                <svg
                  key={`skill-confetti-${i}`}
                  viewBox="0 0 24 24"
                  className={`absolute drop-shadow-md ${colorClass}`}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    left: `${Math.random() * 100}%`,
                    animation: `skill-celebrate ${duration}s ease-out infinite`,
                    animationDelay: `${Math.random() * -2}s`,
                    fill: 'currentColor'
                  }}
                >
                  {i % 4 === 0 ? <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /> : i % 2 === 0 ? <circle cx="12" cy="12" r="8" /> : <rect x="6" y="2" width="12" height="20" rx="2" />}
                </svg>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
