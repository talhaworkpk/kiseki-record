import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Target, Search, ArrowDownUp, CheckSquare, Square, Star, Archive as ArchiveIcon, ArchiveRestore, Trash2, Edit2, ChevronDown, ListChecks, Download, Upload, MoreVertical, BarChart2 } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { Habit } from '../../types'
import HabitsStatistics from '../../components/habits/HabitsStatistics'
import HabitFormModal from './HabitFormModal'
import HabitAnalyticsModal from './HabitAnalyticsModal'
export default function AllHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ scheduleType: 'all', isFavorite: false, isArchived: false })
  const [sortBy, setSortBy] = useState('newest')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null)

  // Edit Modal State
  const [formOpen, setFormOpen] = useState(false)
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null)
  
  // Analytics Modal State
  const [analyticsHabit, setAnalyticsHabit] = useState<Habit | null>(null)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [deleteTimeline, setDeleteTimeline] = useState(false)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)

  const [showGlobalMenu, setShowGlobalMenu] = useState(false)
  const [importConflicts, setImportConflicts] = useState<{imported: any, existing: Habit}[]>([])
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [pendingImports, setPendingImports] = useState<{toInsert: Habit[], toReplace: Habit[], importedRecords: any}>({ toInsert: [], toReplace: [], importedRecords: {} })

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('habits', {})
      setHabits(data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { loadData() }, [])

  // --- Export / Import ---
  const handleExportAll = async () => {
    try {
      // @ts-ignore
      const allHabits = await window.api.db.find('habits', {})
      // @ts-ignore
      const habitLogs = await window.api.db.find('habitLogs', {})
      // @ts-ignore
      const habitTimerSessions = await window.api.db.find('habitTimerSessions', {})
      // @ts-ignore
      const habitBreaks = await window.api.db.find('habitBreaks', {})
      // @ts-ignore
      const habitActivityLogs = await window.api.db.find('habitActivityLogs', {})
      
      const data = { 
        habits: allHabits, 
        records: {
          habitLogs,
          habitTimerSessions,
          habitBreaks,
          habitActivityLogs
        } 
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kiseki_habits_backup.json`
      a.click()
      URL.revokeObjectURL(url)
      NotificationEngine.notify('success', 'Export Complete', 'All habits and history have been exported successfully.', 'Habits')
    } catch (err) {
      console.error(err)
      NotificationEngine.notify('error', 'Export Failed', 'An error occurred while exporting habits.', 'Habits')
    }
  }

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const data = JSON.parse(text)
        
        if (!data.habits || !Array.isArray(data.habits)) {
          NotificationEngine.notify('error', 'Invalid File', 'The JSON file does not contain valid habits data.', 'Habits')
          return
        }

        const importedHabits = data.habits
        const importedRecords = data.records || {}
        
        const toInsert: Habit[] = []
        const toReplace: Habit[] = []
        const conflicts: {imported: any, existing: Habit}[] = []

        for (const imported of importedHabits) {
          const existing = habits.find(h => h._id === imported._id || h.title.toLowerCase() === imported.title.toLowerCase())
          
          if (!existing) {
            toInsert.push(imported)
          } else {
            const importedTime = imported.updatedAt || imported.createdAt || 0
            const existingTime = existing.updatedAt || existing.createdAt || 0
            
            if (importedTime > existingTime) {
              toReplace.push({...imported, _id: existing._id, _originalImportedId: imported._id})
            } else if (importedTime < existingTime) {
              conflicts.push({ imported: {...imported, _originalImportedId: imported._id}, existing })
            } else if (importedTime === 0 && existingTime === 0) {
              conflicts.push({ imported: {...imported, _originalImportedId: imported._id}, existing })
            }
          }
        }

        if (conflicts.length > 0) {
          setPendingImports({ toInsert, toReplace, importedRecords })
          setImportConflicts(conflicts)
          setCurrentConflictIndex(0)
        } else {
          await executeImports(toInsert, toReplace, importedRecords)
        }
      } catch (err) {
        console.error(err)
        NotificationEngine.notify('error', 'Import Failed', 'Failed to parse the file.', 'Habits')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const processConflict = async (action: 'replace' | 'skip' | 'replace_all' | 'skip_all') => {
    const { toInsert, toReplace, importedRecords } = pendingImports
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
        setPendingImports({ toInsert, toReplace, importedRecords })
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

    await executeImports(toInsert, toReplace, importedRecords)
  }

  const executeImports = async (toInsert: Habit[], toReplace: any[], importedRecords: any) => {
    try {
      let importedCount = 0
      let updatedCount = 0
      const idMap = new Map<string, string>()

      for (const habit of toInsert) {
        const oldId = habit._id
        const { _id, ...habitData } = habit
        // @ts-ignore
        const newHabit = await window.api.db.insert('habits', habitData)
        
        import('../../lib/AchievementEngine').then(({ AchievementEngine }) => {
          AchievementEngine.evaluateHabit(newHabit._id)
        })

        if (oldId && newHabit._id) idMap.set(oldId, newHabit._id)
        importedCount++
      }

      for (const habit of toReplace) {
        const { _id, _originalImportedId, ...habitData } = habit
        if (_originalImportedId && _originalImportedId !== _id) {
          idMap.set(_originalImportedId, _id)
        }
        // @ts-ignore
        await window.api.db.update('habits', { _id }, { $set: habitData }, {})
        updatedCount++
      }

      // Process related collections
      const processSubRecords = async (collectionName: string) => {
        const recordsArr = importedRecords[collectionName]
        if (!recordsArr || !Array.isArray(recordsArr)) return
        
        // @ts-ignore
        const existingRecords = await window.api.db.find(collectionName, {})
        
        for (const record of recordsArr) {
          // Remap habitId if it was changed
          if (record.habitId && idMap.has(record.habitId)) {
            record.habitId = idMap.get(record.habitId)
          }
          
          const existing = existingRecords.find((r: any) => r._id === record._id)
          if (!existing) {
            // @ts-ignore
            await window.api.db.insert(collectionName, record)
          } else {
            const impTime = record.updatedAt || record.createdAt || record.timestamp || record.completionTime || record.startTime || 0
            const exTime = existing.updatedAt || existing.createdAt || existing.timestamp || existing.completionTime || existing.startTime || 0
            const belongsToReplacedHabit = toReplace.some(h => h._id === record.habitId || h._originalImportedId === record.habitId)
            
            if (impTime > exTime || belongsToReplacedHabit) {
              const { _id, ...recordData } = record
              // @ts-ignore
              await window.api.db.update(collectionName, { _id }, { $set: recordData }, {})
            }
          }
        }
      }

      await processSubRecords('habitLogs')
      await processSubRecords('habitTimerSessions')
      await processSubRecords('habitBreaks')
      await processSubRecords('habitActivityLogs')

      NotificationEngine.notify('success', 'Import Complete', `Imported ${importedCount} and updated ${updatedCount} habits.`, 'Habits')
      loadData()
    } catch (err) {
      console.error(err)
      NotificationEngine.notify('error', 'Import Failed', 'Failed to process imported habits.', 'Habits')
    }
  }

  const filteredHabits = habits.filter(h => {
    if (filters.scheduleType !== 'all' && h.scheduleType !== filters.scheduleType) return false
    if (filters.isFavorite && !h.isFavorite) return false
    if (filters.isArchived && !h.archived) return false
    if (!filters.isArchived && h.archived) return false
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!h.title.toLowerCase().includes(q) && !(h.notes && h.notes.toLowerCase().includes(q))) return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0)
    if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0)
    if (sortBy === 'alpha') return a.title.localeCompare(b.title)
    return 0
  })

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        // Get the habit title before deleting
        // @ts-ignore
        const habitToDel = await window.api.db.find('habits', { _id: id })
        const hTitle = habitToDel?.[0]?.title || 'Deleted Habit'

        // @ts-ignore
        await window.api.db.remove('habits', { _id: id }, {})
        
        if (deleteTimeline) {
          // @ts-ignore
          await window.api.db.remove('habitLogs', { habitId: id }, { multi: true })
          // @ts-ignore
          await window.api.db.remove('habitActivityLogs', { habitId: id }, { multi: true })
          // @ts-ignore
          await window.api.db.remove('habitBreaks', { habitId: id }, { multi: true })
          // @ts-ignore
          await window.api.db.remove('habitTimerSessions', { habitId: id }, { multi: true })
        } else {
          // @ts-ignore
          await window.api.db.update('habitLogs', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
          // @ts-ignore
          await window.api.db.update('habitActivityLogs', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
          // @ts-ignore
          await window.api.db.update('habitBreaks', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
          // @ts-ignore
          await window.api.db.update('habitTimerSessions', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
        }
      }
      NotificationEngine.notify('info', 'Habits Deleted', `Deleted ${selectedIds.size} habits ${deleteTimeline ? 'with timeline data' : 'but kept timeline data'}.`, 'Habits')
      setSelectedIds(new Set())
      setIsSelectionMode(false)
      loadData()
      
      setShowBulkDeleteModal(false)
      setDeleteTimeline(false)
      
      setShowDeleteSuccess(true)
      setTimeout(() => setShowDeleteSuccess(false), 2500)
    } catch (err) { console.error(err) }
  }

  const bulkAction = async (action: 'delete' | 'archive' | 'unarchive' | 'favorite') => {
    if (action === 'delete') {
      setShowBulkDeleteModal(true)
      return
    }

    try {
      for (const id of selectedIds) {
        const updateData = action === 'favorite' ? { isFavorite: true, updatedAt: Date.now() } 
                         : action === 'archive' ? { archived: true, updatedAt: Date.now() }
                         : { archived: false, updatedAt: Date.now() }
        // @ts-ignore
        await window.api.db.update('habits', { _id: id }, { $set: updateData }, {})
      }
      setSelectedIds(new Set())
      loadData()
    } catch (err) { console.error(err) }
  }

  const toggleFavorite = async (id: string, current: boolean) => {
    try {
      // @ts-ignore
      await window.api.db.update('habits', { _id: id }, { $set: { isFavorite: !current, updatedAt: Date.now() } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  const toggleArchive = async (id: string, current: boolean) => {
    try {
      // @ts-ignore
      await window.api.db.update('habits', { _id: id }, { $set: { archived: !current, updatedAt: Date.now() } }, {})
      loadData()
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    if (!deleteConfirmId && !showBulkDeleteModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteConfirmId(null)
        setShowBulkDeleteModal(false)
        setDeleteTimeline(false)
      } else if (e.key === 'Enter') {
        if (showBulkDeleteModal) {
          confirmBulkDelete()
        } else if (deleteConfirmId) {
          confirmDelete()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const handleDelete = async (id: string, mode?: 'archive' | 'delete', flag?: boolean) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    try {
      // Get the habit title before deleting
      // @ts-ignore
      const habitToDel = await window.api.db.find('habits', { _id: id })
      const hTitle = habitToDel?.[0]?.title || 'Deleted Habit'

      // @ts-ignore
      await window.api.db.remove('habits', { _id: id }, {})
      
      if (deleteTimeline) {
        // @ts-ignore
        await window.api.db.remove('habitLogs', { habitId: id }, { multi: true })
        // @ts-ignore
        await window.api.db.remove('habitActivityLogs', { habitId: id }, { multi: true })
        // @ts-ignore
        await window.api.db.remove('habitBreaks', { habitId: id }, { multi: true })
        // @ts-ignore
        await window.api.db.remove('habitTimerSessions', { habitId: id }, { multi: true })
        NotificationEngine.notify('warning', 'Habit Deleted', 'The habit and its timeline logs were removed.', 'Habits')
      } else {
        // @ts-ignore
        await window.api.db.update('habitLogs', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
        // @ts-ignore
        await window.api.db.update('habitActivityLogs', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
        // @ts-ignore
        await window.api.db.update('habitBreaks', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
        // @ts-ignore
        await window.api.db.update('habitTimerSessions', { habitId: id }, { $set: { habitTitle: hTitle } }, { multi: true })
        
        NotificationEngine.notify('info', 'Habit Deleted', 'The habit was permanently deleted.', 'Habits')
      }
      
      setDeleteConfirmId(null)
      setDeleteTimeline(false)
      loadData()
      
      setShowDeleteSuccess(true)
      setTimeout(() => setShowDeleteSuccess(false), 2500)
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: Habit) => {
    setActiveHabit(record)
    setFormOpen(true)
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
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden text-foreground">
      
      {/* Top Toolbar */}
      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur z-20 flex flex-wrap gap-2 items-center justify-between shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="text-primary" size={20} /> All Habits
          </h1>
          
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search habits..."
              className="pl-9 pr-4 py-1.5 w-64 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-border rounded-xl bg-background overflow-hidden">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><ArrowDownUp size={14} className="text-muted-foreground"/></div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
          
          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${isSelectionMode ? 'bg-primary text-primary-foreground shadow-md' : 'bg-background border border-border hover:bg-accent text-foreground'}`}
          >
            {isSelectionMode ? <CheckSquare size={16}/> : <Square size={16}/>}
            Select
          </button>

          <button onClick={() => setShowGlobalMenu(true)} className="p-2 bg-background border border-border rounded-xl hover:bg-accent"><MoreVertical size={16}/></button>
        </div>
      </div>

      {/* Selection Toolbar */}
      {isSelectionMode && (
        <div className="px-6 py-3 bg-accent/50 border-b border-border flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold">{selectedIds.size} selected</span>
            <button 
              onClick={() => {
                if (selectedIds.size === filteredHabits.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(filteredHabits.map(r => r._id!)))
              }} 
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              <CheckSquare size={14}/> {selectedIds.size === filteredHabits.length && filteredHabits.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => bulkAction('favorite')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><Star size={14}/> Favorite</button>
            {!filters.isArchived && <button onClick={() => bulkAction('archive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveIcon size={14}/> Archive</button>}
            {filters.isArchived && <button onClick={() => bulkAction('unarchive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50"><ArchiveRestore size={14}/> Unarchive</button>}
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
        <HabitsStatistics habits={habits} setFilters={setFilters} />

        <div className="space-y-4">
          {filteredHabits.map(record => (
            <div 
              key={record._id} 
              onClick={() => {
                if (isSelectionMode) {
                  const s = new Set(selectedIds)
                  if (s.has(record._id!)) s.delete(record._id!)
                  else s.add(record._id!)
                  setSelectedIds(s)
                }
              }}
              className={`bg-card/70 backdrop-blur-md border p-6 rounded-2xl shadow-sm relative group transition-colors ${selectedIds.has(record._id!) ? 'border-primary ring-2 ring-primary/50' : 'border-border hover:border-primary/50'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start gap-4">
                {isSelectionMode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      const s = new Set(selectedIds)
                      if (s.has(record._id!)) s.delete(record._id!)
                      else s.add(record._id!)
                      setSelectedIds(s)
                    }}
                    className="mt-1 flex-shrink-0"
                  >
                    {selectedIds.has(record._id!) ? <CheckSquare size={20} className="text-primary"/> : <Square size={20} className="text-muted-foreground"/>}
                  </button>
                )}
                
                <div className="flex-1 min-w-0 pr-32">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-2xl">{record.icon === 'Sparkles' ? '✨' : record.icon}</span>
                    {record.description ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h3 className="text-lg font-bold truncate cursor-help">{record.title}</h3>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-center font-medium">
                          {record.description}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <h3 className="text-lg font-bold truncate">{record.title}</h3>
                    )}
                    
                    {record.isFavorite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                    {record.archived && <ArchiveIcon size={14} className="text-gray-500" />}
                    
                    <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-accent rounded-full">
                      {record.category}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Schedule: {record.scheduleType}
                    </span>
                  </div>
                  
                  {record.notes && (
                    <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {record.notes}
                    </div>
                  )}
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setAnalyticsHabit(record) }} className="p-1.5 bg-background border border-border rounded-md hover:bg-primary/20 hover:text-primary transition-colors text-foreground" title="View habit analytics"><BarChart2 size={16}/></button>
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(record._id!, !!record.isFavorite) }} className={`p-1.5 bg-background border border-border rounded-md hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 transition-colors ${record.isFavorite ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-foreground'}`} title={record.isFavorite ? "Unfavorite" : "Favorite"}><Star size={16} className={record.isFavorite ? "fill-yellow-500" : ""}/></button>
                  <button onClick={(e) => { e.stopPropagation(); toggleArchive(record._id!, !!record.archived) }} className={`p-1.5 bg-background border border-border rounded-md hover:bg-gray-500/20 hover:text-gray-500 hover:border-gray-500/50 transition-colors ${record.archived ? 'text-gray-500 bg-gray-500/10 border-gray-500/30' : 'text-foreground'}`} title={record.archived ? "Unarchive" : "Archive"}><ArchiveIcon size={16}/></button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(record) }} className="p-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={16}/></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(record._id!) }} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10" title="Delete"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {filteredHabits.length === 0 && (
            <div className="text-center p-8 border border-dashed border-border rounded-2xl text-muted-foreground bg-accent/10">
              No habits found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* Global Menu Modal */}
      {showGlobalMenu && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setShowGlobalMenu(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center bg-accent/30">
              <h3 className="font-bold">Habits Options</h3>
            </div>
            <div className="p-2">
              <button onClick={() => { document.getElementById('import-habits-input')?.click(); setShowGlobalMenu(false) }} className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-xl transition-colors text-left font-medium">
                <Upload size={18} className="text-primary"/> Import Habits
              </button>
              <button onClick={() => { handleExportAll(); setShowGlobalMenu(false) }} className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-xl transition-colors text-left font-medium">
                <Download size={18} className="text-primary"/> Export All Habits
              </button>
            </div>
            <div className="p-4 bg-accent/30 border-t border-border">
              <button onClick={() => setShowGlobalMenu(false)} className="w-full py-2 bg-background border border-border hover:bg-accent rounded-xl font-bold transition-colors">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        id="import-habits-input" 
        accept=".json" 
        className="hidden" 
        onChange={processImportFile} 
      />

      {/* Conflict Resolution Modal */}
      {importConflicts.length > 0 && currentConflictIndex < importConflicts.length && createPortal(
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-amber-500/10">
              <h2 className="text-xl font-bold flex items-center gap-2 text-amber-500">
                Conflict Detected ({currentConflictIndex + 1} of {importConflicts.length})
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                The imported habit <strong>"{importConflicts[currentConflictIndex].imported.title}"</strong> is older than your current version in the app.
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Note: Skipping will keep your current habit and discard imported logs. Replacing will overwrite your habit and update all of its daily logs, timers, and breaks.
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
                <button onClick={() => processConflict('replace')} className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-sm shadow-red-500/20">Replace</button>
                <button onClick={() => processConflict('skip')} className="w-full px-4 py-3 bg-background border border-border hover:bg-accent font-bold rounded-xl transition-colors">Skip</button>
              </div>
              
              {importConflicts.length > 1 && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={() => processConflict('replace_all')} className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors">Replace All</button>
                  <button onClick={() => processConflict('skip_all')} className="w-full px-4 py-2 bg-background border border-border hover:bg-accent font-bold rounded-xl transition-colors text-muted-foreground">Skip All</button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <HabitFormModal 
        isOpen={formOpen} 
        onClose={() => setFormOpen(false)} 
        initialData={activeHabit || undefined}
        onSave={loadData}
        onDelete={handleDelete}
      />

      {analyticsHabit && (
        <HabitAnalyticsModal 
          habit={analyticsHabit} 
          onClose={() => setAnalyticsHabit(null)} 
        />
      )}

      {deleteConfirmId && !showDeleteSuccess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground p-0 rounded-2xl shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] border border-destructive/20 w-full max-w-md flex flex-col overflow-hidden scale-in-center animate-in zoom-in-95 duration-300">
            <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-center border-b border-destructive/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-transparent"></div>
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner mb-4 relative z-10 border border-destructive/20">
                <Trash2 size={32} className="text-destructive drop-shadow-md animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground relative z-10">Delete Habit?</h3>
            </div>
            
            <div className="p-6">
              <p className="text-center text-muted-foreground mb-4">
                You are about to permanently delete this habit.
              </p>
              
              <label className="bg-accent/50 p-4 rounded-lg border border-border flex items-start gap-3 cursor-pointer hover:bg-accent transition-colors mb-6">
                <input 
                  type="checkbox" 
                  checked={deleteTimeline}
                  onChange={(e) => setDeleteTimeline(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border text-destructive focus:ring-destructive" 
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Delete timeline data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Also remove all completion history, timer sessions, streaks, and analytics for this habit.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 mt-2">
                <button 
                  onClick={() => { setDeleteConfirmId(null); setDeleteTimeline(false); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-destructive text-white shadow-lg shadow-destructive/30 hover:shadow-destructive/50 hover:from-red-500 hover:to-red-600 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Habit
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showBulkDeleteModal && !showDeleteSuccess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground p-0 rounded-2xl shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] border border-destructive/20 w-full max-w-md flex flex-col overflow-hidden scale-in-center animate-in zoom-in-95 duration-300">
            <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-center border-b border-destructive/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-transparent"></div>
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner mb-4 relative z-10 border border-destructive/20">
                <Trash2 size={32} className="text-destructive drop-shadow-md animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground relative z-10">Delete {selectedIds.size} Habits?</h3>
            </div>
            
            <div className="p-6">
              <p className="text-center text-muted-foreground mb-4">
                You are about to permanently delete {selectedIds.size} habits.
              </p>
              
              <label className="bg-accent/50 p-4 rounded-lg border border-border flex items-start gap-3 cursor-pointer hover:bg-accent transition-colors mb-6">
                <input 
                  type="checkbox" 
                  checked={deleteTimeline}
                  onChange={(e) => setDeleteTimeline(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border text-destructive focus:ring-destructive" 
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Delete timeline data</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Also remove all completion history, timer sessions, streaks, and analytics for these habits.
                  </p>
                </div>
              </label>

              <div className="flex justify-end gap-3 mt-2">
                <button 
                  onClick={() => { setShowBulkDeleteModal(false); setDeleteTimeline(false); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmBulkDelete}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-destructive text-white shadow-lg shadow-destructive/30 hover:shadow-destructive/50 hover:from-red-500 hover:to-red-600 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showDeleteSuccess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
          <style>{`
            @keyframes habit-shatter {
              0% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 20px rgba(239,68,68,0.8)); }
              20% { transform: scale(1.2) rotate(-5deg); filter: drop-shadow(0 0 40px rgba(239,68,68,1)); }
              40% { transform: scale(0.9) rotate(5deg); opacity: 1; }
              100% { transform: scale(2) rotate(20deg) translateY(-50px); opacity: 0; filter: blur(10px); }
            }
            @keyframes chain-break-left {
              0% { transform: translate(0, 0) rotate(0); opacity: 1; }
              100% { transform: translate(-100px, 50px) rotate(-45deg); opacity: 0; }
            }
            @keyframes chain-break-right {
              0% { transform: translate(0, 0) rotate(0); opacity: 1; }
              100% { transform: translate(100px, -50px) rotate(45deg); opacity: 0; }
            }
            @keyframes pulse-red {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.5); opacity: 0.2; }
            }
            @keyframes flash {
              0% { opacity: 0; transform: scale(0.5); }
              20% { opacity: 1; transform: scale(1.5); filter: drop-shadow(0 0 20px #facc15); }
              100% { opacity: 0; transform: scale(1); }
            }
          `}</style>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-96 h-96 bg-red-600/30 rounded-full blur-[100px] animate-[pulse-red_2s_ease-in-out_infinite]" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-40 h-40 flex items-center justify-center mb-8" style={{ animation: 'habit-shatter 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}>
              <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'chain-break-left 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s forwards' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] opacity-80" style={{ clipPath: 'polygon(0 0, 50% 0, 30% 100%, 0 100%)' }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'chain-break-right 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.4s forwards' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-24 h-24 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 30% 100%)' }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              
              <svg viewBox="0 0 24 24" fill="currentColor" className="absolute w-16 h-16 text-yellow-400 z-10" style={{ animation: 'flash 0.5s ease-out 0.3s forwards', opacity: 0 }}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-600 tracking-widest uppercase drop-shadow-[0_5px_15px_rgba(239,68,68,0.4)] animate-in slide-in-from-bottom-10 fade-in duration-700" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              Habit Broken
            </h2>
            <p className="mt-4 text-red-200/60 text-lg tracking-widest uppercase font-medium animate-in slide-in-from-bottom-5 fade-in duration-700" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              The cycle ends here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
