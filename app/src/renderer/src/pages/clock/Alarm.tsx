import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useClockContext } from '../../contexts/ClockContext'
import { Bell, Plus, Trash2, Edit3, X, Check } from 'lucide-react'
import { ClockAlarm, RepeatType } from '../../lib/constants/clock'

export default function Alarm() {
  const { alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm } = useClockContext()
  const [showModal, setShowModal] = useState(false)
  const [editingAlarm, setEditingAlarm] = useState<ClockAlarm | null>(null)
  
  const [formTime, setFormTime] = useState('07:00')
  const [formLabel, setFormLabel] = useState('Alarm')
  const [formRepeat, setFormRepeat] = useState<RepeatType>('once')
  
  const handleOpenModal = (alarm?: ClockAlarm) => {
    if (alarm) {
      setEditingAlarm(alarm)
      setFormTime(alarm.time)
      setFormLabel(alarm.label)
      setFormRepeat(alarm.repeat)
    } else {
      setEditingAlarm(null)
      setFormTime('07:00')
      setFormLabel('Alarm')
      setFormRepeat('once')
    }
    setShowModal(true)
  }
  
  const handleSave = () => {
    if (editingAlarm) {
      updateAlarm(editingAlarm._id!, {
        time: formTime,
        label: formLabel,
        repeat: formRepeat
      })
    } else {
      addAlarm({
        time: formTime,
        label: formLabel,
        repeat: formRepeat,
        sound: 'default',
        enabled: true,
        snoozeDuration: 5
      })
    }
    setShowModal(false)
  }

  React.useEffect(() => {
    if (!showModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false)
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal, formTime, formLabel, formRepeat, editingAlarm])

  const formatDisplayTime = (time24: string) => {
    const [h, m] = time24.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto py-8">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-mono flex items-center gap-3">
            <Bell className="text-amber-500" /> Alarms
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your daily wake-ups and reminders.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-12 h-12 rounded-full border flex items-center justify-center transition-colors shadow-sm hover:scale-105 active:scale-95 backdrop-blur-[var(--clock-backdrop-blur)]"
          style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)', color: 'var(--clock-text)' }}
        >
          <Plus size={24} />
        </button>
      </div>
      
      <div className="space-y-4">
        {alarms.length === 0 ? (
          <div className="text-center p-12 border rounded-2xl border-dashed backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
            <Bell size={48} className="mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold">No alarms yet</h3>
            <p className="text-muted-foreground text-sm">Create one to keep important moments on track.</p>
          </div>
        ) : (
          alarms.map(alarm => (
            <div key={alarm._id} className={`flex items-center justify-between p-6 border rounded-2xl shadow-sm transition-all backdrop-blur-[var(--clock-backdrop-blur)] ${!alarm.enabled ? 'opacity-60' : 'hover:border-primary/50'}`} style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
              <div className="flex-1 cursor-pointer" onClick={() => handleOpenModal(alarm)}>
                <div className="flex items-end gap-3 mb-1">
                  <h2 className="text-4xl font-bold font-mono tracking-tighter tabular-nums">
                    {formatDisplayTime(alarm.time)}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-foreground">{alarm.label}</span>
                  <span className="text-muted-foreground capitalize">• {alarm.repeat}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => deleteAlarm(alarm._id!)}
                  className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <div 
                  className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${alarm.enabled ? '' : 'bg-muted'}`}
                  style={alarm.enabled ? { background: 'var(--clock-primary-bg)' } : {}}
                  onClick={() => toggleAlarm(alarm._id!, !alarm.enabled)}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${alarm.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="border w-full max-w-md p-6 rounded-3xl shadow-2xl backdrop-blur-[var(--clock-backdrop-blur)]" style={{ backgroundColor: 'var(--clock-card-bg)', borderColor: 'var(--clock-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingAlarm ? 'Edit Alarm' : 'New Alarm'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Time</label>
                <input 
                  type="time" 
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="w-full text-4xl font-bold font-mono bg-accent/50 p-4 rounded-xl border border-transparent hover:border-border focus:border-amber-500 outline-none text-center"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Label</label>
                <input 
                  type="text" 
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  className="w-full bg-accent p-3 rounded-lg border border-transparent focus:border-amber-500 outline-none"
                  placeholder="Wake up"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Repeat</label>
                <select 
                  value={formRepeat}
                  onChange={e => setFormRepeat(e.target.value as RepeatType)}
                  className="w-full bg-accent p-3 rounded-lg border border-transparent focus:border-amber-500 outline-none capitalize"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                </select>
              </div>
              
              <button 
                onClick={handleSave}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={20} /> Save Alarm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
    </div>
  )
}
