import { useState, useEffect, useRef } from 'react'
import { Target, Search, ArrowDownUp, CheckSquare, Square, Star, Archive as ArchiveIcon, ArchiveRestore, Trash2, Edit2, ChevronDown, ListChecks, Download, Upload, MoreVertical } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { Habit } from '../../types'
import HabitsStatistics from '../../components/habits/HabitsStatistics'
import HabitFormModal from './HabitFormModal'

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

  const bulkAction = async (action: 'delete' | 'archive' | 'unarchive' | 'favorite') => {
    if (action === 'delete' && !confirm(`Delete ${selectedIds.size} habits?`)) return
    try {
      for (const id of selectedIds) {
        if (action === 'delete') {
          // @ts-ignore
          await window.api.db.remove('habits', { _id: id }, {})
          NotificationEngine.notify('info', 'Habit Deleted', 'The habit was permanently removed.', 'Habits')
        } else {
          const updateData = action === 'favorite' ? { isFavorite: true, updatedAt: Date.now() } 
                           : action === 'archive' ? { archived: true, updatedAt: Date.now() }
                           : { archived: false, updatedAt: Date.now() }
          // @ts-ignore
          await window.api.db.update('habits', { _id: id }, { $set: updateData }, {})
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this habit?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('habits', { _id: id }, {})
      NotificationEngine.notify('info', 'Habit Deleted', 'The habit was permanently removed.', 'Habits')
      loadData()
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
            <div key={record._id} className="bg-card/70 backdrop-blur-md border border-border p-6 rounded-2xl shadow-sm relative group hover:border-primary/50 transition-colors">
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
                  <button onClick={() => toggleFavorite(record._id!, !!record.isFavorite)} className={`p-1.5 bg-background border border-border rounded-md hover:bg-yellow-500/20 hover:text-yellow-500 hover:border-yellow-500/50 transition-colors ${record.isFavorite ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' : 'text-foreground'}`} title={record.isFavorite ? "Unfavorite" : "Favorite"}><Star size={16} className={record.isFavorite ? "fill-yellow-500" : ""}/></button>
                  <button onClick={() => toggleArchive(record._id!, !!record.archived)} className={`p-1.5 bg-background border border-border rounded-md hover:bg-gray-500/20 hover:text-gray-500 hover:border-gray-500/50 transition-colors ${record.archived ? 'text-gray-500 bg-gray-500/10 border-gray-500/30' : 'text-foreground'}`} title={record.archived ? "Unarchive" : "Archive"}><ArchiveIcon size={16}/></button>
                  <button onClick={() => openEdit(record)} className="p-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(record._id!)} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10" title="Delete"><Trash2 size={16}/></button>
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
      {showGlobalMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setShowGlobalMenu(false)}>
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
        </div>
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
      {importConflicts.length > 0 && currentConflictIndex < importConflicts.length && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        </div>
      )}

      <HabitFormModal 
        isOpen={formOpen} 
        onClose={() => setFormOpen(false)} 
        initialData={activeHabit || undefined}
        onSave={loadData}
        onDelete={handleDelete}
      />
    </div>
  )
}
