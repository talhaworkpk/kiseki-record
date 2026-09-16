import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, MoreHorizontal, Calendar, Trash2, Edit2, Archive, Search } from 'lucide-react'
import { ChronicleEntry, ChronicleRecord } from '../../types'
import ChronicleTimeline from './ChronicleTimeline'
import ChronicleRecordForm from './ChronicleRecordForm'
import ChronicleEntryForm from './ChronicleEntryForm'
import ConfirmModal from '../../components/ui/ConfirmModal'

export default function ChronicleEntryView() {
  const { entryId } = useParams<{ entryId: string }>()
  const navigate = useNavigate()

  const [entry, setEntry] = useState<ChronicleEntry | null>(null)
  const [records, setRecords] = useState<ChronicleRecord[]>([])
  
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false)
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ChronicleRecord | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState('')

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    loadData()
  }, [entryId])

  const loadData = async () => {
    if (!entryId) return
    try {
      // @ts-ignore
      const entryData = await window.api.db.find('chronicle', { id: entryId })
      if (entryData && entryData.length > 0) {
        setEntry(entryData[0])
      } else {
        // Entry not found, go back
        navigate('/chronicle')
      }

      // @ts-ignore
      const recordsData = await window.api.db.find('chronicleRecords', { entryId })
      if (recordsData) {
        setRecords(recordsData)
      }
    } catch (err) {
      console.error('Failed to load entry:', err)
    }
  }

  const handleSaveRecord = async (recordData: Partial<ChronicleRecord>) => {
    if (!entry) return
    try {
      if (editingRecord) {
        const updated = {
          ...editingRecord,
          ...recordData,
          updatedAt: Date.now()
        }
        // @ts-ignore
        await window.api.db.update('chronicleRecords', { id: editingRecord.id }, updated)
      } else {
        const newRecord: ChronicleRecord = {
          id: crypto.randomUUID(),
          entryId: entry.id,
          content: recordData.content || '',
          occurrenceDate: recordData.occurrenceDate || new Date().toISOString().split('T')[0],
          startTime: recordData.startTime,
          endTime: recordData.endTime,
          createdAt: Date.now()
        }
        // @ts-ignore
        await window.api.db.insert('chronicleRecords', newRecord)
      }
      setIsRecordFormOpen(false)
      setEditingRecord(null)
      loadData()
    } catch (err) {
      console.error('Failed to save record:', err)
    }
  }

  const handleDeleteRecord = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Record',
      message: 'Delete this record permanently?',
      onConfirm: async () => {
        try {
          // @ts-ignore
          await window.api.db.remove('chronicleRecords', { id })
          setConfirmConfig(prev => ({ ...prev, isOpen: false }))
          loadData()
        } catch (err) {
          console.error('Failed to delete record:', err)
        }
      }
    })
  }

  const handleSaveEntry = async (entryData: Partial<ChronicleEntry>) => {
    if (!entry) return
    try {
      const updated = {
        ...entry,
        ...entryData,
        updatedAt: Date.now()
      }
      // @ts-ignore
      await window.api.db.update('chronicle', { id: entry.id }, updated)
      setIsEntryFormOpen(false)
      loadData()
    } catch (err) {
      console.error('Failed to update entry:', err)
    }
  }

  const handleDeleteEntry = () => {
    if (!entry) return
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Entry',
      message: 'Delete this entire chronicle entry and ALL its records permanently? This cannot be undone.',
      onConfirm: async () => {
        try {
          // @ts-ignore
          await window.api.db.remove('chronicleRecords', { entryId: entry.id }, { multi: true })
          // @ts-ignore
          await window.api.db.remove('chronicle', { id: entry.id })
          navigate('/chronicle')
        } catch (err) {
          console.error('Failed to delete entry:', err)
        }
      }
    })
  }

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records
    const lowerQ = searchQuery.toLowerCase()
    return records.filter(r => 
      r.content.toLowerCase().includes(lowerQ) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(lowerQ)))
    )
  }, [records, searchQuery])

  if (!entry) return null

  // Calculate stats
  const sortedByOccurrence = [...records].sort((a, b) => {
    const timeA = new Date(`${a.occurrenceDate}T${a.startTime || '00:00'}`).getTime()
    const timeB = new Date(`${b.occurrenceDate}T${b.startTime || '00:00'}`).getTime()
    return timeB - timeA // Newest first
  })

  const firstRecord = sortedByOccurrence[sortedByOccurrence.length - 1]
  const lastRecord = sortedByOccurrence[0]

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full relative overflow-hidden bg-slate-50/50 dark:bg-background">
      
      {/* Premium Ambient Background (Dynamic for Light/Dark) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 via-white to-purple-100/40 dark:from-background dark:via-background dark:to-primary/5" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-400/10 dark:bg-primary/5 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      </div>

      {/* Premium Header */}
      <header className="h-[80px] shrink-0 border-b border-border/10 bg-background/60 backdrop-blur-2xl flex items-center justify-between px-8 z-30 sticky top-0">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <button 
            onClick={() => navigate('/chronicle')}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors shrink-0 text-muted-foreground hover:text-foreground group"
          >
            <ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          </button>
          
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{entry.title}</h1>
            <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
              {entry.type && (
                <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold text-primary">
                  {entry.type} <span className="mx-2 text-border/50">•</span>
                </span>
              )}
              {entry.description || 'No description'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="relative w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-accent/30 hover:bg-accent/50 focus:bg-accent border border-border/10 rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <button 
            onClick={() => { setEditingRecord(null); setIsRecordFormOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-[0_4px_12px_rgba(var(--primary),0.3)] hover:shadow-[0_6px_16px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 transition-all"
          >
            <Plus size={16} /> Add Record
          </button>

          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${isMenuOpen ? 'bg-accent text-foreground shadow-sm' : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'}`}
            >
              <MoreHorizontal size={20} />
            </button>
            
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-card/95 backdrop-blur-xl border border-border/50 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50 origin-top-right ring-1 ring-white/10">
                <button 
                  onClick={() => { setIsEntryFormOpen(true); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-accent rounded-xl flex items-center gap-3 transition-colors"
                >
                  <Edit2 size={16} className="opacity-70" /> Edit Entry
                </button>
                <div className="h-px bg-border/50 my-1 mx-2" />
                <button 
                  onClick={() => { handleDeleteEntry(); setIsMenuOpen(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-red-500/10 text-red-500 rounded-xl flex items-center gap-3 transition-colors"
                >
                  <Trash2 size={16} className="opacity-70" /> Delete Entry
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative pb-32">
        <div className="max-w-4xl mx-auto px-8 py-12">
          
          {/* Subtle Stats Header */}
          <div className="flex items-center justify-between mb-12 border-b border-border/5 pb-6">
            <div className="flex items-center gap-8 text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">
              <div>
                <span className="text-foreground font-bold">{records.length}</span> Records
              </div>
              {firstRecord && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="opacity-50" />
                  First: {new Date(firstRecord.occurrenceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
              {lastRecord && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="opacity-50" />
                  Last: {new Date(lastRecord.occurrenceDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Timeline View */}
          {records.length > 0 ? (
            <ChronicleTimeline 
              records={filteredRecords}
              onEdit={(record) => {
                setEditingRecord(record)
                setIsRecordFormOpen(true)
              }}
              onDelete={handleDeleteRecord}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center mb-6 ring-1 ring-border/20">
                <Archive className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No records yet</h3>
              <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
                Your first observation for <strong>{entry.title}</strong> will appear here. Start chronicling moments as they happen.
              </p>
              <button 
                onClick={() => setIsRecordFormOpen(true)}
                className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                Add First Record
              </button>
            </div>
          )}
          
        </div>
      </div>

      {isRecordFormOpen && (
        <ChronicleRecordForm
          record={editingRecord}
          onSave={handleSaveRecord}
          onClose={() => { setIsRecordFormOpen(false); setEditingRecord(null) }}
        />
      )}

      {isEntryFormOpen && (
        <ChronicleEntryForm
          entry={entry}
          onSave={handleSaveEntry}
          onClose={() => setIsEntryFormOpen(false)}
        />
      )}

      {confirmConfig.isOpen && (
        <ConfirmModal
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText="Delete"
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  )
}
