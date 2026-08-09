import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import { Goal } from '../types'
import { ShootingStars } from '../components/ShootingStars'

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('goals', { _id: id }, {})
      fetchGoals()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: Goal) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
  }

  return (
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
                  <button onClick={() => handleDelete(goal._id!)} className="p-1.5 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10"><Trash2 size={14}/></button>
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
    </div>
  )
}
