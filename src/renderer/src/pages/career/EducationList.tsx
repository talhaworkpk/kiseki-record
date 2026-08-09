import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { GraduationCap, Plus, Trash2, Edit2, X, Upload, FileText } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { EducationRecord } from '../../types'
import { normalizeUrl } from '../../lib/utils'

export default function EducationList() {
  const [education, setEducation] = useState<EducationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const defaultForm: Partial<EducationRecord> = {
    school: '', degree: '', field: '', startDate: '', endDate: '', status: 'Current', grade: '', description: '', subjects: [], activities: [], achievements: [], attachments: [], photos: []
  }
  const [form, setForm] = useState<Partial<EducationRecord>>(defaultForm)

  const loadData = async () => {
    try {
      // @ts-ignore
      const data = await window.api.db.find('education', {})
      const sorted = data.sort((a: any, b: any) => {
        const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      })
      setEducation(sorted)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const location = useLocation()
  useEffect(() => {
    const highlightId = new URLSearchParams(location.search).get('highlight')
    if (highlightId && !loading && education.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`education-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50')
          setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'shadow-2xl', 'shadow-primary/40', 'animate-[pulse_2s_ease-in-out_3]', 'z-50'), 4000)
        }
      }, 500)
    }
  }, [location.search, loading, education.length])

  const handleSave = async () => {
    try {
      if (editingId) {
        // @ts-ignore
        await window.api.db.update('education', { _id: editingId }, { $set: { ...form, updatedAt: Date.now() } })
        NotificationEngine.notify('success', 'Education Updated', `"${form.degree || form.school}" was updated.`, 'Career')
      } else {
        // @ts-ignore
        await window.api.db.insert('education', { ...form, createdAt: Date.now(), updatedAt: Date.now() })
        NotificationEngine.notify('success', 'Education Added', `Added "${form.degree || form.school}".`, 'Career')
        setShowSuccessOverlay(true)
        setTimeout(() => setShowSuccessOverlay(false), 3000)
      }
      setIsAdding(false)
      setEditingId(null)
      loadData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm('Delete this record?')) return
    try {
      // @ts-ignore
      await window.api.db.remove('education', { _id: id }, {})
      NotificationEngine.notify('info', 'Education Deleted', `"${title}" was removed.`, 'Career')
      loadData()
    } catch (err) { console.error(err) }
  }

  const openEdit = (record: EducationRecord) => {
    setForm(record)
    setEditingId(record._id!)
    setIsAdding(true)
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAttach = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, attachments: [...(form.attachments || []), result.files[0].filePath] })
    }
  }

  const handleAttachPhoto = async () => {
    // @ts-ignore
    const result = await window.api.attachment.add()
    if (result.success && result.files && result.files.length > 0) {
      setForm({ ...form, photos: [...(form.photos || []), result.files[0].filePath] })
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
              <GraduationCap className="text-primary" /> 
              Education
            </h1>
            <p className="text-muted-foreground mt-1">Manage your academic history and qualifications.</p>
          </div>
          {!isAdding && (
            <button onClick={() => { setForm(defaultForm); setEditingId(null); setIsAdding(true) }} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium flex items-center gap-2">
              <Plus size={18}/> Add Education
            </button>
          )}
        </div>

      {isAdding ? (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Education' : 'Add Education'}</h2>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-md"><X size={20}/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">School / University</label>
              <input autoFocus type="text" value={form.school} onChange={e => setForm({...form, school: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Degree</label>
              <input type="text" value={form.degree} onChange={e => setForm({...form, degree: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Field of Study</label>
              <input type="text" value={form.field} onChange={e => setForm({...form, field: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full p-2 bg-background border border-border rounded-md">
                <option value="Current">Current</option>
                <option value="Graduated">Graduated</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" value={form.endDate || ''} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grade / GPA</label>
              <input type="text" value={form.grade || ''} onChange={e => setForm({...form, grade: e.target.value})} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full p-2 bg-background border border-border rounded-md" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Subjects (comma separated)</label>
              <input type="text" value={form.subjects?.join(', ') || ''} onChange={e => setForm({...form, subjects: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} className="w-full p-2 bg-background border border-border rounded-md" placeholder="Math, Biology, Chemistry" />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Photos</label>
            <div className="flex flex-wrap gap-4">
              {form.photos?.map((img, i) => (
                <div key={i} className="relative group rounded-md overflow-hidden border border-border w-24 h-24">
                  <img src={normalizeUrl(img)} alt="photo" className="w-full h-full object-cover" />
                  <button onClick={() => setForm({...form, photos: form.photos?.filter((_, idx) => idx !== i)})} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                </div>
              ))}
              <button onClick={handleAttachPhoto} className="flex flex-col items-center justify-center w-24 h-24 bg-background border border-dashed border-border rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Upload size={20} className="mb-1"/>
                <span className="text-xs font-medium">Add Photo</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Attachments (Transcripts, Student Card, etc.)</label>
            <div className="flex flex-wrap gap-2">
              {form.attachments?.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded-md text-sm">
                  <a href={normalizeUrl(att)} target="_blank" className="hover:underline truncate max-w-[200px]">{att ? att.split(/[\\/]/).pop() : 'Attachment'}</a>
                  <button onClick={() => setForm({...form, attachments: form.attachments?.filter((_, idx) => idx !== i)})} className="text-destructive hover:text-destructive/80"><X size={14}/></button>
                </div>
              ))}
              <button onClick={handleAttach} className="flex items-center gap-2 bg-background border border-dashed border-border px-4 py-1.5 rounded-md text-sm hover:bg-accent">
                <Upload size={14}/> Add File
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-accent rounded-md hover:bg-accent/80 font-medium">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium">Save Record</button>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        {education.map(record => (
          <div key={record._id} id={`education-${record._id}`} className="bg-card border border-border p-6 rounded-2xl shadow-sm relative group hover:border-primary/50 transition-all duration-1000">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              <button onClick={() => openEdit(record)} className="p-2 bg-background border border-border rounded-md hover:bg-accent"><Edit2 size={16}/></button>
              <button onClick={() => handleDelete(record._id!, record.degree || record.school)} className="p-2 bg-background border border-border text-destructive rounded-md hover:bg-destructive/10"><Trash2 size={16}/></button>
            </div>
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                <GraduationCap size={24}/>
              </div>
              <div>
                <h3 className="text-xl font-bold">{record.school}</h3>
                <p className="text-lg text-muted-foreground">{record.degree} in {record.field}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm bg-accent/30 p-4 rounded-xl">
              <div>
                <span className="text-muted-foreground block mb-1">Status</span>
                <span className={`font-medium px-2 py-0.5 rounded-md ${record.status==='Current'?'bg-green-500/10 text-green-500':record.status==='Graduated'?'bg-blue-500/10 text-blue-500':'bg-red-500/10 text-red-500'}`}>{record.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Duration</span>
                <span className="font-medium">{record.startDate ? new Date(record.startDate).getFullYear() : ''} - {record.endDate ? new Date(record.endDate).getFullYear() : 'Present'}</span>
              </div>
              {record.grade && (
                <div>
                  <span className="text-muted-foreground block mb-1">Grade/GPA</span>
                  <span className="font-medium">{record.grade}</span>
                </div>
              )}
            </div>

            {record.description && <p className="text-muted-foreground text-sm mb-4">{record.description}</p>}

            {((record.photos && record.photos.length > 0) || (record.attachments && record.attachments.length > 0)) && (
              <div className="mt-6 pt-6 border-t border-border space-y-4">
                {record.photos && record.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {record.photos.map(img => (
                      <img key={img} src={normalizeUrl(img)} alt="Education" className="h-24 w-36 object-cover rounded-md border border-border shrink-0 hover:scale-105 transition-transform" />
                    ))}
                  </div>
                )}
                {record.attachments && record.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {record.attachments.map(att => (
                      <a key={att} href={normalizeUrl(att)} target="_blank" className="flex items-center gap-1.5 text-xs font-medium bg-accent px-3 py-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors">
                        <FileText size={14}/> {att ? att.split(/[\\/]/).pop() : 'Attachment'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
            
          </div>
        ))}
        {education.length === 0 && !isAdding && (
          <div className="text-center p-12 border border-dashed border-border rounded-xl text-muted-foreground">
            No education records added yet.
          </div>
        )}
      </div>
      </div>

      {/* 3D Success Overlay */}
      {showSuccessOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/30 via-background/80 to-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <style>{`
            @keyframes popAndRotateHat {
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
            @keyframes swingTassel {
              0% { transform: rotate(10deg); }
              100% { transform: rotate(-10deg); }
            }
          `}</style>
          <div className="relative flex flex-col items-center justify-center gap-8" style={{ animation: 'popAndRotateHat 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            {/* 3D Graduation Hat SVG */}
            <svg width="240" height="200" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              {/* Back Drop Shadow */}
              <path d="M 20 80 L 120 40 L 220 80 L 120 120 Z" fill="#312e81" opacity="0.4" transform="translate(10, 20)" />
              
              {/* Hat Base/Cap */}
              <path d="M 70 100 L 170 100 L 170 140 C 170 155, 150 165, 120 165 C 90 165, 70 155, 70 140 Z" fill="#4338ca" />
              <path d="M 70 100 L 170 100 L 170 140 C 170 155, 150 165, 120 165 C 90 165, 70 155, 70 140 Z" fill="#3730a3" opacity="0.5" transform="translate(-2, 0)" />
              
              {/* Top Board */}
              <path d="M 20 80 L 120 40 L 220 80 L 120 120 Z" fill="#4f46e5" />
              <path d="M 20 80 L 120 40 L 220 80 L 120 120 Z" fill="#6366f1" opacity="0.7" transform="scale(0.95) translate(6, 4)" />
              
              {/* Button */}
              <circle cx="120" cy="80" r="8" fill="#c7d2fe" />
              
              {/* Tassel */}
              <g style={{ animation: 'swingTassel 2s ease-in-out infinite alternate', transformOrigin: '120px 80px' }}>
                <path d="M 120 80 Q 150 100, 180 130" fill="none" stroke="#fbbf24" strokeWidth="4" />
                <path d="M 175 130 L 185 130 L 190 160 L 170 160 Z" fill="#f59e0b" />
                <path d="M 170 160 L 175 180 M 175 160 L 178 185 M 180 160 L 182 185 M 185 160 L 185 180 M 190 160 L 188 175" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
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
                  className={`absolute top-1/2 left-1/2 -ml-3 -mt-10 ${i % 3 === 0 ? 'text-indigo-400' : i % 3 === 1 ? 'text-purple-400' : 'text-yellow-400'}`}
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
            
            <h2 className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 drop-shadow-lg tracking-tight text-center z-50">
              Education Saved!
            </h2>
          </div>
        </div>
      )}
    </div>
  )
}
