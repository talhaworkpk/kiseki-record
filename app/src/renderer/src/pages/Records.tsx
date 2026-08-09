import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { RecordItem, Person } from '../types'
import { Search, LayoutGrid, List, Filter, FileText, CheckSquare, Square, Trash2, Download, Copy, Archive, ArrowDownUp, X, ArchiveRestore } from 'lucide-react'
import TipTapEditor from '../components/ResumeEditor/TipTapEditor'
import { NotificationEngine } from '../lib/NotificationEngine'

// Subcomponents
import RecordCard from '../components/records/RecordCard'
import RecordPreviewModal from '../components/records/RecordPreviewModal'
import RecordsStatistics from '../components/records/RecordsStatistics'
import RecordFilterDrawer, { RecordFilters } from '../components/records/RecordFilterDrawer'
import { normalizeUrl } from '../lib/utils'
import { Paperclip, ImagePlus } from 'lucide-react'

export default function Records() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [relationships, setRelationships] = useState<Person[]>([])
  
  // View & UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'updated' | 'alpha' | 'mood' | 'type'>('newest')
  
  // Modals / Drawers
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState<RecordFilters>({
    type: 'all', mood: '', hasImages: false, hasAttachments: false, isFavorite: false, isArchived: false, dateRange: 'all'
  })
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [editForm, setEditForm] = useState<Partial<RecordItem>>({})
  const [tagsText, setTagsText] = useState('')
  
  // Preview State
  const [previewRecord, setPreviewRecord] = useState<RecordItem | null>(null)

  // Scroll State
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const fetchRecords = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('records', {})
      setRecords(data)
      // @ts-ignore
      const relData = await window.api.db.find('relationships', {})
      setRelationships(relData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && records.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`record-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, records.length])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or contenteditable
      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') {
        if (isSelectionMode) {
          setIsSelectionMode(false)
          setSelectedIds(new Set())
        }
      }
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault()
        if (!isSelectionMode) setIsSelectionMode(true)
        if (selectedIds.size === filteredRecords.length && filteredRecords.length > 0) {
          setSelectedIds(new Set())
        } else {
          setSelectedIds(new Set(filteredRecords.map(r => r._id!)))
        }
      }
      if (e.key === 'Delete' && selectedIds.size > 0) {
        bulkAction('delete')
      }
      if (e.ctrlKey && e.key === 'e' && selectedIds.size > 0) {
        e.preventDefault()
        bulkAction('export')
      }
      if (e.ctrlKey && e.key === 'd' && selectedIds.size > 0) {
        e.preventDefault()
        bulkAction('duplicate')
      }
      
      // Page Scrolling with Arrows
      if (!isFilterOpen && !isEditing && !previewRecord) {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (scrollRef.current) scrollRef.current.scrollTop -= 60
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (scrollRef.current) scrollRef.current.scrollTop += 60
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // Mouse Drag to Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      if (!scrollRef.current) return
      e.preventDefault()
      setIsDragging(true)
      setStartY(e.pageY - scrollRef.current.offsetTop)
      setScrollTop(scrollRef.current.scrollTop)
    }
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const y = e.pageY - scrollRef.current.offsetTop
    const walk = (y - startY) * 1.5
    scrollRef.current.scrollTop = scrollTop - walk
  }

  // Filtering & Sorting Logic
  const filteredRecords = useMemo(() => {
    let result = records

    // 1. Trash/Archive filter
    result = result.filter(r => filters.isArchived ? r.isArchived || !!r.deletedAt : !r.isArchived && !r.deletedAt)

    // 2. Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => 
        r.title.toLowerCase().includes(q) || 
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
        (r.mood && r.mood.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        r.type.toLowerCase().includes(q)
      )
    }

    // 3. Advanced Filters
    if (filters.type !== 'all') result = result.filter(r => r.type === filters.type)
    if (filters.mood) result = result.filter(r => r.mood?.toLowerCase().includes(filters.mood.toLowerCase()))
    if (filters.isFavorite) result = result.filter(r => r.isFavorite)
    if (filters.hasAttachments) result = result.filter(r => r.attachments && r.attachments.length > 0)
    if (filters.hasImages) result = result.filter(r => r.attachments && r.attachments.some(a => a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)))
    
    if (filters.dateRange !== 'all') {
      const now = Date.now()
      const d = 86400000
      result = result.filter(r => {
        const rc = r.createdAt
        if (filters.dateRange === 'today') return now - rc < d
        if (filters.dateRange === 'week') return now - rc < 7 * d
        if (filters.dateRange === 'month') return now - rc < 30 * d
        if (filters.dateRange === 'year') return now - rc < 365 * d
        return true
      })
    }

    // 4. Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.createdAt - a.createdAt
        case 'oldest': return a.createdAt - b.createdAt
        case 'updated': return b.updatedAt - a.updatedAt
        case 'alpha': return a.title.localeCompare(b.title)
        case 'mood': return (a.mood || '').localeCompare(b.mood || '')
        case 'type': return a.type.localeCompare(b.type)
        default: return 0
      }
    })

    return result
  }, [records, searchQuery, filters, sortBy])


  // Handlers
  const handleAction = async (action: string, record: RecordItem) => {
    try {
      if (action === 'preview') {
        // Increment views
        // @ts-ignore
        await window.api.db.update('records', { _id: record._id }, { $inc: { views: 1 } })
        fetchRecords()
        setPreviewRecord({...record, views: (record.views || 0) + 1})
      }
      if (action === 'edit') {
        setEditForm(record)
        setTagsText(record.tags?.join(', ') || '')
        setIsEditing(true)
      }
      if (action === 'favorite') {
        // @ts-ignore
        await window.api.db.update('records', { _id: record._id }, { $set: { isFavorite: !record.isFavorite } })
        fetchRecords()
        if (previewRecord && previewRecord._id === record._id) {
          setPreviewRecord({...previewRecord, isFavorite: !record.isFavorite} as RecordItem)
        }
      }
      if (action === 'archive') {
        // @ts-ignore
        await window.api.db.update('records', { _id: record._id }, { $set: { isArchived: true } })
        fetchRecords()
      }
      if (action === 'unarchive') {
        // @ts-ignore
        await window.api.db.update('records', { _id: record._id }, { $set: { isArchived: false } })
        fetchRecords()
      }
      if (action === 'delete') {
        if (filters.isArchived || record.deletedAt) {
          if(confirm('Permanently delete?')) {
            // @ts-ignore
            await window.api.db.remove('records', { _id: record._id })
            NotificationEngine.notify('warning', 'Record Deleted', `"${record.title}" was permanently deleted.`, 'Records')
          }
        } else {
          // Soft delete
          // @ts-ignore
          await window.api.db.update('records', { _id: record._id }, { $set: { deletedAt: Date.now() } })
          NotificationEngine.notify('info', 'Record Trashed', `"${record.title}" moved to trash.`, 'Records')
        }
        if (previewRecord?._id === record._id) setPreviewRecord(null)
        fetchRecords()
      }
      if (action === 'duplicate') {
        const copy = { ...record, title: `${record.title} (Copy)`, createdAt: Date.now(), updatedAt: Date.now(), views: 0 }
        delete copy._id
        // @ts-ignore
        await window.api.db.insert('records', copy)
        fetchRecords()
      }
      if (action === 'export') {
        const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `record-${record.title}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const bulkAction = async (action: string) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      if (action === 'delete') {
        if (!confirm(`Delete ${ids.length} records?`)) return
        for (const id of ids) {
          if (filters.isArchived) {
            // @ts-ignore
            await window.api.db.remove('records', { _id: id })
          } else {
            // @ts-ignore
            await window.api.db.update('records', { _id: id }, { $set: { deletedAt: Date.now() } })
          }
          NotificationEngine.notify('info', 'Records Trashed', `${selectedIds.size} records moved to trash.`, 'Records')
        }
      }
      if (action === 'archive') {
        for (const id of ids) {
          // @ts-ignore
          await window.api.db.update('records', { _id: id }, { $set: { isArchived: true } })
        }
      }
      if (action === 'unarchive') {
        for (const id of ids) {
          // @ts-ignore
          await window.api.db.update('records', { _id: id }, { $set: { isArchived: false } })
        }
      }
      if (action === 'export') {
        const selectedRecs = records.filter(r => r._id && selectedIds.has(r._id))
        const blob = new Blob([JSON.stringify(selectedRecs, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kiseki-records-export.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      if (action === 'duplicate') {
        const selectedRecs = records.filter(r => r._id && selectedIds.has(r._id))
        for (const r of selectedRecs) {
          const copy = { ...r, title: `${r.title} (Copy)`, createdAt: Date.now(), updatedAt: Date.now(), views: 0 }
          delete copy._id
          // @ts-ignore
          await window.api.db.insert('records', copy)
        }
      }
      
      setSelectedIds(new Set())
      if(action !== 'export') {
        fetchRecords()
        if (action === 'delete') NotificationEngine.notify('info', 'Records Deleted', 'Selected records were removed.', 'Records')
        if (action === 'duplicate') NotificationEngine.notify('success', 'Records Duplicated', 'Selected records were duplicated.', 'Records')
      }
    } catch(err) {
      console.error(err)
    }
  }

  // Modal navigation
  const handleNav = (dir: 1 | -1) => {
    if (!previewRecord) return
    const idx = filteredRecords.findIndex(r => r._id === previewRecord._id)
    if (idx !== -1) {
      const next = filteredRecords[idx + dir]
      if (next) handleAction('preview', next)
    }
  }

  // Editor form attach
  const handleAttach = async (options?: any) => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add(options)
      if (result.success && result.files && result.files.length > 0) {
        setEditForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), result.files[0].filePath] }))
      }
    } catch (err) { console.error(err) }
  }

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.title) return
    const now = Date.now()
    try {
      if (editForm._id) {
        const toUpdate = { ...editForm, updatedAt: now }
        delete toUpdate._id
        // @ts-ignore
        await window.api.db.update('records', { _id: editForm._id }, { $set: toUpdate })
        NotificationEngine.notify('info', 'Record Updated', `"${toUpdate.title}" was updated.`, 'Records')
      } else {
        const newRecord: RecordItem = {
          title: editForm.title || '',
          description: editForm.description || '',
          date: editForm.date || new Date().toISOString(),
          type: editForm.type || 'Memory',
          tags: editForm.tags || [],
          importance: editForm.importance || 1,
          privacyLevel: editForm.privacyLevel || 'private',
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          isArchived: false,
          attachments: editForm.attachments || [],
          mood: editForm.mood || '',
          location: editForm.location || '',
          views: 0
        }
        // @ts-ignore
        await window.api.db.insert('records', newRecord)
        NotificationEngine.notify('success', 'Record Created', `"${newRecord.title}" was successfully saved.`, 'Records')
        NotificationEngine.checkAchievements()
        fetchRecords()
        
        setShowSuccessOverlay(true)
        setTimeout(() => {
          setShowSuccessOverlay(false)
          setIsEditing(false)
          setEditForm({})
        }, 3000)
        return
      }
      setIsEditing(false)
      setEditForm({})
      fetchRecords()
    } catch (err) { 
      console.error(err) 
      NotificationEngine.notify('error', 'Error Saving Record', 'There was a problem saving your record.', 'Records')
    }
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative overflow-hidden">
      
      {/* 3D Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] opacity-70 animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/20 blur-[120px] opacity-70 animate-[pulse_12s_ease-in-out_infinite_reverse]" />
        <div className="absolute -bottom-[20%] left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] opacity-70 animate-[pulse_10s_ease-in-out_infinite]" />
      </div>
      
      {/* Top Toolbar */}
      <div className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur z-20 flex flex-wrap gap-2 items-center justify-between shrink-0 sticky top-0">
        
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-primary" size={20} /> Records
          </h1>
          
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title, desc, tags..."
              title="Search records by title, description, tags, people, location, or mood"
              className="pl-9 pr-4 py-1.5 w-64 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-shadow"
            />
          </div>
          
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-medium hover:bg-accent transition-colors"
            title="Filter records"
          >
            <Filter size={14}/> Filters
            {(filters.isArchived || filters.isFavorite || filters.hasImages || filters.type !== 'all' || filters.dateRange !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-primary ml-1"></span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          
          <div className="flex border border-border rounded-xl bg-background overflow-hidden" title="Sort records">
            <div className="flex items-center px-2 border-r border-border bg-accent/30"><ArrowDownUp size={14} className="text-muted-foreground"/></div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
              <option value="alpha">Alphabetical</option>
              <option value="mood">By Mood</option>
              <option value="type">By Type</option>
            </select>
          </div>

          <div className="flex border border-border rounded-xl bg-background overflow-hidden" title="Toggle Layout">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`} title="Grid View"><LayoutGrid size={16}/></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'}`} title="List View"><List size={16}/></button>
          </div>
          
          <button 
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${isSelectionMode ? 'bg-primary text-primary-foreground shadow-md' : 'bg-background border border-border hover:bg-accent text-foreground'}`}
            title="Enable multi-selection mode"
          >
            {isSelectionMode ? <CheckSquare size={16}/> : <Square size={16}/>}
            Select
          </button>

          <button 
            onClick={() => { setEditForm({}); setTagsText(''); setIsEditing(true) }}
            className="px-5 py-1.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            title="Create a new record"
          >
            + New Record
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Toolbar */}
      <div className={`relative z-10 overflow-hidden transition-all duration-300 ease-in-out ${isSelectionMode ? 'max-h-16 opacity-100 border-b border-border bg-accent/50' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm bg-background px-3 py-1 rounded-lg border border-border shadow-sm">{selectedIds.size} Selected</span>
            
            <button 
              onClick={() => {
                if (selectedIds.size === filteredRecords.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(filteredRecords.map(r => r._id!)))
              }} 
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
              title="Select every visible record (Ctrl+A)"
            >
              <CheckSquare size={14}/> {selectedIds.size === filteredRecords.length && filteredRecords.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => bulkAction('export')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50" title="Export Selected (Ctrl+E)"><Download size={14}/> Export</button>
            <button onClick={() => bulkAction('duplicate')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50" title="Duplicate Selected (Ctrl+D)"><Copy size={14}/> Duplicate</button>
            {!filters.isArchived && <button onClick={() => bulkAction('archive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50" title="Archive Selected"><Archive size={14}/> Archive</button>}
            {filters.isArchived && <button onClick={() => bulkAction('unarchive')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-bold hover:bg-card disabled:opacity-50" title="Unarchive Selected"><ArchiveRestore size={14}/> Unarchive</button>}
            <button onClick={() => bulkAction('delete')} disabled={selectedIds.size===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 disabled:opacity-50" title="Delete Selected (Del)"><Trash2 size={14}/> Delete</button>
            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()) }} className="ml-2 text-muted-foreground hover:text-foreground text-sm font-bold" title="Exit Selection Mode (Esc)">Cancel</button>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        className={`flex-1 overflow-y-auto p-6 relative z-10 scrollbar-custom ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      >
        {/* Statistics Bar */}
        {!loading && records.length > 0 && !isSelectionMode && (
          <RecordsStatistics records={records} setFilters={setFilters} />
        )}

        {/* Records Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center h-[50vh] text-primary animate-pulse font-bold">Loading...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center max-w-sm mx-auto">
            <FileText size={64} className="mb-4 text-muted-foreground/30" />
            <h2 className="text-2xl font-black mb-2">No Records Found</h2>
            <p className="text-muted-foreground mb-6">Your search or filter criteria didn't match any records. Try clearing filters or create a new record.</p>
            <button onClick={() => { setEditForm({}); setTagsText(''); setIsEditing(true) }} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">Create New Record</button>
          </div>
        ) : (
          <div className={`gap-6 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'flex flex-col'}`}>
            {filteredRecords.map(record => (
              <div key={record._id} id={`record-${record._id}`} className="transition-all duration-1000 rounded-2xl">
                <RecordCard 
                  record={record}
                  viewMode={viewMode}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.has(record._id!)}
                  onToggleSelect={() => {
                    const s = new Set(selectedIds)
                    if (s.has(record._id!)) s.delete(record._id!)
                    else s.add(record._id!)
                    setSelectedIds(s)
                  }}
                  onAction={handleAction}
                  relationships={relationships}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <RecordPreviewModal 
        record={previewRecord}
        isOpen={!!previewRecord}
        onClose={() => setPreviewRecord(null)}
        onPrevious={() => handleNav(-1)}
        onNext={() => handleNav(1)}
        onAction={handleAction}
      />

      <RecordFilterDrawer 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onClear={() => setFilters({ type: 'all', mood: '', hasImages: false, hasAttachments: false, isFavorite: false, isArchived: false, dateRange: 'all' })}
      />

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          {showSuccessOverlay ? (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
              <style>{`
                @keyframes popAndFloatBook {
                  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                  40% { transform: scale(1.1) rotate(5deg); opacity: 1; }
                  60% { transform: scale(0.95) rotate(-2deg); }
                  80% { transform: scale(1.05) rotate(2deg); }
                  100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes floatUpFade {
                  0% { transform: translate(0, 0) scale(0); opacity: 0; }
                  20% { opacity: 1; scale: 1; }
                  100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
                }
                @keyframes flipPage {
                  0% { transform: rotateY(0deg) skewY(0deg); }
                  50% { transform: rotateY(-90deg) skewY(-10deg); opacity: 0.8; }
                  100% { transform: rotateY(-180deg) skewY(0deg); opacity: 0; }
                }
              `}</style>
              <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndFloatBook 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
                {/* 3D Book SVG */}
                <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                  {/* Back Cover / Shadow */}
                  <path d="M 40 50 L 120 20 L 200 50 L 200 180 L 120 210 L 40 180 Z" fill="#0891b2" opacity="0.4" transform="translate(10, 15) rotate(-5 120 120)" />
                  <path d="M 40 50 L 120 20 L 200 50 L 200 180 L 120 210 L 40 180 Z" fill="#0e7490" opacity="0.6" transform="translate(5, 8) rotate(-2 120 120)" />
                  
                  {/* Base Book Cover */}
                  <path d="M 40 50 L 120 20 L 200 50 L 200 180 L 120 210 L 40 180 Z" fill="#06b6d4" />
                  
                  {/* Left Pages Block */}
                  <path d="M 45 55 L 115 30 L 115 195 L 45 170 Z" fill="#f8fafc" />
                  {/* Right Pages Block */}
                  <path d="M 125 30 L 195 55 L 195 170 L 125 195 Z" fill="#f1f5f9" />
                  
                  {/* Center Spine Crease */}
                  <path d="M 120 20 L 120 210" stroke="#0891b2" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 120 20 L 120 210" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                  
                  {/* Text Lines on Left */}
                  <path d="M 55 65 L 105 45 M 55 85 L 105 65 M 55 105 L 105 85" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Text Lines on Right */}
                  <path d="M 135 45 L 185 65 M 135 65 L 185 85 M 135 85 L 170 98" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />

                  {/* Flipping Page */}
                  <g style={{ transformOrigin: '120px 120px', animation: 'flipPage 3s infinite ease-in-out', perspective: '1000px' }}>
                    <path d="M 120 25 L 195 52 L 195 168 L 120 193 Z" fill="#ffffff" opacity="0.9" />
                    <path d="M 130 45 L 180 62 M 130 65 L 180 82 M 130 85 L 165 97" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
                  </g>
                  
                  {/* Glowing Jewel/Bookmark on Spine */}
                  <circle cx="120" cy="180" r="10" fill="#fef08a" />
                  <circle cx="120" cy="180" r="6" fill="#facc15" />
                  <path d="M 116 190 L 124 190 L 124 220 L 120 215 L 116 220 Z" fill="#facc15" />
                  
                  {/* Magic Sparkle Center */}
                  <path d="M 120 80 L 125 100 L 145 105 L 125 110 L 120 130 L 115 110 L 95 105 L 115 100 Z" fill="#cffafe" opacity="0.9" style={{ animation: 'floatUpFade 2s infinite alternate' }}/>
                </svg>

                {/* Flying Particles */}
                {[...Array(15)].map((_, i) => {
                  const angle = (i * 24 * Math.PI) / 180;
                  const dist = 100 + Math.random() * 50;
                  const tx = `${Math.cos(angle) * dist}px`;
                  const ty = `${Math.sin(angle) * dist}px`;
                  return (
                    <svg 
                      key={`star-${i}`} 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-cyan-300' : i % 3 === 1 ? 'text-blue-400' : 'text-teal-400'}`}
                      style={{
                        '--tx': tx,
                        '--ty': ty,
                        animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                      } as React.CSSProperties}
                    >
                      {i % 2 === 0 ? (
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
                      ) : (
                        <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                      )}
                    </svg>
                  )
                })}
                
                <h2 className="text-4xl font-extrabold text-cyan-500 drop-shadow-lg tracking-tight text-center z-50">
                  Record Created!
                </h2>
              </div>
            </div>
          ) : (
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-5 border-b border-border flex justify-between items-center bg-card shrink-0">
              <h2 className="text-2xl font-black">{editForm._id ? 'Edit Record' : 'Create New Record'}</h2>
              <button type="button" onClick={() => setIsEditing(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"><X size={20}/></button>
            </div>
            
            <form id="recordForm" onSubmit={saveRecord} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Title <span className="text-destructive">*</span></label>
                <input autoFocus type="text" required value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none text-lg font-bold" placeholder="e.g. Vacation in Kyoto" />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</label>
                <div className="border border-border rounded-xl overflow-hidden bg-background min-h-[150px]">
                  <TipTapEditor 
                    content={editForm.description || ''} 
                    onChange={content => setEditForm({...editForm, description: content})} 
                    placeholder="Write your detailed memories, notes, or ideas here..." 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Date</label>
                  <input type="datetime-local" value={editForm.date ? new Date(editForm.date).toISOString().slice(0, 16) : ''} onChange={e => setEditForm({...editForm, date: new Date(e.target.value).toISOString()})} className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Type</label>
                  <select value={editForm.type || 'Memory'} onChange={e => setEditForm({...editForm, type: e.target.value})} className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2 font-medium">
                    <option>Memory</option>
                    <option>Daily Event</option>
                    <option>Photo</option>
                    <option>Audio</option>
                    <option>Video</option>
                    <option>Achievement</option>
                    <option>Idea</option>
                    <option>General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Location</label>
                  <input type="text" value={editForm.location || ''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2" placeholder="Where did this happen?" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Mood / Feeling</label>
                  <input type="text" value={editForm.mood || ''} onChange={e => setEditForm({...editForm, mood: e.target.value})} className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2" placeholder="e.g. Happy, Inspired" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Tags</label>
                  <input 
                    type="text" 
                    value={tagsText} 
                    onChange={e => {
                      setTagsText(e.target.value)
                      setEditForm({...editForm, tags: e.target.value.split(',').map(t=>t.trim()).filter(Boolean)})
                    }} 
                    className="w-full p-3 rounded-xl border border-border bg-background outline-none focus:ring-2" 
                    placeholder="Comma separated (e.g. Trip, Family, Tech)" 
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6 space-y-6">
                {/* Photos Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Photos</label>
                    <button type="button" onClick={() => handleAttach({ title: 'Add Photo', filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'gfif', 'bmp', 'tiff', 'svg', 'ico', 'heic', 'heif', 'raw', 'cr2', 'nef', 'orf', 'sr2'] }] })} className="text-xs px-3 py-1.5 bg-accent text-foreground rounded-lg border border-border hover:bg-accent/80 font-bold flex items-center gap-2">
                      <ImagePlus size={14}/> Add Photo
                    </button>
                  </div>
                  
                  {editForm.attachments && editForm.attachments.filter(a => a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)).length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {editForm.attachments.map((att, i) => {
                        if (!att.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)) return null;
                        return (
                          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-accent/20">
                            <img src={normalizeUrl(att)} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"/>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button type="button" onClick={() => setEditForm({...editForm, attachments: editForm.attachments?.filter((_, idx) => idx !== i)})} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-accent/10 p-6 rounded-xl border border-dashed border-border text-center">
                      No photos added.
                    </div>
                  )}
                </div>

                {/* Files Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Files</label>
                    <button type="button" onClick={() => handleAttach()} className="text-xs px-3 py-1.5 bg-accent text-foreground rounded-lg border border-border hover:bg-accent/80 font-bold flex items-center gap-2">
                      <Paperclip size={14}/> Add File
                    </button>
                  </div>
                  
                  {editForm.attachments && editForm.attachments.filter(a => !a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)).length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {editForm.attachments.map((att, i) => {
                        if (att.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i)) return null;
                        return (
                          <div key={i} className="flex items-center justify-between bg-background border border-border p-3 rounded-xl hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText size={18}/>
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold truncate text-foreground" title={att.split(/[\\/]/).pop()}>{att.split(/[\\/]/).pop()}</span>
                                <span className="text-xs text-muted-foreground">Document</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => setEditForm({...editForm, attachments: editForm.attachments?.filter((_, idx) => idx !== i)})} className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors">
                              <X size={16}/>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-accent/10 p-4 rounded-xl border border-dashed border-border text-center">
                      No files added.
                    </div>
                  )}
                </div>
              </div>
            </form>

            <div className="px-8 py-5 border-t border-border flex justify-end gap-3 bg-card shrink-0">
              <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
              <button type="submit" form="recordForm" className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                Save Record
              </button>
            </div>
          </div>
          )}
        </div>
      )}

    </div>
  )
}
