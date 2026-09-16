import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Calendar, ScrollText, Filter, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ChronicleEntry, ChronicleRecord } from '../../types'
import ChronicleEntryForm from './ChronicleEntryForm'

type DateFilterType = 'all' | 'day' | 'week' | 'month' | 'year' | 'custom'

export default function ChronicleLayout() {
  const [entries, setEntries] = useState<ChronicleEntry[]>([])
  const [records, setRecords] = useState<ChronicleRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all')
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false)
  const [isMigrating, setIsMigrating] = useState(true)

  const navigate = useNavigate()

  const loadData = async () => {
    try {
      // @ts-ignore
      const rawEntries: any[] = await window.api.db.find('chronicle', {})
      
      // MIGRATION CHECK
      let needsRefresh = false
      for (const item of rawEntries) {
        if (!item.title && item.content) {
          // This is a legacy Chronicle entry from before the Entry -> Record split
          // We need to convert it:
          // 1. Update the entry to have a generic title
          // 2. Extract its content, occurrenceDate, etc into a new ChronicleRecord
          
          const newEntryId = item.id || crypto.randomUUID()
          const legacyContent = item.content
          const legacyOccurrence = item.occurrenceDate
          const legacyStart = item.startTime
          const legacyEnd = item.endTime
          const legacyCreated = item.createdAt

          // Update existing item in DB to be a valid ChronicleEntry
          const updatedEntry: Partial<ChronicleEntry> = {
            title: `Migrated Observation (${new Date(legacyCreated).toLocaleDateString()})`,
            description: 'Migrated from previous version',
            type: item.type,
            tags: item.tags
          }
          
          // Remove legacy fields (nedb lets us use $unset or just override)
          // Since we can't easily $unset via this simple API, we'll replace the doc
          const cleanEntry = {
            id: newEntryId,
            title: updatedEntry.title,
            description: updatedEntry.description,
            type: updatedEntry.type,
            tags: updatedEntry.tags,
            createdAt: legacyCreated
          }
          
          // @ts-ignore
          await window.api.db.remove('chronicle', { _id: item._id })
          // @ts-ignore
          await window.api.db.insert('chronicle', cleanEntry)

          // Insert the record
          const migratedRecord: ChronicleRecord = {
            id: crypto.randomUUID(),
            entryId: newEntryId,
            content: legacyContent,
            occurrenceDate: legacyOccurrence || new Date(legacyCreated).toISOString().split('T')[0],
            startTime: legacyStart,
            endTime: legacyEnd,
            createdAt: legacyCreated
          }
          // @ts-ignore
          await window.api.db.insert('chronicleRecords', migratedRecord)
          
          needsRefresh = true
        }
      }

      if (needsRefresh) {
        // @ts-ignore
        const refreshedEntries = await window.api.db.find('chronicle', {})
        setEntries(refreshedEntries)
      } else {
        setEntries(rawEntries)
      }

      // @ts-ignore
      const allRecords = await window.api.db.find('chronicleRecords', {})
      setRecords(allRecords)
      setIsMigrating(false)

    } catch (err) {
      console.error('Failed to load Chronicle data:', err)
      setIsMigrating(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveEntry = async (entryData: Partial<ChronicleEntry>) => {
    try {
      const newEntry: ChronicleEntry = {
        id: crypto.randomUUID(),
        title: entryData.title || 'Untitled',
        description: entryData.description,
        type: entryData.type,
        tags: entryData.tags,
        createdAt: Date.now()
      }
      
      // @ts-ignore
      await window.api.db.insert('chronicle', newEntry)
      setIsEntryFormOpen(false)
      loadData()
    } catch (err) {
      console.error('Failed to save entry:', err)
    }
  }

  // --- Filtering Logic ---
  
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // 1. Text Search (Matches Entry title/desc OR any child record content)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(entry => {
        if (entry.title.toLowerCase().includes(q)) return true
        if (entry.description?.toLowerCase().includes(q)) return true
        
        // Check children
        const children = records.filter(r => r.entryId === entry.id)
        return children.some(r => r.content.toLowerCase().includes(q))
      })
    }

    // 2. Date Filter (Check if entry has any record in the date range)
    if (dateFilter !== 'all') {
      const now = new Date()
      let startDate = new Date()
      startDate.setHours(0,0,0,0)
      
      if (dateFilter === 'week') {
        const day = startDate.getDay()
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
        startDate = new Date(startDate.setDate(diff))
      } else if (dateFilter === 'month') {
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      } else if (dateFilter === 'year') {
        startDate = new Date(startDate.getFullYear(), 0, 1)
      }
      
      const startIso = startDate.toISOString().split('T')[0]
      const endIso = now.toISOString().split('T')[0] // simplified end bound

      result = result.filter(entry => {
        const children = records.filter(r => r.entryId === entry.id)
        if (children.length === 0) return true // Show empty entries just in case, or we can hide them. Let's show them.
        
        return children.some(r => {
          if (dateFilter === 'day') return r.occurrenceDate === endIso
          return r.occurrenceDate >= startIso && r.occurrenceDate <= endIso
        })
      })
    }

    // Sort by most recently updated/created record
    result.sort((a, b) => {
      const aRecords = records.filter(r => r.entryId === a.id)
      const bRecords = records.filter(r => r.entryId === b.id)
      
      const aLatest = aRecords.length > 0 ? Math.max(...aRecords.map(r => new Date(r.occurrenceDate).getTime())) : a.createdAt
      const bLatest = bRecords.length > 0 ? Math.max(...bRecords.map(r => new Date(r.occurrenceDate).getTime())) : b.createdAt
      
      return bLatest - aLatest
    })

    return result
  }, [entries, records, searchQuery, dateFilter])


  if (isMigrating) {
    return <div className="p-12 text-center text-muted-foreground">Initializing Chronicle Data...</div>
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full relative overflow-hidden bg-slate-50/50 dark:bg-background">
      
      {/* Premium Ambient Background (Dynamic for Light/Dark) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-white to-purple-100/40 dark:from-background dark:via-background dark:to-primary/5" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-400/10 dark:bg-primary/5 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      </div>

      {/* Header */}
      <header className="h-[80px] shrink-0 border-b border-border/10 bg-background/60 backdrop-blur-2xl flex items-center justify-between px-8 z-30 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
            <ScrollText size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chronicle</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-80 mt-0.5">Your personal history, observed through time</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search entries & records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-accent/30 hover:bg-accent/50 focus:bg-accent border border-border/10 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <button 
            onClick={() => setIsEntryFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-[0_4px_12px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_16px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 transition-all"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative z-10 pb-32">
        <div className="max-w-4xl mx-auto px-8 py-8">
          
          {/* Filtering Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-1.5 p-1 bg-accent/30 rounded-xl border border-border/10 backdrop-blur-md">
              {(['all', 'day', 'week', 'month', 'year'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${dateFilter === filter ? 'bg-background text-foreground shadow-sm shadow-black/5 ring-1 ring-border/20 scale-100' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5 scale-95 hover:scale-100'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors uppercase tracking-wider">
              <Filter size={14} /> Custom
            </button>
          </div>

          {/* Entries Grid/List */}
          <div className="space-y-4">
            {filteredEntries.map(entry => {
              const entryRecords = records.filter(r => r.entryId === entry.id)
              
              // Sort records for preview (newest first)
              const sortedPreview = [...entryRecords].sort((a, b) => {
                const timeA = new Date(`${a.occurrenceDate}T${a.startTime || '00:00'}`).getTime()
                const timeB = new Date(`${b.occurrenceDate}T${b.startTime || '00:00'}`).getTime()
                return timeB - timeA
              })

              const previewRecords = sortedPreview.slice(0, 3)

              return (
                <div 
                  key={entry.id} 
                  onClick={() => navigate(`/chronicle/${entry.id}`)}
                  className="group relative bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-2xl border border-border/30 dark:border-white/5 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] dark:shadow-none rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] hover:border-primary/30 cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  {/* Premium internal glow */}
                  <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] pointer-events-none" />
                  
                  <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                    {/* Left Column: Identity */}
                    <div className="sm:w-1/3 flex flex-col justify-between">
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">{entry.title}</h2>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                        
                        {entry.type && (
                          <div className="inline-flex mt-3 px-2 py-0.5 rounded-md bg-accent/50 border border-border/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {entry.type}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex items-center gap-4 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
                        <div>{entryRecords.length} Records</div>
                        {sortedPreview.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="opacity-50" />
                            {new Date(sortedPreview[0].occurrenceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="sm:w-2/3 border-t sm:border-t-0 sm:border-l border-border/10 pt-4 sm:pt-0 sm:pl-6 flex flex-col justify-center">
                      {previewRecords.length > 0 ? (
                        <div className="space-y-3 relative">
                          {previewRecords.map((r, i) => (
                            <div key={r.id} className="flex gap-4 text-sm items-start opacity-70 group-hover:opacity-100 transition-opacity" style={{ transitionDelay: `${i * 50}ms` }}>
                              <div className="w-16 shrink-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1 text-right">
                                {new Date(r.occurrenceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                              <div className="flex-1 text-foreground line-clamp-1 font-medium italic bg-accent/30 px-3 py-1.5 rounded-lg border border-border/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                                "{r.content}"
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm font-medium text-muted-foreground/40 italic">
                          No records yet
                        </div>
                      )}

                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredEntries.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-32 px-4 text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-accent/50 flex items-center justify-center mb-6 ring-1 ring-border/20 shadow-inner">
                <ScrollText className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Your personal history starts here</h3>
              <p className="text-muted-foreground max-w-md mb-8 leading-relaxed text-sm">
                Chronicle is a premium timeline for things you observe over time. Track events, subjects, and recurring moments perfectly organized by when they actually happened.
              </p>
              <button 
                onClick={() => setIsEntryFormOpen(true)}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-[0_4px_12px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_16px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 transition-all"
              >
                Create First Entry
              </button>
            </div>
          )}
          
        </div>
      </div>

      {isEntryFormOpen && (
        <ChronicleEntryForm
          entry={null}
          onSave={handleSaveEntry}
          onClose={() => setIsEntryFormOpen(false)}
        />
      )}
      
    </div>
  )
}
