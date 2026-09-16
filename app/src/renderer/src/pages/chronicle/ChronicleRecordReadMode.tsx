import React, { useEffect } from 'react'
import { ChronicleRecord } from '../../types'
import { X, Edit2, Trash2 } from 'lucide-react'

interface ChronicleRecordReadModeProps {
  record: ChronicleRecord
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ChronicleRecordReadMode({ record, onClose, onEdit, onDelete }: ChronicleRecordReadModeProps) {
  
  // Format Date and Time
  const occurrenceDateStr = new Date(record.occurrenceDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const createdDateStr = new Date(record.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  
  const createdTimeStr = new Date(record.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  })

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    try {
      const [hours, minutes] = timeStr.split(':')
      const d = new Date()
      d.setHours(parseInt(hours, 10))
      d.setMinutes(parseInt(minutes, 10))
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return timeStr
    }
  }

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <div 
        className="absolute inset-0 bg-background/90 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-3xl bg-card/80 backdrop-blur-xl border border-border/20 shadow-[0_32px_80px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header - Minimalist */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border/5">
          <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
            Observation
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content - Distraction Free Reading */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 flex flex-col" data-overscroll-glow="false">
          
          <div className="text-xl sm:text-2xl leading-relaxed text-foreground/90 font-medium whitespace-pre-wrap flex-1 min-h-[200px]">
            {record.content}
          </div>

          <div className="w-16 border-t border-border/10 my-12 opacity-50" />

          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
            <div>
              <div className="text-foreground/90 font-bold mb-1">
                {occurrenceDateStr}
              </div>
              <div className="text-muted-foreground/70">
                {formatTime(record.startTime)} {record.endTime ? `– ${formatTime(record.endTime)}` : ''}
              </div>
            </div>
            
            <div className="sm:text-right">
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase mb-1">
                Created
              </div>
              <div className="text-muted-foreground/70">
                {createdDateStr} · {createdTimeStr}
              </div>
              {record.updatedAt && (
                <div className="text-muted-foreground/40 text-xs mt-1">
                  Edited: {new Date(record.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 bg-background/30 border-t border-border/5 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <Edit2 size={16} /> Edit
            </button>
          </div>
          <div>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
