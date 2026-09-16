import React, { useState, useEffect, useRef } from 'react'
import { ChronicleRecord } from '../../types'
import { X, Calendar, Clock, Tag } from 'lucide-react'

interface ChronicleRecordFormProps {
  record: ChronicleRecord | null
  onSave: (record: Partial<ChronicleRecord>) => void
  onClose: () => void
}

export default function ChronicleRecordForm({ record, onSave, onClose }: ChronicleRecordFormProps) {
  const [content, setContent] = useState(record?.content || '')
  
  // Date and Time defaults to now if no entry provided
  const now = new Date()
  const defaultDate = now.toISOString().split('T')[0]
  const defaultTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  
  const [occurrenceDate, setOccurrenceDate] = useState(record?.occurrenceDate || defaultDate)
  const [startTime, setStartTime] = useState(record?.startTime || defaultTime)
  const [endTime, setEndTime] = useState(record?.endTime || '')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus and resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Put cursor at the end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
      
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  // Handle Ctrl+S and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (content.trim()) {
          handleSubmit(new Event('submit') as unknown as React.FormEvent)
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content, occurrenceDate, startTime, endTime])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    onSave({
      content: content.trim(),
      occurrenceDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" data-stop-overscroll="true">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-[0_24px_50px_rgba(0,0,0,0.2)] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-accent/30">
            <h2 className="text-lg font-bold tracking-tight">
              {record ? 'Edit Record' : 'Add Record'}
            </h2>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6" data-overscroll-glow="false">
            
            {/* Main Content Area */}
            <div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What happened? What did you observe?"
                className="w-full bg-transparent text-lg resize-none outline-none placeholder:text-muted-foreground/40 min-h-[120px] focus:ring-0"
              />
            </div>

            {/* Time & Date Controls */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-border/10">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Calendar size={12} /> Occurrence Date
                </label>
                <input 
                  type="date" 
                  value={occurrenceDate}
                  onChange={(e) => setOccurrenceDate(e.target.value)}
                  className="w-full bg-accent/30 border border-border/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all"
                  required
                />
              </div>
              
              <div className="flex-1 min-w-[200px] flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Clock size={12} /> Start Time
                  </label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-accent/30 border border-border/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-60">
                    End (Optional)
                  </label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-accent/30 border border-border/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-accent/10 border-t border-border/10 flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">
              Press <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-white/10 border border-border/20 mx-1">Ctrl</kbd> + <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-white/10 border border-border/20 mx-1">S</kbd> to save
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim()}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(var(--primary),0.2)] hover:shadow-[0_6px_16px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                Save Record
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
