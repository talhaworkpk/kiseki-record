import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, HelpCircle } from 'lucide-react'
import { HabitDailyRecord } from '../../types'

interface MissReasonModalProps {
  isOpen: boolean
  onClose: () => void
  log: HabitDailyRecord
  habitTitle: string
  onSave: () => void
}

export default function MissReasonModal({ isOpen, onClose, log, habitTitle, onSave }: MissReasonModalProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState(log.missReason || '')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updatedLog = {
        ...log,
        missReason: reason,
        updatedAt: Date.now()
      }
      
      if (!log._id) {
        // Inferred log, need to insert
        // @ts-ignore
        await window.api.db.insert('habitLogs', { ...updatedLog, createdAt: Date.now() })
      } else {
        // Existing log, update
        // @ts-ignore
        await window.api.db.update('habitLogs', { _id: log._id }, { $set: updatedLog })
      }
      
      onSave()
      onClose()
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-card w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Moving gradient border */}
        <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-r from-red-500 via-red-300 via-purple-500 to-red-800 animate-gradient-xy">
          <div className="absolute inset-[2px] bg-card rounded-3xl"></div>
        </div>
        
        <div className="relative z-10">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card">
          <div>
            <h2 className="text-xl font-bold text-red-500">Miss Reason</h2>
            <div className="text-sm font-medium text-muted-foreground">Why did you miss "{habitTitle}"?</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full"><X size={20}/></button>
        </div>

        <form id="missReasonForm" onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-foreground/80 leading-relaxed bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
            Adding a reason helps you track patterns and improve your habit consistency over time.
          </p>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Reason</label>
            <textarea 
              value={reason} 
              onChange={e=>setReason(e.target.value)} 
              placeholder="e.g. Was sick, too busy, forgot, etc..."
              className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none min-h-[100px] resize-none"
              rows={4}
            />
          </div>

        </form>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
          <button type="submit" form="missReasonForm" disabled={loading} className="px-5 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:scale-105 transition-transform shadow-lg shadow-red-500/20 flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <HelpCircle size={18} />} Save Reason
          </button>
        </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
