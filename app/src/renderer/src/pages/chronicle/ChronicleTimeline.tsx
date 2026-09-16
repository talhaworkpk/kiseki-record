import React, { useState } from 'react'
import { ChronicleRecord } from '../../types'
import { Edit2, Trash2, BookOpen, Clock } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../../components/ui/tooltip'
import ChronicleRecordReadMode from './ChronicleRecordReadMode'

interface ChronicleTimelineProps {
  records: ChronicleRecord[]
  onEdit: (record: ChronicleRecord) => void
  onDelete: (id: string) => void
}

export default function ChronicleTimeline({ records, onEdit, onDelete }: ChronicleTimelineProps) {
  const [readingRecord, setReadingRecord] = useState<ChronicleRecord | null>(null)

  // Group records by occurrenceDate
  const groupedRecords = records.reduce((groups, record) => {
    const date = record.occurrenceDate
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(record)
    return groups
  }, {} as Record<string, ChronicleRecord[]>)

  // Sort dates descending (newest first)
  const sortedDates = Object.keys(groupedRecords).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

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

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Using precise toDateString match
    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) {
      return { main: 'TODAY', sub: date.toLocaleDateString([], { weekday: 'long' }) }
    } else if (isYesterday) {
      return { main: 'YESTERDAY', sub: date.toLocaleDateString([], { weekday: 'long' }) }
    }

    return {
      main: date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
      sub: date.toLocaleDateString([], { weekday: 'long' })
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative pb-20">
        {/* Main Vertical Timeline Line */}
        <div className="absolute top-0 bottom-0 left-[118px] w-px bg-border/40" />

        {sortedDates.map((date, dateIndex) => {
          const dateLabel = formatDateLabel(date)
          
          // Sort records within the day (newest first)
          const dayRecords = [...groupedRecords[date]].sort((a, b) => {
            const timeA = a.startTime ? new Date(`${a.occurrenceDate}T${a.startTime}`).getTime() : 0
            const timeB = b.startTime ? new Date(`${b.occurrenceDate}T${b.startTime}`).getTime() : 0
            return timeB - timeA
          })

          return (
            <div key={date} className={`relative ${dateIndex > 0 ? 'mt-16' : ''}`}>
              
              {/* Date Header Segment */}
              <div className="flex items-end mb-8 relative z-10 group/date">
                <div className="w-[100px] text-right pr-6">
                  <div className="text-[11px] font-bold text-muted-foreground/60 tracking-widest uppercase">{dateLabel.sub}</div>
                  <div className="text-sm font-extrabold text-foreground tracking-wide mt-0.5">{dateLabel.main}</div>
                </div>
                
                {/* Date Node */}
                <div className="absolute left-[114px] w-[9px] h-[9px] rounded-full border-2 border-background bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-300 group-hover/date:scale-125" />
                
                {/* Connecting Line */}
                <div className="flex-1 border-b border-border/10 ml-8 pb-2 opacity-50" />
              </div>

              {/* Records for the Date */}
              <div className="space-y-6">
                {dayRecords.map((record) => (
                  <div key={record.id} className="relative flex group">
                    
                    {/* Time Label */}
                    <div className="w-[100px] text-right pr-6 pt-2 flex-shrink-0">
                      {record.startTime ? (
                        <>
                          <div className="text-xs font-bold text-muted-foreground/80 tracking-wide">
                            {formatTime(record.startTime)}
                          </div>
                          {record.endTime && (
                            <div className="text-[10px] font-medium text-muted-foreground/50 mt-0.5 uppercase tracking-wider">
                              – {formatTime(record.endTime)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs font-bold text-muted-foreground/40 italic">
                          Unknown Time
                        </div>
                      )}
                    </div>

                    {/* Record Node */}
                    <div className="absolute left-[116px] w-[5px] h-[5px] mt-3 rounded-full bg-border transition-all duration-300 group-hover:bg-primary group-hover:scale-150 shadow-sm" />

                    {/* Content Frame */}
                    <div className="flex-1 ml-8 max-w-2xl relative">
                      {/* Premium Hover Actions */}
                      <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 z-20 bg-card border border-border shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-lg p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              onClick={() => onEdit(record)}
                              className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        
                        <div className="w-px h-3 bg-border/50 mx-0.5" />
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              onClick={() => setReadingRecord(record)}
                              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
                            >
                              <BookOpen size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Read Mode</TooltipContent>
                        </Tooltip>

                        <div className="w-px h-3 bg-border/50 mx-0.5" />
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              onClick={() => onDelete(record.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="pl-6 py-1 border-l-2 border-transparent group-hover:border-border/30 transition-colors">
                        {/* Main Text Content */}
                        <div className="bg-gradient-to-br from-card via-card/90 to-primary/5 backdrop-blur-2xl border border-border/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] dark:shadow-none px-5 py-4 rounded-2xl relative transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] group-hover:border-primary/20">
                          <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] pointer-events-none" />
                          <div className="text-[15px] leading-relaxed text-foreground/90 font-medium italic whitespace-pre-wrap line-clamp-4 relative z-10">
                            "{record.content}"
                          </div>
                        </div>
                        
                        {/* Subtle Created Timestamp */}
                        <div className="mt-3 ml-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Clock size={10} />
                          Created: {new Date(record.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {readingRecord && (
          <ChronicleRecordReadMode
            record={readingRecord}
            onClose={() => setReadingRecord(null)}
            onEdit={() => {
              setReadingRecord(null)
              onEdit(readingRecord)
            }}
            onDelete={() => {
              setReadingRecord(null)
              onDelete(readingRecord.id)
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
