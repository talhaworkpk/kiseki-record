import { useState, useEffect } from 'react'
import { X, Clock, Save, Trash2, Archive, Loader2 } from 'lucide-react'
import { Habit } from '../../types'
import { logHabitActivity } from './HabitManager'

interface HabitFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: Habit
  onSave: () => void
  onDelete?: (id: string, mode: 'archive' | 'delete') => void
}

const CATEGORIES = ['Health', 'Productivity', 'Learning', 'Fitness', 'Mindfulness', 'Finance', 'Social', 'Hobbies', 'Bad Habit']

export default function HabitFormModal({ isOpen, onClose, initialData, onSave, onDelete }: HabitFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [formData, setFormData] = useState<Partial<Habit>>({
    title: '',
    description: '',
    category: 'Productivity',
    icon: '✨',
    scheduleType: 'daily',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    priority: 'medium',
    isTimerEnabled: false,
    targetDuration: 1800, // 30 mins
    startDate: new Date().toISOString().split('T')[0],
    archived: false,
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData)
      } else {
        setFormData({
          title: '',
          description: '',
          category: 'Productivity',
          icon: '✨',
          scheduleType: 'daily',
          scheduleDays: [0, 1, 2, 3, 4, 5, 6],
          priority: 'medium',
          isTimerEnabled: false,
          targetDuration: 1800,
          startDate: new Date().toISOString().split('T')[0],
          archived: false,
        })
      }
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title) return
    setLoading(true)

    try {
      const payload = {
        ...formData,
        updatedAt: Date.now(),
        createdAt: formData.createdAt || Date.now()
      }

      if (initialData && initialData._id) {
        // @ts-ignore
        await window.api.db.update('habits', { _id: initialData._id }, { $set: payload })
        await logHabitActivity(initialData._id, 'edited', 'Habit details updated.')
        onSave()
        onClose()
      } else {
        // @ts-ignore
        const newHabit = await window.api.db.insert('habits', payload)
        if (newHabit._id) await logHabitActivity(newHabit._id, 'created', 'Habit created.')
        
        setShowSuccessOverlay(true)
        setTimeout(() => {
          setShowSuccessOverlay(false)
          onSave()
          onClose()
        }, 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (isOpen) {
          e.preventDefault()
          handleSubmit(e as unknown as React.FormEvent)
        }
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [isOpen, formData, initialData])

  if (!isOpen) return null

  const handleDeleteReq = (mode: 'archive' | 'delete') => {
    if (mode === 'delete' && !confirm('Delete this habit permanently? Its completion history, timer sessions, streaks, and analytics will also be deleted.')) return
    if (onDelete && initialData && initialData._id) {
      onDelete(initialData._id, mode)
      onClose()
    }
  }

  const toggleDay = (dayIndex: number) => {
    const days = formData.scheduleDays || []
    if (days.includes(dayIndex)) {
      setFormData({ ...formData, scheduleDays: days.filter(d => d !== dayIndex) })
    } else {
      setFormData({ ...formData, scheduleDays: [...days, dayIndex] })
    }
  }

  if (showSuccessOverlay) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
        <style>{`
          @keyframes popAndRotateCheck {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
            75% { transform: scale(0.9) rotate(-5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes floatUpFade {
            0% { transform: translate(0, 0) scale(0); opacity: 0; }
            20% { opacity: 1; scale: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
          }
          @keyframes shineCheck {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(250%) skewX(-20deg); }
          }
        `}</style>
        <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotateCheck 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
          {/* 3D Checkmark SVG */}
          <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
            {/* Base Shield/Coin Back */}
            <circle cx="120" cy="125" r="90" fill="#14532d" opacity="0.4" transform="rotate(-6 120 120)" />
            <circle cx="120" cy="120" r="90" fill="#166534" opacity="0.6" transform="rotate(-3 120 120)" />
            
            {/* Main Coin/Shield */}
            <circle cx="120" cy="120" r="90" fill="#22c55e" />
            <circle cx="120" cy="120" r="80" fill="#4ade80" opacity="0.2" />
            
            {/* Inner Ring */}
            <circle cx="120" cy="120" r="70" fill="none" stroke="#15803d" strokeWidth="4" opacity="0.5" />
            
            {/* 3D Checkmark Shadow */}
            <path d="M 85 125 L 115 155 L 175 85" fill="none" stroke="#14532d" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" transform="translate(5, 5)" />
            
            {/* 3D Checkmark Main */}
            <path d="M 80 120 L 110 150 L 170 80" fill="none" stroke="#ffffff" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Shiny Overlay */}
            <g style={{ clipPath: 'url(#checkClip)' }}>
              <rect x="0" y="0" width="40" height="240" fill="white" opacity="0.3" style={{ animation: 'shineCheck 3s infinite linear' }} />
            </g>
            <defs>
              <clipPath id="checkClip">
                <circle cx="120" cy="120" r="90" />
              </clipPath>
            </defs>
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
                className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-green-300' : i % 3 === 1 ? 'text-emerald-400' : 'text-white'}`}
                style={{
                  '--tx': tx,
                  '--ty': ty,
                  animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                } as React.CSSProperties}
              >
                {i % 2 === 0 ? (
                  <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" />
                ) : (
                  <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
                )}
              </svg>
            )
          })}
          
          <h2 className="text-4xl font-extrabold text-green-500 drop-shadow-lg tracking-tight text-center z-50">
            Habit Created!
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card z-10 shrink-0">
          <h2 className="text-xl font-bold">{initialData ? 'Edit Habit' : 'Create New Habit'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="habitForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Habit Name</label>
                <input required autoFocus value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} type="text" className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none font-bold text-lg" placeholder="e.g. Read 30 pages" />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Description</label>
                <textarea value={formData.description || ''} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]" placeholder="Optional details..." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Icon (Emoji)</label>
                <input placeholder="Win + ." value={formData.icon !== undefined ? formData.icon : '✨'} onChange={e=>setFormData({...formData, icon: e.target.value})} type="text" maxLength={2} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-center text-xl placeholder:text-sm placeholder:font-normal" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Category</label>
                <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Priority</label>
              <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value as any})} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Schedule</label>
              <select value={formData.scheduleType} onChange={e=>{
                const v = e.target.value as any
                let days = [0,1,2,3,4,5,6]
                if (v === 'weekdays') days = [1,2,3,4,5]
                if (v === 'weekends') days = [0,6]
                setFormData({...formData, scheduleType: v, scheduleDays: days})
              }} className="w-full bg-background border border-border p-3 rounded-xl focus:ring-2 outline-none mb-3">
                <option value="daily">Every Day</option>
                <option value="weekdays">Weekdays (Mon-Fri)</option>
                <option value="weekends">Weekends (Sat-Sun)</option>
                <option value="specific_days">Specific Days</option>
              </select>
              
              {formData.scheduleType === 'specific_days' && (
                <div className="flex gap-2">
                  {['S','M','T','W','T','F','S'].map((day, i) => (
                    <button type="button" key={i} onClick={() => toggleDay(i)} className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center transition-colors ${formData.scheduleDays?.includes(i) ? 'bg-primary text-primary-foreground shadow-md' : 'bg-accent text-muted-foreground hover:bg-accent/80'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Completion Deadline</label>
                <input type="time" value={formData.deadlineTime || ''} onChange={e=>setFormData({...formData, deadlineTime: e.target.value})} className="w-full bg-background border border-border p-3 rounded-xl outline-none" />
                <span className="text-[10px] text-muted-foreground mt-1 block">Habit marks missed if untouched by this time.</span>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Preferred Time</label>
                <input type="time" value={formData.preferredTime || ''} onChange={e=>setFormData({...formData, preferredTime: e.target.value})} className="w-full bg-background border border-border p-3 rounded-xl outline-none" />
              </div>
            </div>

            <div className="bg-accent/30 p-4 rounded-xl border border-border flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.isTimerEnabled} onChange={e=>setFormData({...formData, isTimerEnabled: e.target.checked})} className="w-5 h-5 accent-primary rounded" />
                <span className="font-bold flex items-center gap-2"><Clock size={16}/> Enable Time Tracking</span>
              </label>
              {formData.isTimerEnabled && (
                <div className="pl-8">
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Target Duration (Minutes)</label>
                  <input type="number" min="1" value={(formData.targetDuration || 1800) / 60} onChange={e=>setFormData({...formData, targetDuration: parseInt(e.target.value) * 60})} className="w-32 bg-background border border-border p-2 rounded-lg outline-none" />
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-between items-center bg-card shrink-0">
          {initialData ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => handleDeleteReq('archive')} className="p-2 text-muted-foreground hover:bg-accent hover:text-yellow-500 rounded-xl transition-colors tooltip-trigger" title="Archive">
                <Archive size={20}/>
              </button>
              <button type="button" onClick={() => handleDeleteReq('delete')} className="p-2 text-muted-foreground hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-colors tooltip-trigger" title="Delete Permanently">
                <Trash2 size={20}/>
              </button>
            </div>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" form="habitForm" disabled={loading} className="px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform shadow-lg shadow-primary/20 flex items-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              <Save size={18} /> {initialData ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
