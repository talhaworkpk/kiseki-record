import { useState, useEffect, useRef } from 'react'
import { Target, Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Search, ArrowDownUp, CheckSquare, Square, Star, Archive as ArchiveIcon, ArchiveRestore, ListTodo, CheckCircle2, LayoutGrid, List, Download, Upload, MoreVertical } from 'lucide-react'
import { Goal, SubGoal, ProjectRecord } from '../../types'
import GoalsStatistics from '../../components/career/GoalsStatistics'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { ShootingStars } from '../../components/ShootingStars'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>('all_goals')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null)
  const [expandedSubGoalsId, setExpandedSubGoalsId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ status: 'all', isFavorite: false, isArchived: false })
  const [sortBy, setSortBy] = useState('newest')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [importConflicts, setImportConflicts] = useState<{imported: Goal, existing: Goal}[]>([])
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [pendingImports, setPendingImports] = useState<{toInsert: Goal[], toReplace: Goal[]}>({ toInsert: [], toReplace: [] })

  const [form, setForm] = useState<Partial<Goal>>({
    title: '', description: '', category: 'Career', priority: 'medium', startDate: new Date().toISOString().split('T')[0], targetDate: '', progress: 0, status: 'Active', notes: '', subGoals: []
  })
  const [currentBackground, setCurrentBackground] = useState('Default')
  const [transitionStage, setTransitionStage] = useState('idle')
  const [showStatusBackground, setShowStatusBackground] = useState(false)

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

  // Handle progress change with auto-status update
  const handleProgressChange = (value: number) => {
    if (form.subGoals && form.subGoals.length > 0) return; // Prevent manual change if subgoals exist
    setForm({...form, progress: value})
    if (value === 100 && form.status !== 'Completed') {
      setForm(prev => ({...prev, status: 'Completed'}))
    } else if (value < 100 && form.status === 'Completed') {
      setForm(prev => ({...prev, status: 'Active'}))
    }
  }

  // Handle status change with auto-progress update
  const handleStatusChange = (value: string) => {
    setForm({...form, status: value as any})
    if (value === 'Completed') {
      if (!form.subGoals || form.subGoals.length === 0) {
        setForm(prev => ({...prev, progress: 100}))
      }
    }
  }

  const updateSubGoals = (newSubGoals: SubGoal[]) => {
    if (newSubGoals.length === 0) {
      setForm(prev => ({ ...prev, subGoals: newSubGoals }))
      return;
    }
    
    const completedCount = newSubGoals.filter(sg => sg.completed).length;
    const progress = Math.round((completedCount / newSubGoals.length) * 100);
    
    setForm(prev => {
      const newStatus = progress === 100 ? 'Completed' : (prev.status === 'Completed' ? 'Active' : prev.status);
      return { ...prev, subGoals: newSubGoals, progress, status: newStatus as any };
    });
  }

  const [subGoalForm, setSubGoalForm] = useState<Partial<SubGoal>>({ title: '', description: '', completed: false })
  const [isAddingSubGoal, setIsAddingSubGoal] = useState(false)
  const [editingSubGoalId, setEditingSubGoalId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('goals', {})
      const careerGoals = data.filter((g: any) => ['Career', 'Education', 'Professional'].includes(g.category))
      setGoals(careerGoals)

      // @ts-ignore
      const projData = await window.api.db.find('projects', {})
      setProjects(projData)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { loadData() }, [])

  const handleExportSelected = () => {
    const dataToExport = goals.filter(g => selectedIds.has(g._id!))
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "selected_goals.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }

  const handleExportAll = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(goals, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "all_goals.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
    setIsMenuOpen(false)
  }

  const executeImports = async (toInsert: Goal[], toReplace: Goal[]) => {
    try {
      for (const goal of toInsert) {
        const { _id, ...goalData } = goal
        // @ts-ignore
        await window.api.db.insert('goals', goalData)
      }
      for (const goal of toReplace) {
        const { _id, ...goalData } = goal
        // @ts-ignore
        await window.api.db.update('goals', { _id }, { $set: goalData }, {})
      }
      loadData()
      NotificationEngine.notify('success', 'Import Complete', `Imported ${toInsert.length + toReplace.length} goals.`, 'Goals')
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
          const importedGoals = JSON.parse(event.target?.result as string)
          if (Array.isArray(importedGoals)) {
            const toInsert: Goal[] = []
            const toReplace: Goal[] = []
            const conflicts: {imported: Goal, existing: Goal}[] = []

            for (const importedGoal of importedGoals) {
              let existingGoal = goals.find(g => g._id === importedGoal._id)
              if (!existingGoal) existingGoal = goals.find(g => g.title === importedGoal.title)

              if (!existingGoal) {
                toInsert.push(importedGoal)
              } else {
                const importedTime = importedGoal.updatedAt || importedGoal.createdAt || 0
                const existingTime = existingGoal.updatedAt || existingGoal.createdAt || 0
                
                if (importedTime > existingTime) {
                  toReplace.push({...importedGoal, _id: existingGoal._id})
                } else if (importedTime < existingTime) {
                  conflicts.push({ imported: importedGoal, existing: existingGoal })
                } else if (importedTime === 0 && existingTime === 0) {
                  // Both are legacy goals without timestamps. We don't know which is newer, so ask the user.
                  conflicts.push({ imported: importedGoal, existing: existingGoal })
                }
                // If importedTime === existingTime && importedTime > 0, they are the exact same version, so we silently skip.
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
          console.error("Error importing goals", error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
    setIsMenuOpen(false)
  }

  const projectGoals = goals.filter(g => {
    if (selectedProjectId === 'all_goals') return true;
    if (selectedProjectId === 'all') return !!g.projectId;
    if (selectedProjectId === 'none') return !g.projectId;
    return g.projectId === selectedProjectId;
  });

  const filteredGoals = projectGoals.filter(g => {
    if (filters.status !== 'all' && g.status !== filters.status) return false
    if (filters.isFavorite && !g.isFavorite) return false
    if (filters.isArchived && !g.isArchived) return false
    if (!filters.isArchived && g.isArchived) return false
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!g.title.toLowerCase().includes(q) && !(g.description && g.description.toLowerCase().includes(q))) return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.targetDate || b.startDate || 0).getTime() - new Date(a.targetDate || a.startDate || 0).getTime()
    if (sortBy === 'oldest') return new Date(a.targetDate || a.startDate || 0).getTime() - new Date(b.targetDate || b.startDate || 0).getTime()
    if (sortBy === 'progress') return b.progress - a.progress
    if (sortBy === 'alpha') return a.title.localeCompare(b.title)
    return 0
  })

  const bulkAction = async (action: 'delete' | 'archive' | 'unarchive' | 'favorite') => {
    if (action === 'delete' && !confirm(`Delete ${selectedIds.size} goals?`)) return
    try {
      for (const id of selectedIds) {
        if (action === 'delete') {
          // @ts-ignore
          await window.api.db.remove('goals', { _id: id }, {})
        } else {
          const updateData = action === 'favorite' ? { isFavorite: true } 
                           : action === 'archive' ? { isArchived: true }
                           : { isArchived: false }
          // @ts-ignore
          await window.api.db.update('goals', { _id: id }, { $set: { ...updateData, updatedAt: Date.now() } }, {})
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
      await window.api.db.update('goals', { _id: id }, { $set: { isFavorite: !current, updatedAt: Date.now() } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const toggleArchive = async (id: string, current: boolean) => {
    try {
      // @ts-ignore
      await window.api.db.update('goals', { _id: id }, { $set: { isArchived: !current, updatedAt: Date.now() } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const triggerCinematicTransition = (newStatus: string) => {
    if (newStatus === 'Completed') {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 5000)
      return
    }

    setCurrentBackground(newStatus)
    setShowStatusBackground(true)
    
    // Cinematic transition sequence - simplified for smooth cross-fade
    setTransitionStage('fade-in')
    
    setTimeout(() => {
      setTransitionStage('settle')
    }, 300)
    
    // Return to default after showing status background
    setTimeout(() => {
      setTransitionStage('fade-out')
      // Wait for fade-out to complete before hiding status background
      setTimeout(() => {
        setShowStatusBackground(false)
        setCurrentBackground('Default')
        setTransitionStage('idle')
      }, 300)
    }, 4000)
  }

  const handleSave = async () => {
    try {
      const now = Date.now()
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('goals', { _id: editingId }, { $set: { ...form, updatedAt: now } }, {})
        NotificationEngine.notify('info', 'Goal Updated', `"${form.title}" was updated.`, 'Goals')
      } else {
        // @ts-ignore
        await window.api.db.insert('goals', { ...form, category: 'Career', createdAt: now, updatedAt: now })
        NotificationEngine.notify('success', 'Goal Created', `"${form.title}" was saved.`, 'Goals')
      }

      if (form.status === 'Completed') {
        NotificationEngine.checkAchievements()
      }

      // Trigger cinematic transition based on saved status
      triggerCinematicTransition(form.status || 'Active')

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

  const handleDelete = async (id: string) => {
    if (confirm('Delete this goal?')) {
      try {
        const goal = goals.find(g => g._id === id)
        // @ts-ignore
        await window.api.db.remove('goals', { _id: id }, {})
        if (goal) NotificationEngine.notify('info', 'Goal Deleted', `"${goal.title}" was removed.`, 'Goals')
        loadData()
      } catch (err) { console.error(err) }
    }
  }

  const openEdit = (record: Goal) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="h-full bg-background animate-in fade-in duration-500 relative overflow-hidden flex flex-col">
      <style>{`
        /* Cinematic Transition Animations */
        @keyframes cinematic-fade-out {
          0% { opacity: 1; filter: blur(0px); transform: scale(1); }
          100% { opacity: 0; filter: blur(8px); transform: scale(0.95); }
        }
        @keyframes cinematic-dissolve {
          0% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes cinematic-zoom-in {
          0% { opacity: 0; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes cinematic-fade-in {
          0% { opacity: 0; filter: blur(4px); transform: scale(1.05); }
          100% { opacity: 1; filter: blur(0px); transform: scale(1); }
        }
        @keyframes cinematic-settle {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        /* Premium Illustration Animations */
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-12px) translateX(4px); }
          75% { transform: translateY(-8px) translateX(-4px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.3)); }
          50% { filter: drop-shadow(0 0 16px rgba(255,255,255,0.6)); }
        }
        @keyframes particle-rise {
          0% { transform: translateY(100%) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translateY(90%) scale(1); }
          90% { opacity: 1; transform: translateY(10%) scale(1); }
          100% { transform: translateY(0%) scale(0); opacity: 0; }
        }
        @keyframes particle-float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(10px, -15px); }
          50% { transform: translate(-5px, -25px); }
          75% { transform: translate(-15px, -10px); }
        }
        @keyframes text-type-in {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes camera-breathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.01) translateY(-2px); }
        }
        @keyframes stair-move {
          0% { transform: translateY(0); opacity: 0.9; }
          80% { opacity: 0.9; }
          100% { transform: translateY(100px); opacity: 0; }
        }
        @keyframes stair-flow {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }
        @keyframes char-walk {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes arm-swing {
          0% { transform: rotate(-15deg); }
          100% { transform: rotate(15deg); }
        }
        @keyframes leg-move {
          0% { transform: rotate(-10deg); }
          100% { transform: rotate(10deg); }
        }
        @keyframes parallax-far {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-3px) translateX(2px); }
        }
        @keyframes parallax-mid {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-5px) translateX(-2px); }
        }
        @keyframes parallax-islands {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-4px) translateX(3px); }
        }
        @keyframes parallax-clouds {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-6px) translateX(-3px); }
        }
        @keyframes stair-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-7px); }
        }
        @keyframes stair-scroll-diagonal {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-5.5px, -5px); }
        }
        @keyframes stair-depth {
          0% { transform: translateY(0) scale(1); opacity: 0.95; }
          85% { opacity: 0.95; }
          100% { transform: translateY(100px) scale(0.8); opacity: 0; }
        }
        @keyframes stair-depth-diagonal {
          0% { transform: translate(0, 0) scale(1); opacity: 0.95; }
          85% { opacity: 0.95; }
          100% { transform: translate(-88px, 80px) scale(0.8); opacity: 0; }
        }
        @keyframes char-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes arm-swing-natural {
          0% { transform: rotate(-12deg); }
          100% { transform: rotate(12deg); }
        }
        @keyframes leg-move-natural {
          0% { transform: rotate(-8deg); }
          100% { transform: rotate(8deg); }
        }
        @keyframes leg-climb-left {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(25deg); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(30deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes leg-climb-right {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(25deg); }
          50% { transform: rotate(15deg); }
          75% { transform: rotate(30deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes treadmill-diagonal {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-80px, 80px); }
        }
        @keyframes arm-slight-swing {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }
        @keyframes left-leg-upper {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-20deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-25deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes left-leg-lower {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-20px, 20px) rotate(15deg); } /* Foot planted, moves with stair */
          50% { transform: translate(0, 0) rotate(0deg); }
          75% { transform: translate(20px, -20px) rotate(-15deg); } /* Foot planted, moves with stair */
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes right-leg-upper {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-20deg); }
          50% { transform: rotate(10deg); }
          75% { transform: rotate(-25deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes right-leg-lower {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-20px, 20px) rotate(15deg); } /* Foot planted, moves with stair */
          50% { transform: translate(0, 0) rotate(0deg); }
          75% { transform: translate(20px, -20px) rotate(-15deg); } /* Foot planted, moves with stair */
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes light-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
        @keyframes dest-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes particle-drift {
          0%, 100% { transform: translate(0, 0); opacity: 0.5; }
          25% { transform: translate(8px, -12px); opacity: 0.7; }
          50% { transform: translate(-4px, -20px); opacity: 0.5; }
          75% { transform: translate(-12px, -8px); opacity: 0.7; }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.3); }
        }
        
        /* Stage-specific classes */
 .stage-fade-out { animation: cinematic-fade-out 200ms ease-out forwards; }
 .stage-dissolve { animation: cinematic-dissolve 200ms ease-out forwards; }
 .stage-zoom-in { animation: cinematic-zoom-in 200ms ease-out forwards; }
 .stage-fade-in { animation: cinematic-fade-in 300ms ease-out forwards; }
 .stage-settle { animation: cinematic-settle 200ms ease-out forwards; }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        @keyframes celebrate-fall {
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

      {showCelebration ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-50 animate-in fade-in duration-300 backdrop-blur-[2px]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/15 via-yellow-400/12 to-emerald-400/15" />
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="trophy-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9"/>
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.5"/>
              </linearGradient>
              <linearGradient id="laurel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0.5"/>
              </linearGradient>
              <filter id="trophy-glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="sparkle-glow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Layer 1: Trophy */}
            <g style={{ animation: 'float-gentle 4s ease-in-out infinite' }}>
              {/* Trophy cup */}
              <path d="M35 30 Q35 25 40 25 L60 25 Q65 25 65 30 L65 45 Q65 55 50 55 Q35 55 35 45 Z" 
                    fill="url(#trophy-grad)" filter="url(#trophy-glow)" opacity="0.9"/>
              {/* Trophy handles */}
              <path d="M35 30 Q25 35 25 45 Q25 50 35 50" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.8"/>
              <path d="M65 30 Q75 35 75 45 Q75 50 65 50" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.8"/>
              {/* Trophy base */}
              <rect x="45" y="55" width="10" height="15" fill="#d97706" opacity="0.8"/>
              <rect x="40" y="70" width="20" height="5" fill="#b45309" opacity="0.7"/>
              {/* Star on trophy */}
              <path d="M50 32 L52 37 L57 37 L53 40 L55 45 L50 42 L45 45 L47 40 L43 37 L48 37 Z" 
                    fill="#fef3c7" filter="url(#sparkle-glow)"/>
            </g>
            
            {/* Layer 2: Laurel wreaths */}
            <g style={{ animation: 'pulse-soft 3s ease-in-out infinite' }}>
              <path d="M25 35 Q20 40 22 50 Q18 55 25 60" stroke="url(#laurel-grad)" strokeWidth="2" fill="none" opacity="0.7"/>
              <path d="M75 35 Q80 40 78 50 Q82 55 75 60" stroke="url(#laurel-grad)" strokeWidth="2" fill="none" opacity="0.7"/>
              {/* Laurel leaves */}
              {[...Array(4)].map((_, i) => (
                <ellipse key={`laurel-left-${i}`} 
                         cx={20 + i * 2} cy={40 + i * 5} 
                         rx="3" ry="5" 
                         fill="#22c55e" opacity={0.6 - i * 0.1}
                         transform={`rotate(${-30 + i * 10} ${20 + i * 2} ${40 + i * 5})`}
                />
              ))}
              {[...Array(4)].map((_, i) => (
                <ellipse key={`laurel-right-${i}`} 
                         cx={80 - i * 2} cy={40 + i * 5} 
                         rx="3" ry="5" 
                         fill="#22c55e" opacity={0.6 - i * 0.1}
                         transform={`rotate(${30 - i * 10} ${80 - i * 2} ${40 + i * 5})`}
                />
              ))}
            </g>
            
            {/* Layer 3: Confetti stars */}
            {[...Array(20)].map((_, i) => (
              <g key={`confetti-${i}`} style={{ 
                animation: `celebrate-fall ${2 + Math.random() * 2}s linear infinite`,
                animationDelay: `${Math.random() * -2}s`
              }}>
                <path 
                  d={`M${Math.random() * 100} ${-10} L${Math.random() * 100 + 2} ${5} L${Math.random() * 100 + 4} ${5} L${Math.random() * 100 + 2} ${10} L${Math.random() * 100} ${15} L${Math.random() * 100 - 2} ${10} L${Math.random() * 100 - 4} ${5} L${Math.random() * 100 - 2} ${5} Z`}
                  fill={i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f59e0b' : '#22c55e'}
                  opacity="0.8"
                  filter="url(#sparkle-glow)"
                />
              </g>
            ))}
            
            {/* Layer 4: Sparkles */}
            {[...Array(15)].map((_, i) => (
              <circle 
                key={`sparkle-${i}`}
                cx={Math.random() * 100} 
                cy={Math.random() * 100} 
                r={0.5 + Math.random() * 1} 
                fill="#fef3c7" 
                opacity="0.9"
                filter="url(#sparkle-glow)"
                style={{ animation: `pulse-soft ${1 + Math.random()}s ease-in-out infinite`, animationDelay: `${Math.random()}s` }}
              />
            ))}
            
            {/* Layer 5: Light burst */}
            <g style={{ animation: 'pulse-soft 2s ease-in-out infinite' }}>
              <circle cx="50" cy="45" r="30" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.3"/>
              <circle cx="50" cy="45" r="40" fill="none" stroke="#f59e0b" strokeWidth="0.3" opacity="0.2"/>
              <circle cx="50" cy="45" r="50" fill="none" stroke="#d97706" strokeWidth="0.2" opacity="0.1"/>
            </g>
            
            {/* Layer 6: Rising particles */}
            {[...Array(10)].map((_, i) => (
              <circle 
                key={`rise-particle-${i}`}
                cx={20 + i * 8} 
                cy={90 - i * 5} 
                r={0.3 + Math.random() * 0.5} 
                fill="#fbbf24" 
                opacity="0.7"
                style={{ animation: `particle-rise ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </svg>
          
          {/* Achievement text integrated into scene */}
          <div className="absolute bottom-12 left-0 right-0 text-center">
            <h2 
              className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 via-yellow-300 to-emerald-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
              style={{ animation: 'text-type-in 1s ease-out forwards' }}
            >
              🎯 GOAL ACHIEVED! 🎉
            </h2>
          </div>
        </div>
      ) : (
        <>
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Default background - always visible */}
          <div className="absolute inset-0 bg-white overflow-hidden">
            <ShootingStars />
            <style>{`
              :root {
                --step: 40px; 
                --speed: 0.8s; 
                --timing: cubic-bezier(0.45, 0.05, 0.55, 0.95);
              }
              
              .stairs-container {
                position: absolute;
                bottom: -200px;
                left: -100px;
                width: 1200px;
                height: 600px;
                z-index: 5;
                animation: moveStairs var(--speed) var(--timing) infinite;
              }
              
              @keyframes moveStairs {
                0%, 20% { transform: translate(0, 0); }
                80%, 100% { transform: translate(calc(var(--step) * -1), var(--step)); }
              }
              
              .man-container {
                position: absolute;
                bottom: 176px; 
                left: 400px;
                transform: translateX(-50%);
                width: 100px;
                height: 150px;
                z-index: 10;
              }
              
              .body-layer { 
                position: absolute; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%;
                transform-origin: bottom center;
                animation: jump var(--speed) var(--timing) infinite; 
              }
              
              @keyframes jump {
                0%   { transform: translateY(0) scaleY(1); }
                20%  { transform: translateY(0) scaleY(0.7) scaleX(1.2); }
                50%  { transform: translateY(-50px) scaleY(1.2) scaleX(0.8); }
                80%  { transform: translateY(0) scaleY(0.8) scaleX(1.1); }
                100% { transform: translateY(0) scaleY(1); }
              }
              
              .arm-l { transform-origin: 50px 45px; animation: swing var(--speed) var(--timing) infinite; }
              .arm-r { transform-origin: 50px 45px; animation: swing var(--speed) var(--timing) infinite reverse; }
              
              @keyframes swing {
                0%, 100% { transform: rotate(-20deg); }
                50% { transform: rotate(40deg); }
              }
              
              .limb {
                fill: black;
                stroke: white;
                stroke-width: 3px;
                stroke-linecap: round;
                stroke-linejoin: round;
              }
            `}</style>
            
            <div className="stairs-container">
              <svg viewBox="0 0 1000 600" className="w-full h-full">
                <path d="M0,600 L0,560 L40,560 L40,520 L80,520 L80,480 L120,480 L120,440 L160,440 L160,400 L200,400 L200,360 L240,360 L240,320 L280,320 L280,280 L320,280 L320,240 L360,240 L360,200 L400,200 L400,160 L440,160 L440,120 L480,120 L480,80 L520,80 L520,40 L560,40 L560,0 L1200,0 L1200,600 Z" fill="black" />
              </svg>
            </div>

            <div className="man-container">
              <svg className="body-layer" viewBox="0 0 100 150">
                <line className="limb arm-r" x1="50" y1="45" x2="30" y2="85" stroke="black" strokeWidth="8" />
                <rect className="limb" x="43" y="40" width="14" height="45" rx="7" />
                <circle className="limb" cx="50" cy="22" r="16" />
                <line className="limb arm-l" x1="50" y1="45" x2="70" y2="85" stroke="black" strokeWidth="8" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className={`absolute inset-0 overflow-hidden pointer-events-none z-50 ${showStatusBackground ? 'backdrop-blur-[2px]' : ''}`}>
          {/* Status background overlay - fades in/out on top */}
          {showStatusBackground && currentBackground === 'Planned' && (
            <div className={`absolute inset-0 bg-gradient-to-br from-amber-200/20 via-orange-300/15 to-blue-400/20 ${transitionStage !== 'idle' ? `stage-${transitionStage}` : ''}`}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="sunrise-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="mountain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.3"/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Background sky gradient */}
                <rect width="100" height="100" fill="url(#sunrise-grad)" opacity="0.3"/>
                
                {/* Layer 1: Distant mountains */}
                <g style={{ animation: 'float-gentle 8s ease-in-out infinite' }}>
                  <path d="M0 60 L20 40 L40 55 L60 35 L80 50 L100 30 L100 100 L0 100 Z" 
                        fill="url(#mountain-grad)" opacity="0.4"/>
                </g>
                
                {/* Layer 2: Closer mountains */}
                <g style={{ animation: 'float-medium 10s ease-in-out infinite' }}>
                  <path d="M-10 70 L15 45 L35 60 L55 40 L75 55 L95 35 L110 70 L110 100 L-10 100 Z" 
                        fill="url(#mountain-grad)" opacity="0.6"/>
                </g>
                
                {/* Layer 3: Glowing path */}
                <g style={{ animation: 'pulse-soft 4s ease-in-out infinite' }}>
                  <path d="M50 100 Q55 80 50 60 Q45 40 50 20" 
                        stroke="#fbbf24" strokeWidth="0.8" fill="none" 
                        filter="url(#glow)" opacity="0.8"/>
                  <circle cx="50" cy="20" r="2" fill="#fbbf24" filter="url(#glow)"/>
                </g>
                
                {/* Layer 4: Floating compass */}
                <g style={{ animation: 'float-gentle 6s ease-in-out infinite', animationDelay: '1s' }}>
                  <circle cx="20" cy="30" r="4" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6"/>
                  <path d="M20 26 L20 34 M16 30 L24 30" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6"/>
                  <path d="M20 27 L20 33" stroke="#fbbf24" strokeWidth="0.3" opacity="0.8"/>
                </g>
                
                {/* Layer 5: Paper plane */}
                <g style={{ animation: 'float-medium 7s ease-in-out infinite', animationDelay: '2s' }}>
                  <path d="M75 25 L85 30 L75 35 L78 30 Z" fill="#fbbf24" opacity="0.5"/>
                </g>
                
                {/* Layer 6: Golden particles */}
                {[...Array(8)].map((_, i) => (
                  <circle 
                    key={`gold-particle-${i}`}
                    cx={10 + i * 12} 
                    cy={80 - i * 6} 
                    r={0.3 + i * 0.1} 
                    fill="#fbbf24" 
                    opacity="0.6"
                    style={{ animation: `particle-rise ${3 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
                  />
                ))}
                
                {/* Layer 7: Blueprint lines */}
                <g opacity="0.2">
                  <line x1="30" y1="70" x2="70" y2="70" stroke="#6366f1" strokeWidth="0.3" strokeDasharray="2,2"/>
                  <line x1="30" y1="75" x2="70" y2="75" stroke="#6366f1" strokeWidth="0.3" strokeDasharray="2,2"/>
                </g>
              </svg>
              
              {/* Motivational text integrated into scene */}
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-xl md:text-2xl font-light text-amber-400/90 italic" 
                   style={{ animation: 'text-type-in 1.5s ease-out forwards', animationDelay: '0.5s' }}>
                  "Your journey is ready. Take the first step."
                </p>
              </div>
            </div>
          )}
          {showStatusBackground && currentBackground === 'Active' && (
            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-blue-500/12 to-purple-500/15 ${transitionStage !== 'idle' ? `stage-${transitionStage}` : ''}`}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="energy-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.7"/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3"/>
                  </linearGradient>
                  <linearGradient id="stair-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4"/>
                  </linearGradient>
                  <filter id="energy-glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Background energy gradient */}
                <rect width="100" height="100" fill="url(#energy-grad)" opacity="0.2"/>
                
                {/* Layer 1: Ascending staircase */}
                <g style={{ animation: 'float-gentle 6s ease-in-out infinite' }}>
                  <rect x="20" y="80" width="15" height="8" fill="url(#stair-grad)" opacity="0.7"/>
                  <rect x="38" y="72" width="15" height="16" fill="url(#stair-grad)" opacity="0.75"/>
                  <rect x="56" y="64" width="15" height="24" fill="url(#stair-grad)" opacity="0.8"/>
                  <rect x="74" y="56" width="15" height="32" fill="url(#stair-grad)" opacity="0.85"/>
                </g>
                
                {/* Layer 2: Energy trails */}
                <g style={{ animation: 'pulse-soft 3s ease-in-out infinite' }}>
                  <path d="M27 80 Q45 76 63 68 Q81 60 99 52" 
                        stroke="#06b6d4" strokeWidth="1.5" fill="none" 
                        filter="url(#energy-glow)" opacity="0.6"/>
                  <path d="M27 80 Q45 76 63 68 Q81 60 99 52" 
                        stroke="#3b82f6" strokeWidth="0.8" fill="none" 
                        opacity="0.4" style={{ animation: 'shimmer 3s linear infinite' }}/>
                </g>
                
                {/* Layer 3: Upward arrows */}
                <g style={{ animation: 'float-medium 5s ease-in-out infinite' }}>
                  <path d="M85 40 L90 30 L95 40 L90 35 Z" fill="#06b6d4" opacity="0.7" filter="url(#energy-glow)"/>
                  <path d="M80 50 L85 40 L90 50 L85 45 Z" fill="#3b82f6" opacity="0.5" filter="url(#energy-glow)"/>
                  <path d="M75 60 L80 50 L85 60 L80 55 Z" fill="#8b5cf6" opacity="0.4" filter="url(#energy-glow)"/>
                </g>
                
                {/* Layer 4: Progress rings */}
                {[...Array(3)].map((_, i) => (
                  <g key={`ring-${i}`} style={{ animation: `pulse-soft ${2 + i}s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }}>
                    <circle 
                      cx={50} cy={50} r={15 + i * 8} 
                      fill="none" 
                      stroke={i === 0 ? '#06b6d4' : i === 1 ? '#3b82f6' : '#8b5cf6'} 
                      strokeWidth="0.5" 
                      opacity={0.4 - i * 0.1}
                      filter="url(#energy-glow)"
                    />
                  </g>
                ))}
                
                {/* Layer 5: Energy particles */}
                {[...Array(10)].map((_, i) => (
                  <circle 
                    key={`energy-particle-${i}`}
                    cx={15 + i * 8} 
                    cy={85 - i * 7} 
                    r={0.4 + i * 0.1} 
                    fill="#06b6d4" 
                    opacity="0.7"
                    style={{ animation: `particle-rise ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
                
                {/* Layer 6: Checkpoint markers */}
                <g style={{ animation: 'float-gentle 7s ease-in-out infinite', animationDelay: '1s' }}>
                  <circle cx="27" cy="76" r="1.5" fill="#06b6d4" filter="url(#energy-glow)"/>
                  <circle cx="45" cy="68" r="1.5" fill="#3b82f6" filter="url(#energy-glow)"/>
                  <circle cx="63" cy="60" r="1.5" fill="#8b5cf6" filter="url(#energy-glow)"/>
                  <circle cx="81" cy="52" r="1.5" fill="#06b6d4" filter="url(#energy-glow)"/>
                </g>
                
                {/* Layer 7: Wind lines */}
                <g opacity="0.3">
                  <path d="M10 30 Q30 28 50 30" stroke="#06b6d4" strokeWidth="0.3" fill="none"/>
                  <path d="M15 40 Q35 38 55 40" stroke="#3b82f6" strokeWidth="0.3" fill="none"/>
                  <path d="M20 50 Q40 48 60 50" stroke="#8b5cf6" strokeWidth="0.3" fill="none"/>
                </g>
              </svg>
              
              {/* Motivational text integrated into scene */}
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-xl md:text-2xl font-semibold text-cyan-400/90" 
                   style={{ animation: 'text-type-in 1.5s ease-out forwards', animationDelay: '0.5s' }}>
                  "Keep moving. You're closer than yesterday."
                </p>
              </div>
            </div>
          )}
          {showStatusBackground && currentBackground === 'Paused' && (
            <div className={`absolute inset-0 bg-gradient-to-br from-indigo-300/15 via-purple-400/12 to-blue-300/15 ${transitionStage !== 'idle' ? `stage-${transitionStage}` : ''}`}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="pause-new-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4"/>
                    <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2"/>
                  </linearGradient>
                  <linearGradient id="pause-soft-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3"/>
                  </linearGradient>
                  <filter id="pause-ambient">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Background calm gradient */}
                <rect width="100" height="100" fill="url(#pause-new-grad)" opacity="0.3"/>
                
                {/* Layer 1: Floating soft circles */}
                <g style={{ animation: 'float-gentle 12s ease-in-out infinite' }}>
                  <circle cx="25" cy="35" r="18" fill="url(#pause-soft-grad)" opacity="0.3"/>
                  <circle cx="75" cy="65" r="22" fill="url(#pause-soft-grad)" opacity="0.25"/>
                </g>
                
                {/* Layer 2: Gentle wave lines */}
                <g style={{ animation: 'float-medium 14s ease-in-out infinite' }}>
                  <path d="M0 45 Q25 42 50 45 Q75 48 100 45" stroke="#818cf8" strokeWidth="0.6" fill="none" opacity="0.4"/>
                  <path d="M0 55 Q25 52 50 55 Q75 58 100 55" stroke="#6366f1" strokeWidth="0.5" fill="none" opacity="0.35"/>
                  <path d="M0 65 Q25 62 50 65 Q75 68 100 65" stroke="#4f46e5" strokeWidth="0.4" fill="none" opacity="0.3"/>
                </g>
                
                {/* Layer 3: Pause symbol */}
                <g style={{ animation: 'pulse-soft 4s ease-in-out infinite' }}>
                  <rect x="47" y="45" width="6" height="10" fill="#818cf8" opacity="0.7" filter="url(#pause-ambient)"/>
                  <rect x="47" y="45" width="6" height="10" fill="#a5b4fc" opacity="0.5"/>
                </g>
                
                {/* Layer 4: Floating particles */}
                {[...Array(10)].map((_, i) => (
                  <circle 
                    key={`pause-particle-${i}`}
                    cx={12 + i * 9} cy={20 + (i % 3) * 22} 
                    r={0.4 + Math.random() * 0.5} 
                    fill="#a5b4fc" 
                    opacity="0.5"
                    style={{ animation: `particle-float ${12 + i}s ease-in-out infinite`, animationDelay: `${i * 0.6}s` }}
                  />
                ))}
                
                {/* Layer 5: Soft concentric circles */}
                {[...Array(4)].map((_, i) => (
                  <g key={`pause-ring-${i}`} style={{ animation: `pulse-soft ${5 + i}s ease-in-out infinite`, animationDelay: `${i * 0.8}s` }}>
                    <circle 
                      cx={50} cy={50} r={15 + i * 10} 
                      fill="none" 
                      stroke={i === 0 ? '#818cf8' : i === 1 ? '#6366f1' : i === 2 ? '#4f46e5' : '#4338ca'} 
                      strokeWidth="0.4" 
                      opacity={0.3 - i * 0.06}
                      filter="url(#pause-ambient)"
                    />
                  </g>
                ))}
                
                {/* Layer 6: Floating dots */}
                {[...Array(6)].map((_, i) => (
                  <circle 
                    key={`pause-dot-${i}`}
                    cx={20 + i * 13} cy={30 + (i % 2) * 35} 
                    r={1.5 + i * 0.2} 
                    fill="#818cf8" 
                    opacity={0.3 - i * 0.03}
                    style={{ animation: `float-gentle ${8 + i}s ease-in-out infinite`, animationDelay: `${i * 0.7}s` }}
                  />
                ))}
                
                {/* Layer 7: Subtle sparkle */}
                {[...Array(5)].map((_, i) => (
                  <circle 
                    key={`pause-sparkle-${i}`}
                    cx={30 + i * 10} cy={40 + (i % 2) * 20} 
                    r={0.8} 
                    fill="#a5b4fc" 
                    opacity="0.6"
                    style={{ animation: `pulse-soft ${2 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}
                  />
                ))}
              </svg>
              
              {/* Encouraging text integrated into scene */}
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-xl md:text-2xl font-light text-indigo-400/80 italic" 
                   style={{ animation: 'text-type-in 1.5s ease-out forwards', animationDelay: '0.5s' }}>
                  "Every journey needs rest. We'll be here when you're ready."
                </p>
              </div>
            </div>
          )}
          {showStatusBackground && currentBackground === 'Cancelled' && (
            <div className={`absolute inset-0 bg-gradient-to-br from-rose-400/15 via-pink-500/12 to-purple-500/15 ${transitionStage !== 'idle' ? `stage-${transitionStage}` : ''}`}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="cancel-new-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity="0.4"/>
                    <stop offset="50%" stopColor="#e11d48" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#be185d" stopOpacity="0.2"/>
                  </linearGradient>
                  <linearGradient id="cancel-soft-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fda4af" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0.3"/>
                  </linearGradient>
                  <filter id="cancel-ambient">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Background loss gradient */}
                <rect width="100" height="100" fill="url(#cancel-new-grad)" opacity="0.3"/>
                
                {/* Layer 1: Floating soft circles */}
                <g style={{ animation: 'float-gentle 12s ease-in-out infinite' }}>
                  <circle cx="30" cy="40" r="20" fill="url(#cancel-soft-grad)" opacity="0.25"/>
                  <circle cx="70" cy="60" r="25" fill="url(#cancel-soft-grad)" opacity="0.2"/>
                </g>
                
                {/* Layer 2: Gentle wave lines */}
                <g style={{ animation: 'float-medium 14s ease-in-out infinite' }}>
                  <path d="M0 50 Q25 47 50 50 Q75 53 100 50" stroke="#fb7185" strokeWidth="0.6" fill="none" opacity="0.35"/>
                  <path d="M0 60 Q25 57 50 60 Q75 63 100 60" stroke="#e11d48" strokeWidth="0.5" fill="none" opacity="0.3"/>
                  <path d="M0 70 Q25 67 50 70 Q75 73 100 70" stroke="#be185d" strokeWidth="0.4" fill="none" opacity="0.25"/>
                </g>
                
                {/* Layer 3: X symbol */}
                <g style={{ animation: 'pulse-soft 4s ease-in-out infinite' }}>
                  <path d="M45 45 L55 55 M55 45 L45 55" stroke="#fb7185" strokeWidth="2" opacity="0.7" filter="url(#cancel-ambient)"/>
                  <path d="M45 45 L55 55 M55 45 L45 55" stroke="#fda4af" strokeWidth="1.5" opacity="0.5"/>
                </g>
                
                {/* Layer 4: Floating particles */}
                {[...Array(10)].map((_, i) => (
                  <circle 
                    key={`cancel-particle-${i}`}
                    cx={12 + i * 9} cy={25 + (i % 3) * 20} 
                    r={0.4 + Math.random() * 0.5} 
                    fill="#fda4af" 
                    opacity="0.4"
                    style={{ animation: `particle-float ${12 + i}s ease-in-out infinite`, animationDelay: `${i * 0.6}s` }}
                  />
                ))}
                
                {/* Layer 5: Soft concentric circles */}
                {[...Array(4)].map((_, i) => (
                  <g key={`cancel-ring-${i}`} style={{ animation: `pulse-soft ${5 + i}s ease-in-out infinite`, animationDelay: `${i * 0.8}s` }}>
                    <circle 
                      cx={50} cy={50} r={15 + i * 10} 
                      fill="none" 
                      stroke={i === 0 ? '#fb7185' : i === 1 ? '#e11d48' : i === 2 ? '#be185d' : '#9f1239'} 
                      strokeWidth="0.4" 
                      opacity={0.25 - i * 0.05}
                      filter="url(#cancel-ambient)"
                    />
                  </g>
                ))}
                
                {/* Layer 6: Floating dots */}
                {[...Array(6)].map((_, i) => (
                  <circle 
                    key={`cancel-dot-${i}`}
                    cx={18 + i * 13} cy={35 + (i % 2) * 30} 
                    r={1.5 + i * 0.2} 
                    fill="#fb7185" 
                    opacity={0.25 - i * 0.03}
                    style={{ animation: 'float-gentle 8s ease-in-out infinite', animationDelay: `${i * 0.7}s` }}
                  />
                ))}
                
                {/* Layer 7: Subtle sparkle */}
                {[...Array(5)].map((_, i) => (
                  <circle 
                    key={`cancel-sparkle-${i}`}
                    cx={28 + i * 10} cy={45 + (i % 2) * 18} 
                    r="0.8" 
                    fill="#fda4af" 
                    opacity="0.5"
                    style={{ animation: `pulse-soft ${2 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}
                  />
                ))}
              </svg>
              
              {/* Closure text integrated into scene */}
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-xl md:text-2xl font-light text-rose-400/80 italic" 
                   style={{ animation: 'text-type-in 1.5s ease-out forwards', animationDelay: '0.5s' }}>
                  "Some journeys end early. The road is still waiting if you return."
                </p>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* Top Toolbar */}
      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur z-20 flex flex-wrap gap-2 items-center justify-between shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="text-red-500" size={20} /> Goals
          </h1>
          
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title, desc..."
              className="pl-9 pr-4 py-1.5 w-64 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
            />
          </div>
          
          <div className="flex border border-border rounded-xl bg-background overflow-hidden" title="Filter goals by project">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><LayoutGrid size={14} className="text-muted-foreground"/></div>
            <select value={selectedProjectId || 'all_goals'} onChange={e=>setSelectedProjectId(e.target.value)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer max-w-[150px] truncate">
              <option value="all_goals">All Goals</option>
              <option value="none">No Project</option>
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded-xl bg-background overflow-hidden">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><ArrowDownUp size={14} className="text-muted-foreground"/></div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="progress">By Progress</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
          
          <div className="flex bg-accent/50 p-1 rounded-full border border-border items-center">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-400' : 'text-muted-foreground hover:text-foreground'}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${isSelectionMode ? 'bg-red-500 text-white shadow-md' : 'bg-background border border-border hover:bg-accent text-foreground'}`}
          >
            {isSelectionMode ? <CheckSquare size={16}/> : <Square size={16}/>}
            Select
          </button>

          {!isAdding && (
            <button onClick={() => { setForm({ category: 'Career', priority: 'medium', progress: 0, status: 'Active', startDate: new Date().toISOString().split('T')[0], notes: '' }); setEditingId(null); setIsAdding(true) }} className="px-4 py-1.5 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold flex items-center gap-2 text-sm shadow-sm transition-transform hover:scale-105">
              <Plus size={16}/> New Goal
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 p-2 overflow-hidden animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <button onClick={handleImport} className="w-full text-left px-3 py-2.5 bg-background hover:bg-accent border border-border rounded-lg flex items-center gap-2.5 text-sm font-bold transition-colors">
                      <Upload size={16} className="text-blue-500" /> Import Goals
                    </button>
                    <button onClick={handleExportAll} className="w-full text-left px-3 py-2.5 bg-background hover:bg-accent border border-border rounded-lg flex items-center gap-2.5 text-sm font-bold transition-colors">
                      <Download size={16} className="text-green-500" /> Export All Goals
                    </button>
                  </div>
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
                if (selectedIds.size === filteredGoals.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(filteredGoals.map(r => r._id!)))
              }} 
              className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14}/> {selectedIds.size === filteredGoals.length && filteredGoals.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
            <div className="flex items-center gap-2">
            <button onClick={() => bulkAction('favorite')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Star size={14}/> Favorite</button>
            {!filters.isArchived && <button onClick={() => bulkAction('archive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveIcon size={14}/> Archive</button>}
            {filters.isArchived && <button onClick={() => bulkAction('unarchive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveRestore size={14}/> Unarchive</button>}
            <button onClick={handleExportSelected} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-xl text-sm font-bold hover:bg-blue-500/20 disabled:opacity-50"><Download size={14}/> Export</button>
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
        <GoalsStatistics goals={projectGoals} setFilters={setFilters} />

      {isAdding ? (
        <div className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-md border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Goal' : 'Add Goal'}</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20}/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Goal Title</label>
              <input autoFocus type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" placeholder="e.g. Learn React, Get Internship" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Project</label>
              <select value={form.projectId || 'none'} onChange={e => setForm({...form, projectId: e.target.value === 'none' ? null : e.target.value})} className="w-full p-2 bg-background border border-border rounded-md">
                <option value="none">None</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Progress ({form.progress}%)</label>
              {form.subGoals && form.subGoals.length > 0 ? (
                <div className="w-full p-2 bg-accent/50 border border-border rounded-md text-sm text-muted-foreground flex items-center gap-2">
                  <div className="flex-1 bg-background rounded-full h-2 overflow-hidden">
                    <div className="bg-red-500 h-full transition-all" style={{width: `${form.progress}%`}}></div>
                  </div>
                  <span>Calculated from {form.subGoals.filter(s=>s.completed).length} of {form.subGoals.length} completed sub-goals</span>
                </div>
              ) : (
                <input type="range" min="0" max="100" value={form.progress} onChange={e => handleProgressChange(Number(e.target.value))} className="w-full accent-red-500" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status} onChange={e => handleStatusChange(e.target.value)} className="w-full p-2 bg-background border border-border rounded-md">
                <option value="Planned">Planned</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Paused">Paused</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Date</label>
              <input type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes / Content</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md min-h-[100px] resize-y" placeholder="Add any additional notes, details, or content related to this goal..." />
            </div>

            <div className="md:col-span-2 mt-4">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2"><ListTodo size={18} /> Sub-Goals</h3>
                <button 
                  onClick={() => { setSubGoalForm({ title: '', description: '', completed: false, order: (form.subGoals?.length || 0) }); setEditingSubGoalId(null); setIsAddingSubGoal(true) }}
                  className="text-sm font-bold flex items-center gap-1 text-red-500 hover:text-red-600"
                >
                  <Plus size={14}/> Add Sub-Goal
                </button>
              </div>

              {!form.subGoals?.length && !isAddingSubGoal && (
                <div className="text-center p-6 border border-dashed border-border rounded-xl text-muted-foreground bg-background/50">
                  <p className="font-medium mb-1">No sub-goals yet</p>
                  <p className="text-xs opacity-70 mb-3">Break this goal into smaller steps to make progress easier to track.</p>
                  <button onClick={() => { setSubGoalForm({ title: '', description: '', completed: false, order: 0 }); setEditingSubGoalId(null); setIsAddingSubGoal(true) }} className="px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-md text-sm font-medium">
                    + Add Sub-Goal
                  </button>
                </div>
              )}

              {isAddingSubGoal && (
                <div className="bg-background border border-border p-4 rounded-xl mb-4 space-y-3 relative">
                  <h4 className="font-bold text-sm mb-2">{editingSubGoalId ? 'Edit Sub-Goal' : 'New Sub-Goal'}</h4>
                  <input autoFocus type="text" value={subGoalForm.title} onChange={e=>setSubGoalForm({...subGoalForm, title: e.target.value})} placeholder="Sub-Goal Title" className="w-full p-2 bg-accent/30 border border-border rounded-md text-sm" />
                  <textarea value={subGoalForm.description} onChange={e=>setSubGoalForm({...subGoalForm, description: e.target.value})} placeholder="Optional description..." className="w-full p-2 bg-accent/30 border border-border rounded-md text-sm min-h-[60px]" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsAddingSubGoal(false)} className="px-3 py-1 bg-accent hover:bg-accent/80 rounded-md text-xs font-bold">Cancel</button>
                    <button 
                      onClick={() => {
                        if (!subGoalForm.title?.trim()) return;
                        const currentList = [...(form.subGoals || [])];
                        if (editingSubGoalId) {
                          const idx = currentList.findIndex(s => s.id === editingSubGoalId);
                          if (idx !== -1) currentList[idx] = { ...currentList[idx], ...subGoalForm } as SubGoal;
                        } else {
                          currentList.push({ ...subGoalForm, id: Math.random().toString(36).substring(7), completed: false, startDate: new Date().toISOString().split('T')[0] } as SubGoal);
                        }
                        updateSubGoals(currentList.sort((a,b)=>a.order - b.order));
                        setIsAddingSubGoal(false);
                      }} 
                      className="px-3 py-1 bg-red-500 text-white hover:bg-red-600 rounded-md text-xs font-bold"
                    >
                      {editingSubGoalId ? 'Save' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {form.subGoals && form.subGoals.length > 0 && (
                <div className="space-y-2">
                  {form.subGoals.map((sg, index) => (
                    <div key={sg.id} className="flex items-start gap-3 p-3 bg-background border border-border rounded-xl group relative">
                      <button 
                        onClick={() => {
                          const currentList = [...(form.subGoals || [])];
                          const idx = currentList.findIndex(s => s.id === sg.id);
                          if (idx !== -1) {
                            currentList[idx].completed = !currentList[idx].completed;
                            currentList[idx].completedAt = currentList[idx].completed ? new Date().toISOString().split('T')[0] : undefined;
                          }
                          updateSubGoals(currentList);
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {sg.completed ? <CheckSquare size={18} className="text-green-500" /> : <Square size={18} className="text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${sg.completed ? 'line-through text-muted-foreground opacity-70' : ''}`}>{sg.title}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          {sg.startDate && <span>Started: {new Date(sg.startDate).toLocaleDateString()}</span>}
                          {sg.completedAt && <span className="text-green-500">Completed: {new Date(sg.completedAt).toLocaleDateString()}</span>}
                        </div>
                        {sg.description && <p className="text-xs text-muted-foreground mt-1">{sg.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button disabled={index === 0} onClick={() => {
                          const currentList = [...(form.subGoals || [])];
                          [currentList[index].order, currentList[index-1].order] = [currentList[index-1].order, currentList[index].order];
                          updateSubGoals(currentList.sort((a,b)=>a.order - b.order));
                        }} className="p-1 hover:bg-accent rounded text-muted-foreground disabled:opacity-30"><ChevronUp size={14}/></button>
                        <button disabled={index === form.subGoals!.length - 1} onClick={() => {
                          const currentList = [...(form.subGoals || [])];
                          [currentList[index].order, currentList[index+1].order] = [currentList[index+1].order, currentList[index].order];
                          updateSubGoals(currentList.sort((a,b)=>a.order - b.order));
                        }} className="p-1 hover:bg-accent rounded text-muted-foreground disabled:opacity-30"><ChevronDown size={14}/></button>
                        <button onClick={() => {
                          setSubGoalForm(sg); setEditingSubGoalId(sg.id); setIsAddingSubGoal(true);
                        }} className="p-1 hover:bg-accent rounded text-muted-foreground ml-1"><Edit2 size={14}/></button>
                        <button onClick={() => {
                          const currentList = form.subGoals!.filter(s => s.id !== sg.id);
                          updateSubGoals(currentList);
                        }} className="p-1 hover:bg-destructive/10 text-destructive rounded"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4 mt-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium">Save Goal</button>
          </div>
        </div>
      ) : null}

      <div className={viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-4"}>
        {filteredGoals.map(record => {
          const daysSinceStart = record.status === 'Active' && record.startDate 
            ? Math.floor((new Date().getTime() - new Date(record.startDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          return (
            <div key={record._id} className="bg-slate-50/80 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800/80 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm hover:shadow-md relative group hover:border-red-500/50 transition-all">
              <div className="flex items-start gap-4">
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
                    {selectedIds.has(record._id!) ? <CheckSquare size={20} className="text-red-500"/> : <Square size={20} className="text-muted-foreground"/>}
                  </button>
                )}
                
                <div className="flex-1 min-w-0 pr-32">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold truncate">{record.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${record.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {record.status}
                    </span>
                    {record.isFavorite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                    {record.isArchived && <ArchiveIcon size={14} className="text-gray-500" />}
                    {record.startDate && (
                      <span className="text-xs text-muted-foreground font-medium">Started: {new Date(record.startDate).toLocaleDateString()}</span>
                    )}
                    {record.targetDate && (
                      <span className="text-xs text-muted-foreground font-medium">Target: {new Date(record.targetDate).toLocaleDateString()}</span>
                    )}
                    {daysSinceStart !== null && daysSinceStart >= 0 && (
                      <span className="text-xs text-blue-500 font-medium">{daysSinceStart} day{daysSinceStart !== 1 ? 's' : ''} active</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-md bg-accent rounded-full h-2.5 overflow-hidden">
                      <div className="bg-red-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${record.progress}%` }}></div>
                    </div>
                    <span className="text-sm font-bold w-12">{record.progress}%</span>
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleFavorite(record._id!, !!record.isFavorite)} className={`p-1.5 bg-background border border-border rounded-md hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 transition-colors ${record.isFavorite ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-foreground'}`} title={record.isFavorite ? "Unfavorite" : "Favorite"}><Star size={16} className={record.isFavorite ? "fill-yellow-500" : ""}/></button>
                  <button onClick={() => toggleArchive(record._id!, !!record.isArchived)} className={`p-1.5 bg-background border border-border rounded-md hover:bg-gray-500/20 hover:text-gray-500 hover:border-gray-500/50 transition-colors ${record.isArchived ? 'text-gray-500 bg-gray-500/10 border-gray-500/30' : 'text-foreground'}`} title={record.isArchived ? "Unarchive" : "Archive"}><ArchiveIcon size={16}/></button>
                  <button onClick={() => openEdit(record)} className="p-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(record._id!)} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10" title="Delete"><Trash2 size={16}/></button>
                  {(record.notes || (record.subGoals && record.subGoals.length > 0)) && record._id && (
                    <button 
                      onClick={() => setExpandedNotesId(expandedNotesId === record._id ? null : record._id!)}
                      className="p-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground"
                    >
                      <ChevronDown size={16} className={`transition-transform ${expandedNotesId === record._id ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {record.subGoals && record.subGoals.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground bg-accent px-2 py-1 rounded-md">
                    {record.subGoals.filter(s=>s.completed).length} / {record.subGoals.length} Sub-Goals
                  </span>
                  <button 
                    onClick={() => setExpandedSubGoalsId(expandedSubGoalsId === record._id ? null : record._id!)}
                    className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                  >
                    {expandedSubGoalsId === record._id ? 'Hide Sub-Goals' : '▼ View Sub-Goals'}
                  </button>
                </div>
              )}

              {expandedSubGoalsId === record._id && record.subGoals && record.subGoals.length > 0 && (
                <div className="mt-4 p-4 bg-accent/30 rounded-xl border border-border space-y-2 animate-in slide-in-from-top-2">
                  {record.subGoals.map(sg => (
                    <div key={sg.id} className="flex items-start gap-3">
                      <button 
                        onClick={async () => {
                          const currentList = [...record.subGoals!];
                          const idx = currentList.findIndex(s => s.id === sg.id);
                          if (idx !== -1) {
                            currentList[idx].completed = !currentList[idx].completed;
                            currentList[idx].completedAt = currentList[idx].completed ? new Date().toISOString().split('T')[0] : undefined;
                            
                            const completedCount = currentList.filter(s => s.completed).length;
                            const progress = Math.round((completedCount / currentList.length) * 100);
                            const newStatus = progress === 100 ? 'Completed' : (record.status === 'Completed' ? 'Active' : record.status);
                            
                            try {
                              // @ts-ignore
                              await window.api.db.update('goals', { _id: record._id }, { $set: { subGoals: currentList, progress, status: newStatus, updatedAt: Date.now() } }, {})
                              if (newStatus === 'Completed' && record.status !== 'Completed') {
                                triggerCinematicTransition('Completed');
                              }
                              loadData()
                            } catch (err) { console.error(err) }
                          }
                        }}
                        className="mt-0.5"
                      >
                        {sg.completed ? <CheckCircle2 size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/50"></div>}
                      </button>
                      <div>
                        {sg.description ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className={`text-sm font-medium cursor-help decoration-muted-foreground/50 underline-offset-2 ${sg.completed ? 'line-through text-muted-foreground opacity-70' : 'underline'}`}>{sg.title}</p>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                              {sg.description}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <p className={`text-sm font-medium ${sg.completed ? 'line-through text-muted-foreground opacity-70' : ''}`}>{sg.title}</p>
                        )}
                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                          {sg.startDate && <span>Started: {new Date(sg.startDate).toLocaleDateString()}</span>}
                          {sg.completedAt && <span className="text-green-500 font-medium">Completed: {new Date(sg.completedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expandedNotesId === record._id && record.notes && (
                <div className="mt-4 p-4 bg-accent/50 rounded-lg border border-border animate-in slide-in-from-top-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {goals.length === 0 && !isAdding && (
        <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground bg-card/50 backdrop-blur">
          No career goals set yet. Aim high!
        </div>
      )}
      </div>

      {showCelebration && (
        <ShootingStars />
      )}

      {importConflicts.length > 0 && currentConflictIndex < importConflicts.length && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-amber-500/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-amber-500">
                Conflict Detected ({currentConflictIndex + 1} of {importConflicts.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                The imported goal <strong>"{importConflicts[currentConflictIndex].imported.title}"</strong> is older than your current version in the app.
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

    </div>
  )
}
