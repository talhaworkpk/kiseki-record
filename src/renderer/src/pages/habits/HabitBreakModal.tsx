import { useState } from 'react'
import { X, Calendar, Loader2 } from 'lucide-react'
import { Habit, HabitBreak } from '../../types'
import { logHabitActivity } from './HabitManager'

interface HabitBreakModalProps {
  isOpen: boolean
  onClose: () => void
  habit: Habit
  onSave: () => void
}

export default function HabitBreakModal({ isOpen, onClose, habit, onSave }: HabitBreakModalProps) {
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [autoResume, setAutoResume] = useState(true)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) return
    setLoading(true)

    try {
      const hBreak: HabitBreak = {
        habitId: habit._id!,
        startDate,
        endDate,
        reason,
        autoResume,
        createdAt: Date.now()
      }
      // @ts-ignore
      await window.api.db.insert('habitBreaks', hBreak)
      await logHabitActivity(habit._id!, 'break_started', `Break scheduled until ${endDate}. Reason: ${reason || 'N/A'}`)
      
      onSave()
      onClose()
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card">
          <div>
            <h2 className="text-xl font-bold text-yellow-500">Take a Break</h2>
            <div className="text-sm font-medium text-muted-foreground">Pause "{habit.title}" safely</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full"><X size={20}/></button>
        </div>

        <form id="breakForm" onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-foreground/80 leading-relaxed bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
            Pausing a habit protects your current streak and completion rate. It will not be marked as missed during this period.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Start Date</label>
              <input required value={startDate} onChange={e=>setStartDate(e.target.value)} type="date" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">End Date</label>
              <input required value={endDate} onChange={e=>setEndDate(e.target.value)} type="date" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Reason (Optional)</label>
            <input value={reason} onChange={e=>setReason(e.target.value)} type="text" placeholder="e.g. Vacation, Sick, Busy..." className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-accent/30 rounded-xl border border-border">
            <input type="checkbox" checked={autoResume} onChange={e=>setAutoResume(e.target.checked)} className="w-5 h-5 accent-primary rounded" />
            <div>
              <div className="font-bold text-sm">Resume automatically</div>
              <div className="text-xs text-muted-foreground mt-0.5">Habit will reactivate after the end date.</div>
            </div>
          </label>

        </form>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
          <button type="submit" form="breakForm" disabled={loading} className="px-5 py-2.5 rounded-xl font-bold bg-yellow-500 text-white hover:scale-105 transition-transform shadow-lg shadow-yellow-500/20 flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={18} />} Schedule Break
          </button>
        </div>

      </div>
    </div>
  )
}
