import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Trash2, Edit2, X, AlertTriangle } from 'lucide-react'
import { Goal } from '../types'
import { ShootingStars } from '../components/ShootingStars'
import { useOnboarding } from '../hooks/useOnboarding'
import { SectionWelcome } from '../components/onboarding/SectionWelcome'
import { ONBOARDING_CONFIGS } from '../lib/onboardingConfig'

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)
  const { showWelcome, completeWelcome } = useOnboarding('goals')

  const [form, setForm] = useState<Partial<Goal>>({
    title: '', description: '', category: 'General', priority: 'medium', startDate: new Date().toISOString().split('T')[0], targetDate: '', progress: 0, status: 'Active'
  })

  // Handle progress change with auto-status update
  const handleProgressChange = (value: number) => {
    setForm({...form, progress: value})
    if (value === 100) {
      setForm(prev => ({...prev, status: 'Completed'}))
    }
  }

  // Handle status change with auto-progress update
  const handleStatusChange = (value: string) => {
    setForm({...form, status: value as any})
    if (value === 'Completed') {
      setForm(prev => ({...prev, progress: 100}))
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && goals.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`goal-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, goals.length])

  const fetchGoals = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('goals', {})
      setGoals(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) return

    try {
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('goals', { _id: editingId }, { $set: { ...form } }, {})
      } else {
        const newGoal: Goal = {
          title: form.title,
          description: form.description || '',
          category: form.category || 'General',
          priority: form.priority as any || 'medium',
          startDate: form.startDate || new Date().toISOString(),
          targetDate: form.targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          progress: form.progress || 0,
          status: form.status as any || 'Active'
        }
        // @ts-ignore
        await window.api.db.insert('goals', newGoal)
      }
      setIsAdding(false)
      setEditingId(null)
      fetchGoals()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  useEffect(() => {
    if (!deleteConfirmId) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteConfirmId(null)
      } else if (e.key === 'Enter') {
        confirmDelete()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    try {
      // @ts-ignore
      await window.api.db.remove('goals', { _id: deleteConfirmId }, {})
      setDeleteConfirmId(null)
      setShowDeleteSuccess(true)
      fetchGoals()
      setTimeout(() => setShowDeleteSuccess(false), 3000)
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: Goal) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
  }

  return (
    <>
      {showWelcome && <SectionWelcome config={ONBOARDING_CONFIGS.goals} onComplete={completeWelcome} />}
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500 relative min-h-screen">
      <ShootingStars />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Goals</h1>
        {!isAdding && (
          <button onClick={() => { setForm({ category: 'General', priority: 'medium', progress: 0, status: 'Active', startDate: new Date().toISOString().split('T')[0] }); setEditingId(null); setIsAdding(true) }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium flex items-center gap-2">
            <Plus size={18}/> Add Goal
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="mb-8 p-6 bg-card border border-border rounded-xl shadow-sm animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{editingId ? 'Edit Goal' : 'Create New Goal'}</h2>
            <button type="button" onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20}/></button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input 
                type="text" 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full p-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="E.g., Learn conversational Japanese"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full p-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-24"
                placeholder="Why this goal? What are the key milestones?"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Progress ({form.progress}%)</label>
                <input type="range" min="0" max="100" value={form.progress} onChange={e => handleProgressChange(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => handleStatusChange(e.target.value)} className="w-full p-2 bg-background border border-border rounded-md">
                  <option value="Planned">Planned</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Date</label>
                <input type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium">
              Save Goal
            </button>
          </div>
        </form>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Active Goals</h2>
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading goals...</p>
        ) : goals.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
            No goals set. Aim for the stars!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => (
              <div key={goal._id} id={`goal-${goal._id}`} className="p-5 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-1000 relative group">
                <div className="flex justify-between items-start mb-2 pr-16">
                  <h3 className="text-lg font-bold truncate">{goal.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    goal.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-accent text-accent-foreground'
                  }`}>
                    {goal.status}
                  </span>
                </div>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button onClick={() => openEdit(goal)} className="p-1.5 bg-background border border-border rounded-md hover:bg-accent text-foreground"><Edit2 size={14}/></button>
                  <button onClick={() => handleDeleteClick(goal._id!)} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10"><Trash2 size={14}/></button>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{goal.description}</p>
                
                <div className="w-full bg-accent rounded-full h-2">
                  <div className={`h-2 rounded-full ${goal.progress === 100 ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${goal.progress}%` }}></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{goal.progress}% completed</span>
                  {goal.targetDate && <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground p-0 rounded-2xl shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] border border-destructive/20 w-full max-w-md flex flex-col overflow-hidden scale-in-center animate-in zoom-in-95 duration-300">
            {/* Header Section */}
            <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-center border-b border-destructive/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-transparent"></div>
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner mb-4 relative z-10 border border-destructive/20">
                <Trash2 size={32} className="text-destructive drop-shadow-md animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground relative z-10">Delete Goal?</h3>
            </div>
            
            {/* Body Section */}
            <div className="p-6">
              <p className="text-center text-muted-foreground mb-4">
                You are about to permanently delete this goal.
              </p>
              
              <div className="bg-accent/50 p-3 rounded-lg border border-border flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground text-left">
                  This action cannot be undone. All progress will be lost.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-destructive text-white shadow-lg shadow-destructive/30 hover:shadow-destructive/50 hover:from-red-500 hover:to-red-600 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteSuccess && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-destructive/30 via-background/90 to-background/95 backdrop-blur-md animate-in fade-in duration-300">
          <style>{`
            @keyframes popTrash {
              0% { transform: scale(0) translateY(50px) rotate(-15deg); opacity: 0; }
              40% { transform: scale(1.1) translateY(-10px) rotate(5deg); opacity: 1; }
              60% { transform: scale(0.95) translateY(5px) rotate(-2deg); }
              80% { transform: scale(1.05) translateY(-2px) rotate(2deg); }
              100% { transform: scale(1) translateY(0) rotate(0); opacity: 1; }
            }
            @keyframes floatUpFade {
              0% { transform: translate(0, 0) scale(0); opacity: 0; }
              20% { opacity: 1; scale: 1; }
              100% { transform: translate(var(--tx), var(--ty)) scale(0.5); opacity: 0; }
            }
            @keyframes openLid {
              0% { transform: translateY(0) rotate(0); }
              30% { transform: translateY(-30px) rotate(-20deg); }
              70% { transform: translateY(-30px) rotate(-20deg); }
              100% { transform: translateY(0) rotate(0); }
            }
            @keyframes suckIn {
              0% { transform: translateY(-80px) scale(1.5); opacity: 0; }
              30% { transform: translateY(-60px) scale(1.2); opacity: 1; }
              70% { transform: translateY(20px) scale(0); opacity: 0; }
              100% { transform: translateY(20px) scale(0); opacity: 0; }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popTrash 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D Trash Can SVG */}
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back Shadow */}
              <rect x="70" y="80" width="100" height="120" rx="10" fill="#7f1d1d" opacity="0.4" transform="translate(10, 15) rotate(-5 120 120)" />
              <rect x="70" y="80" width="100" height="120" rx="10" fill="#991b1b" opacity="0.6" transform="translate(5, 8) rotate(-2 120 120)" />
              
              {/* Trash Can Body (Red) */}
              <path d="M 70 80 L 170 80 L 155 200 C 155 205, 150 210, 145 210 L 95 210 C 90 210, 85 205, 85 200 Z" fill="#ef4444" />
              <path d="M 70 80 L 120 80 L 120 210 L 95 210 C 90 210, 85 205, 85 200 Z" fill="#f87171" opacity="0.5" />
              
              {/* Vertical Ribs */}
              <rect x="95" y="95" width="6" height="95" rx="3" fill="#b91c1c" />
              <rect x="117" y="95" width="6" height="95" rx="3" fill="#b91c1c" />
              <rect x="139" y="95" width="6" height="95" rx="3" fill="#b91c1c" />
              
              {/* Magical Data Sucking In */}
              <g style={{ animation: 'suckIn 1.5s ease-in-out infinite' }}>
                <rect x="100" y="60" width="40" height="15" rx="2" fill="#60a5fa" />
                <rect x="110" y="40" width="20" height="10" rx="2" fill="#34d399" />
                <rect x="90" y="20" width="60" height="10" rx="2" fill="#fbbf24" />
              </g>

              {/* Animated Lid */}
              <g style={{ transformOrigin: '70px 80px', animation: 'openLid 2.5s infinite ease-in-out' }}>
                <rect x="60" y="70" width="120" height="12" rx="4" fill="#dc2626" />
                <rect x="100" y="55" width="40" height="15" rx="4" fill="#dc2626" />
                <rect x="60" y="70" width="60" height="12" rx="4" fill="#f87171" opacity="0.5" />
              </g>
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
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-red-300' : i % 3 === 1 ? 'text-rose-400' : 'text-orange-400'}`}
                  style={{
                    '--tx': tx,
                    '--ty': ty,
                    animation: `floatUpFade 1.5s ease-out forwards ${0.3 + Math.random() * 0.3}s`
                  } as React.CSSProperties}
                >
                  {i % 2 === 0 ? (
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
                  ) : (
                    <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
                  )}
                </svg>
              )
            })}
            
            <h2 className="text-4xl font-extrabold text-destructive drop-shadow-lg tracking-tight text-center z-50">
              Goal Deleted!
            </h2>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
