import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { FolderGit2, Plus, Trash2, Edit2, X, Github, ExternalLink, Image as ImageIcon, Eye, PlayCircle, Target, CheckCircle2, ListTodo, Circle } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { ProjectRecord, Goal } from '../../types'
import { normalizeUrl } from '../../lib/utils'

export default function ProjectsPortfolio() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingProject, setViewingProject] = useState<ProjectRecord | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [slideshowActive, setSlideshowActive] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false)

  // Auto-advance slideshow
  useEffect(() => {
    let interval: any
    const allMedia = viewingProject?.screenshots || []
    if (slideshowActive && allMedia.length > 0 && !isSlideshowPaused) {
      interval = setInterval(() => {
        setSlideIndex((prev) => (prev + 1) % allMedia.length)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [slideshowActive, viewingProject, isSlideshowPaused])

  // Escape key to close and space key to pause slideshow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!slideshowActive) return

      const tag = document.activeElement?.tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true'
      if (isInput) return

      if (e.key === 'Escape') {
        setSlideshowActive(false)
      }

      if (e.key === ' ') {
        e.preventDefault()
        setIsSlideshowPaused(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && slideshowActive) {
        setIsSlideshowPaused(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [slideshowActive])

  const defaultForm: Partial<ProjectRecord> = {
    title: '', description: '', status: 'Active', startDate: '', endDate: '', technologies: [], gitUrl: '', websiteUrl: '', screenshots: [], attachments: [], relatedSkills: []
  }
  const [form, setForm] = useState<Partial<ProjectRecord>>(defaultForm)

  const [technologiesInput, setTechnologiesInput] = useState('')

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('projects', {})
      const sorted = data.sort((a: any, b: any) => {
        const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      setProjects(sorted)

      // @ts-ignore
      const goalsData = await window.api.db.find('goals', {})
      setGoals(goalsData)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const getProjectStats = (projectId: string, originalStatus: string) => {
    const linkedGoals = goals.filter(g => g.projectId === projectId);
    if (linkedGoals.length === 0) return { progress: null, status: originalStatus, goals: [] };

    const completedGoals = linkedGoals.filter(g => {
      if (g.status !== 'Completed') return false;
      if (g.subGoals && g.subGoals.length > 0) {
        return g.subGoals.every(sg => sg.completed);
      }
      return true;
    });

    const progress = Math.round((completedGoals.length / linkedGoals.length) * 100);
    const isCompleted = completedGoals.length === linkedGoals.length;
    
    // Automatically determine status
    const effectiveStatus = isCompleted ? 'Completed' : (originalStatus === 'Completed' ? 'Active' : originalStatus);

    return { progress, status: effectiveStatus, goals: linkedGoals };
  }

  useEffect(() => { loadData() }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && projects.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`project-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, projects.length])

  const handleSave = async () => {
    try {
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('projects', { _id: editingId }, { $set: { ...form, updatedAt: Date.now() } }, {})
        NotificationEngine.notify('success', 'Project Updated', `"${form.title}" was updated.`, 'Career')
      } else {
        // @ts-ignore
        await window.api.db.insert('projects', { ...form, createdAt: Date.now(), updatedAt: Date.now() })
        NotificationEngine.notify('success', 'Project Added', `Added "${form.title}".`, 'Career')
        setShowSuccessOverlay(true)
        setTimeout(() => setShowSuccessOverlay(false), 3000)
      }
      setIsAdding(false)
      setEditingId(null)
      loadData()
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (isAdding) {
          e.preventDefault()
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [isAdding, form, editingId])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Delete this project?')) return
    try {
      // Find all linked goals
      const linkedGoals = goals.filter(g => g.projectId === id)
      for (const goal of linkedGoals) {
        // @ts-ignore
        await window.api.db.update('goals', { _id: goal._id }, { $set: { projectId: null, updatedAt: Date.now() } }, {})
      }

      // @ts-ignore
      await window.api.db.remove('projects', { _id: id }, {})
      NotificationEngine.notify('info', 'Project Deleted', `"${title}" was removed and ${linkedGoals.length} goals were unlinked.`, 'Career')
      loadData()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: ProjectRecord) => {
    setForm(record)
    setTechnologiesInput(record.technologies?.join(', ') || '')
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAttachScreenshot = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, screenshots: [...(form.screenshots || []), result.files[0].filePath] })
    }
  }

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) return
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  return (
    <div className="h-full bg-background animate-in fade-in duration-500 relative overflow-hidden flex flex-col">
      <div 
        ref={scrollContainerRef}
        className={`absolute inset-0 overflow-y-auto p-8 z-10 scrollbar-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FolderGit2 className="text-pink-500" />
              Projects Portfolio
            </h1>
            <p className="text-muted-foreground mt-1">Showcase your personal and professional projects.</p>
          </div>
          {!isAdding && (
            <button onClick={() => { setForm(defaultForm); setTechnologiesInput(''); setEditingId(null); setIsAdding(true) }} className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 font-medium flex items-center gap-2">
              <Plus size={18} /> Add Project
            </button>
          )}
        </div>

        {isAdding ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Project' : 'Add Project'}</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Project Title</label>
                <input autoFocus type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full p-2 bg-background border border-border rounded-md">
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="month" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="month" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Technologies Used (comma separated)</label>
                <input type="text" value={technologiesInput} onChange={e => setTechnologiesInput(e.target.value)} onBlur={() => {
                  const parts = technologiesInput.split(',')
                  const processed = parts.map(s => s.trim()).filter(Boolean)
                  setForm({ ...form, technologies: processed })
                }} className="w-full p-2 bg-background border border-border rounded-md" placeholder="React, Tailwind, Node.js" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GitHub / Git Repository URL</label>
                <input type="text" value={form.gitUrl || ''} onChange={e => setForm({ ...form, gitUrl: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Live Website URL</label>
                <input type="text" value={form.websiteUrl || ''} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} className="w-full p-2 bg-background border border-border rounded-md" />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Screenshots</label>
              <div className="flex flex-wrap gap-4">
                {form.screenshots?.map((img, i) => (
                  <div key={i} className="relative group rounded-md overflow-hidden border border-border w-24 h-24">
                    <img src={normalizeUrl(img)} alt="screenshot" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, screenshots: form.screenshots?.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                  </div>
                ))}
                <button onClick={handleAttachScreenshot} className="flex flex-col items-center justify-center w-24 h-24 bg-background border border-dashed border-border rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <ImageIcon size={20} className="mb-1" />
                  <span className="text-xs font-medium">Add Image</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 font-medium">Save Project</button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(record => {
            const stats = getProjectStats(record._id!, record.status)
            const displayStatus = stats.status
            const hasGoals = stats.goals.length > 0

            return (
              <div key={record._id} id={`project-${record._id}`} className="bg-card border border-border rounded-2xl shadow-sm relative group hover:border-pink-500/50 transition-all duration-1000 flex flex-col overflow-hidden">

                {record.screenshots && record.screenshots.length > 0 && (
                  <div className="h-48 w-full border-b border-border bg-accent/30 relative">
                    <img src={normalizeUrl(record.screenshots[0])} alt={record.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border">
                    <button onClick={() => setViewingProject(record)} className="p-1.5 rounded-md hover:bg-accent text-foreground" title="View Details"><Eye size={14} /></button>
                    <button onClick={() => openEdit(record)} className="p-1.5 rounded-md hover:bg-accent text-foreground" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(record._id!, record.title!)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 size={14} /></button>
                  </div>

                  <div className="flex justify-between items-start mb-2 pr-24">
                    <h3 onClick={() => setViewingProject(record)} className="text-xl font-bold cursor-pointer hover:text-pink-500 transition-colors decoration-pink-500/30 hover:underline underline-offset-4">{record.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${displayStatus === 'Completed' ? 'bg-green-500/10 text-green-500' : displayStatus === 'Active' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                      {displayStatus}
                    </span>
                  </div>

                  {hasGoals && stats.progress !== null && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                        <span className="flex items-center gap-1"><Target size={12}/> Goals Progress</span>
                        <span>{stats.progress}%</span>
                      </div>
                      <div className="w-full bg-accent rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${stats.progress === 100 ? 'bg-green-500' : 'bg-pink-500'}`} style={{ width: `${stats.progress}%` }}></div>
                      </div>
                    </div>
                  )}

                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">{record.description}</p>
                  
                  {record.technologies && record.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {record.technologies.map(t => (
                        <span key={t} className="bg-pink-500/10 text-pink-500 px-2 py-0.5 rounded border border-pink-500/20 text-xs font-medium">{t}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-border mt-auto">
                    {record.gitUrl && (
                      <a href={record.gitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <Github size={16} /> Repository
                      </a>
                    )}
                    {record.websiteUrl && (
                      <a href={record.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink size={16} /> Live App
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {projects.length === 0 && !isAdding && (
          <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground">
            No projects added yet. Share what you've been working on!
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      {viewingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingProject(null)}></div>
          <div className="relative bg-card border border-border w-full max-w-4xl max-h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {viewingProject.screenshots && viewingProject.screenshots.length > 0 && (
              <div 
                className="h-64 w-full border-b border-border bg-accent/30 shrink-0 cursor-pointer group relative"
                onClick={() => { setSlideIndex(0); setSlideshowActive(true); }}
              >
                <img src={normalizeUrl(viewingProject.screenshots[0])} alt={viewingProject.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <PlayCircle size={48} className="text-white/80 drop-shadow-lg" />
                </div>
              </div>
            )}
            
            <button onClick={() => setViewingProject(null)} className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur rounded-full hover:bg-background/80 transition-colors z-10 text-foreground border border-border">
              <X size={20} />
            </button>

            <div 
              className={`p-6 md:p-10 overflow-y-auto scrollbar-thin ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              ref={(el) => {
                // We can reuse the main scroll logic by overriding the ref during modal open
                // But a safer approach is inline handlers that use the element directly
                if (el && !el.onmousedown) {
                  let isDown = false;
                  let startY = 0;
                  let scrollTop = 0;
                  
                  el.onmousedown = (e) => {
                    isDown = true;
                    startY = e.pageY - el.offsetTop;
                    scrollTop = el.scrollTop;
                    el.classList.add('cursor-grabbing');
                    el.classList.remove('cursor-grab');
                  };
                  el.onmouseleave = () => {
                    isDown = false;
                    el.classList.remove('cursor-grabbing');
                    el.classList.add('cursor-grab');
                  };
                  el.onmouseup = () => {
                    isDown = false;
                    el.classList.remove('cursor-grabbing');
                    el.classList.add('cursor-grab');
                  };
                  el.onmousemove = (e) => {
                    if (!isDown) return;
                    e.preventDefault();
                    const y = e.pageY - el.offsetTop;
                    const walk = (y - startY) * 1.5;
                    el.scrollTop = scrollTop - walk;
                  };
                }
              }}
            >
              <div className="flex justify-between items-start mb-4 pr-12">
                <h2 className="text-3xl font-extrabold">{viewingProject.title}</h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getProjectStats(viewingProject._id!, viewingProject.status).status === 'Completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : getProjectStats(viewingProject._id!, viewingProject.status).status === 'Active' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                    {getProjectStats(viewingProject._id!, viewingProject.status).status}
                  </span>
                  {viewingProject.screenshots && viewingProject.screenshots.length > 0 && (
                    <button onClick={() => { setSlideIndex(0); setSlideshowActive(true) }} className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-primary/20">
                      <PlayCircle size={18} /> Slideshow
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-8">
                <span>{new Date(viewingProject.startDate).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
                {viewingProject.endDate && (
                  <>
                    <span>—</span>
                    <span>{new Date(viewingProject.endDate).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
                  </>
                )}
              </div>

              {viewingProject.technologies && viewingProject.technologies.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingProject.technologies.map(t => (
                      <span key={t} className="bg-pink-500/10 text-pink-500 px-3 py-1 rounded-md border border-pink-500/20 text-sm font-bold shadow-sm">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">About this project</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-pink-500 hover:prose-a:text-pink-600 whitespace-pre-wrap">
                  {viewingProject.description || <span className="text-muted-foreground italic">No description provided.</span>}
                </div>
              </div>

              {(() => {
                const stats = getProjectStats(viewingProject._id!, viewingProject.status);
                if (stats.goals.length === 0) return null;
                return (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Linked Goals</h4>
                      <span className="text-xs font-bold bg-accent px-2 py-0.5 rounded-full">{stats.progress}% Completed</span>
                    </div>
                    <div className="space-y-2">
                      {stats.goals.map(g => {
                        const isCompleted = g.status === 'Completed' && (!g.subGoals || g.subGoals.every(sg => sg.completed));
                        return (
                          <div key={g._id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
                            {isCompleted ? <CheckCircle2 size={16} className="text-green-500 shrink-0" /> : <Circle size={16} className="text-muted-foreground shrink-0" />}
                            <span className={`text-sm font-medium flex-1 ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>{g.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">{g.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {viewingProject.screenshots && viewingProject.screenshots.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Gallery</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {viewingProject.screenshots.map((img, i) => (
                      <div 
                        key={i} 
                        className="aspect-video rounded-xl overflow-hidden border border-border shadow-sm group relative cursor-pointer"
                        onClick={() => { setSlideIndex(i); setSlideshowActive(true); }}
                      >
                        <img src={normalizeUrl(img)} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye size={32} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-6 border-t border-border mt-auto">
                {viewingProject.gitUrl && (
                  <a href={viewingProject.gitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/80 text-sm font-bold transition-colors border border-border shadow-sm">
                    <Github size={18} /> Source Code
                  </a>
                )}
                {viewingProject.websiteUrl && (
                  <a href={viewingProject.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold transition-colors shadow-sm">
                    <ExternalLink size={18} /> Visit Project
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <style>{`
            @keyframes popAndRotateRocket {
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
            @keyframes flyRocket {
              0% { transform: translate(-30px, 30px); }
              100% { transform: translate(30px, -30px); }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotateRocket 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D App Window SVG Base */}
            <svg width="300" height="240" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back shadows for 3D effect */}
              <rect x="25" y="35" width="250" height="180" rx="10" fill="#be185d" opacity="0.4" transform="rotate(-4 150 120)" />
              <rect x="15" y="25" width="250" height="180" rx="10" fill="#db2777" opacity="0.6" transform="rotate(-2 150 120)" />
              
              {/* Main Window Body */}
              <rect x="10" y="15" width="250" height="180" rx="10" fill="currentColor" className="text-card stroke-border" strokeWidth="2" />
              
              {/* Window Header */}
              <path d="M10 25 C10 19.4772 14.4772 15 20 15 L250 15 C255.523 15 260 19.4772 260 25 L260 45 L10 45 L10 25 Z" fill="#fbcfe8" />
              <circle cx="25" cy="30" r="5" fill="#f43f5e" />
              <circle cx="45" cy="30" r="5" fill="#fbbf24" />
              <circle cx="65" cy="30" r="5" fill="#34d399" />
              
              {/* Code Blocks inside Window */}
              <rect x="30" y="70" width="80" height="8" rx="4" fill="#ec4899" />
              <rect x="30" y="90" width="120" height="6" rx="3" fill="#f472b6" opacity="0.5" />
              <rect x="50" y="110" width="100" height="6" rx="3" fill="#f472b6" opacity="0.5" />
              <rect x="50" y="130" width="60" height="6" rx="3" fill="#f472b6" opacity="0.5" />
              
              {/* Rocket icon */}
              <g style={{ animation: 'flyRocket 2s ease-in-out infinite alternate' }}>
                <path d="M180 80 C180 80, 200 60, 220 60 C220 80, 200 100, 200 100 L180 80 Z" fill="#ec4899" />
                <path d="M185 85 L195 95" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M175 95 L185 105 L205 85 L195 75 Z" fill="#db2777" />
                <circle cx="190" cy="90" r="3" fill="#fdf2f8" />
                {/* Fire */}
                <path d="M175 95 L165 110 L185 105 Z" fill="#fbbf24" />
              </g>
            </svg>

            {/* Flying Particles */}
            {[...Array(15)].map((_, i) => {
              const angle = (i * 24 * Math.PI) / 180;
              const dist = 120 + Math.random() * 60;
              const tx = `${Math.cos(angle) * dist}px`;
              const ty = `${Math.sin(angle) * dist}px`;
              return (
                <svg 
                  key={`star-${i}`} 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-8 ${i % 3 === 0 ? 'text-pink-400' : i % 3 === 1 ? 'text-purple-400' : 'text-white'}`}
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
            
            <h2 className="text-4xl font-extrabold text-pink-600 dark:text-pink-400 drop-shadow-lg tracking-tight text-center z-50">
              Project Saved!
            </h2>
          </div>
        </div>
      )}

      {/* Slideshow Overlay */}
      {slideshowActive && viewingProject && viewingProject.screenshots && viewingProject.screenshots.length > 0 && createPortal(
        <div
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-1000"
          onMouseDown={() => setIsSlideshowPaused(true)}
          onMouseUp={() => setIsSlideshowPaused(false)}
          onMouseLeave={() => setIsSlideshowPaused(false)}
        >
          <button onClick={() => setSlideshowActive(false)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-colors z-10">
            <X size={32} />
          </button>
          <div className="absolute top-6 left-6 text-white text-xl font-black drop-shadow-md z-10 opacity-70">
            {slideIndex + 1} / {viewingProject.screenshots.length}
          </div>

          <div className="w-full h-full flex items-center justify-center relative p-12">
            <img 
              key={viewingProject.screenshots[slideIndex]} 
              src={normalizeUrl(viewingProject.screenshots[slideIndex])} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-700" 
            />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full text-white text-lg font-medium shadow-2xl">
              {viewingProject.title}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
