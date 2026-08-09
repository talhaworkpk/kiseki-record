import React from 'react'
import { Calendar as CalendarIcon, Mail } from 'lucide-react'
import { CalendarMemory } from '../../types'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'

export function CalendarWidget({ data, calendarMemories, onOpenMemoryModal }: { data: any, calendarMemories?: CalendarMemory[], onOpenMemoryModal?: (date: { month: number, day: number }) => void }) {

  const days = ['S','M','T','W','T','F','S']
  const now = new Date()
  const today = now.getDate()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthName = now.toLocaleString('default', { month: 'long' })

  // Calculate actual days in month and starting day
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay()
  const dates = Array.from({length: daysInMonth}).map((_, i)=>i+1)

  const getMemoriesForDay = (day: number) => {
    if (!calendarMemories) return []
    return calendarMemories.filter(m => m.month === currentMonth && m.day === day)
  }

  const handleDayClick = (day: number) => {
    if (onOpenMemoryModal) {
      onOpenMemoryModal({ month: currentMonth, day })
    }
  }

  return (
    <div className="p-6 bg-card rounded-2xl border border-border h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2"><CalendarIcon size={20} /> {monthName}</span>
      </h2>
      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
          {Array.from({length: firstDayOfMonth}).map((_, i) => <div key={`empty-${i}`} className="col-span-1"></div>)}
          {dates.map(d => {
            const dayMemories = getMemoriesForDay(d)
            const hasMemories = dayMemories.length > 0
            const isToday = d === today
            
            return (
              <div key={d} className="flex justify-center relative">
                {hasMemories ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={() => handleDayClick(d)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium cursor-pointer transition-all ${
                          isToday ? 'bg-primary text-primary-foreground shadow-md font-bold' : 
                          'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white font-bold ring-1 ring-indigo-500/30'
                        }`}
                      >
                        {d}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {dayMemories.length} Annual Memor{dayMemories.length === 1 ? 'y' : 'ies'}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button 
                    onClick={() => handleDayClick(d)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium cursor-pointer transition-all ${
                      isToday ? 'bg-primary text-primary-foreground shadow-md font-bold' : 
                      'hover:bg-accent text-foreground'
                    }`}
                  >
                    {d}
                  </button>
                )}
                
                {hasMemories && (
                  <div className="absolute -bottom-1 -right-0 flex items-center justify-center pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm border-2 border-card" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
