import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Link as LinkIcon, Target, FolderGit2, BrainCircuit, Award, X, Clock, MoonStar } from 'lucide-react'
import { dreamService } from '../../lib/domain/DreamService'
import { projectService } from '../../lib/domain/ProjectService'
import { goalService } from '../../lib/domain/GoalService'
import { skillService } from '../../lib/domain/SkillService'
import { Dream } from '../../types'
import { DREAM_CATEGORIES } from '../../lib/constants/dreams'
import DreamForm from './DreamForm'
import { normalizeUrl } from '../../lib/utils'
import LinkSelectorModal from './LinkSelectorModal'

export default function DreamDetail() {
  const { dreamId } = useParams<{ dreamId: string }>()
  const navigate = useNavigate()
  
  const [dream, setDream] = useState<Dream | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)

  const [relatedGoals, setRelatedGoals] = useState<any[]>([])
  const [relatedProjects, setRelatedProjects] = useState<any[]>([])
  const [relatedSkills, setRelatedSkills] = useState<any[]>([])
  const [relatedCertificates, setRelatedCertificates] = useState<any[]>([])

  const [linkType, setLinkType] = useState<'Goal' | 'Project' | 'Skill' | 'Certificate' | null>(null)
  
  const [countdown, setCountdown] = useState<string>('')

  const loadRelations = async (id: string) => {
    try {
      const dreamGoals = await dreamService.getDreamGoals(id);
      const goalIds = dreamGoals.map(dg => dg.goalId);
      const goalRecords = goalIds.length > 0 ? await goalService.find({ _id: { $in: goalIds } }) : [];
      setRelatedGoals(goalRecords);

      const dreamProjects = await dreamService.getDreamProjects(id);
      const projectIds = dreamProjects.map(dp => dp.projectId);
      const projectRecords = projectIds.length > 0 ? await projectService.find({ _id: { $in: projectIds } }) : [];
      setRelatedProjects(projectRecords);

      const dreamSkills = await dreamService.getDreamSkills(id);
      const skillIds = dreamSkills.map(ds => ds.skillId);
      const skillRecords = skillIds.length > 0 ? await skillService.find({ _id: { $in: skillIds } }) : [];
      setRelatedSkills(skillRecords);

      const dreamCertificates = await dreamService.getDreamCertificates(id);
      const certIds = dreamCertificates.map(dc => dc.certificateId);
      // @ts-ignore
      const certificateRecords = certIds.length > 0 ? await window.api.db.find('certificates', { _id: { $in: certIds } }) : [];
      setRelatedCertificates(certificateRecords);
    } catch (err) {
      console.error("Failed to load relations:", err);
    }
  }

  const loadDream = async () => {
    if (!dreamId) return
    setLoading(true)
    try {
      const data = await dreamService.getById(dreamId)
      if (data) {
        setDream(data)
        await loadRelations(dreamId)
      } else {
        navigate('/dreams')
      }
    } catch (err) {
      console.error(err)
      navigate('/dreams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDream()
  }, [dreamId])

  useEffect(() => {
    if (!dream?.targetDate || dream.status === 'Achieved') {
      setCountdown('')
      return
    }
    
    let targetTime = 0
    const parts = dream.targetDate.split('-')
    if (parts.length >= 3) {
      targetTime = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 23, 59, 59, 999).getTime()
    } else {
      targetTime = new Date(dream.targetDate).getTime()
    }
    
    const updateCountdown = () => {
      const now = Date.now()
      const diff = targetTime - now
      if (diff <= 0) {
        setCountdown('Target date reached / missed')
        
        // Trigger notification if not already triggered
        const key = `dream_missed_${dream._id}`
        // @ts-ignore
        window.api.db.find('systemUnlocks', { key }).then(unlocks => {
          if (unlocks.length === 0) {
            // @ts-ignore
            window.api.db.insert('systemUnlocks', { key, unlockedAt: Date.now() }).then(() => {
              // 1. In-App Toast
              const notif = { title: 'Dream Target Missed', message: `You missed the target date for your dream: ${dream.title}`, type: 'dream', sourceModule: 'Dreams', targetPath: `/dreams/view/${dream._id}`, isRead: false, timestamp: Date.now() }
              // @ts-ignore
              window.api.db.insert('notifications', notif).then(saved => {
                window.dispatchEvent(new CustomEvent('app-notification', { detail: saved }))
              })

              // 2. Desktop Notification
              // @ts-ignore
              window.api.notifications.getSettings().then(settings => {
                 if (settings.desktopNotificationsEnabled && settings.dreamNotificationEnabled) {
                   // @ts-ignore
                   window.api.notifications.triggerDesktop('dream', 'Dream Target Missed', `You missed the target date for your dream: ${dream.title}`, `/dreams/view/${dream._id}`)
                 }
              })
            })
          }
        })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }
    
    updateCountdown()
    const intval = setInterval(updateCountdown, 1000)
    return () => clearInterval(intval)
  }, [dream])

  // Keyboard Shortcuts for Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDeleteConfirm) {
        if (e.key === 'Escape') setShowDeleteConfirm(false)
        if (e.key === 'Enter') confirmDelete()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteConfirm, dream])

  const confirmDelete = async () => {
    if (!dream) return
    try {
      await dreamService.delete(dream._id!)
      setShowDeleteConfirm(false)
      setShowDeleteSuccess(true)
      setTimeout(() => navigate('/dreams'), 2500)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLink = async (ids: string[]) => {
    if (!dreamId || !linkType) return;
    try {
      for (const id of ids) {
        if (linkType === 'Goal') await dreamService.linkDreamToGoal(dreamId, id);
        else if (linkType === 'Project') await dreamService.linkDreamToProject(dreamId, id);
        else if (linkType === 'Skill') await dreamService.linkDreamToSkill(dreamId, id);
        else if (linkType === 'Certificate') await dreamService.linkDreamToCertificate(dreamId, id);
      }
      setLinkType(null);
      await loadRelations(dreamId);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to link items: ${err.message || 'Ensure the application backend has been restarted.'}`);
    }
  }

  const handleUnlink = async (type: 'Goal' | 'Project' | 'Skill' | 'Certificate', id: string) => {
    if (!dreamId) return;
    try {
      if (type === 'Goal') await dreamService.unlinkDreamFromGoal(dreamId, id);
      else if (type === 'Project') await dreamService.unlinkDreamFromProject(dreamId, id);
      else if (type === 'Skill') await dreamService.unlinkDreamFromSkill(dreamId, id);
      else if (type === 'Certificate') await dreamService.unlinkDreamFromCertificate(dreamId, id);
      await loadRelations(dreamId);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to unlink item: ${err.message || 'Ensure the application backend has been restarted.'}`);
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let isDragging = false
    let startY = 0
    let scrollTop = 0
    let hasDragged = false

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right click
        isDragging = true
        hasDragged = false
        startY = e.pageY - el.offsetTop
        scrollTop = el.scrollTop
        el.style.cursor = 'grabbing'
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false
        el.style.cursor = ''
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      hasDragged = true
      const y = e.pageY - el.offsetTop
      const walk = (y - startY) * 2 // Scroll-fast
      el.scrollTop = scrollTop - walk
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault()
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('contextmenu', handleContextMenu)

    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [loading, dream])

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>
  if (!dream) return null

  const catDef = DREAM_CATEGORIES.find(c => c.id === dream.category)
  const CatIcon = catDef?.icon

  const isQuantitative = dream.targetAmount !== undefined && dream.currentAmount !== undefined
  const progress = isQuantitative ? Math.min(100, Math.round(((dream.currentAmount || 0) / (dream.targetAmount || 1)) * 100)) : null

  return (
    <div ref={scrollRef} className="h-full bg-background overflow-y-auto animate-in fade-in duration-500">
      
      {/* Header Image */}
      {dream.imageUrl ? (
        <div className="h-64 w-full relative bg-accent">
          <img src={normalizeUrl(dream.imageUrl)} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        </div>
      ) : (
        <div className="h-32 w-full bg-accent/30 border-b border-border"></div>
      )}

      <div className={`max-w-4xl mx-auto px-8 pb-16 ${dream.imageUrl ? '-mt-20 relative z-10' : 'mt-8'}`}>
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center mb-6">
          <Link to="/dreams" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border">
            <ArrowLeft size={16} /> Back to Dreams
          </Link>
          <div className="flex gap-2">
            <button onClick={() => setShowEdit(true)} className="p-2 bg-background border border-border hover:bg-accent rounded-lg transition-colors">
              <Edit size={16} />
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 bg-background border border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 rounded-lg transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-accent px-3 py-1 rounded-full">
               {CatIcon && <CatIcon size={14} />} {catDef?.displayName || 'Other'}
            </div>
            {dream.status !== 'Active' && (
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground border border-border px-3 py-1 rounded-full">
                {dream.status}
              </div>
            )}
          </div>

          <h1 className="text-4xl font-black mb-6">{dream.title}</h1>

          {isQuantitative && (
            <div className="mb-8 p-6 bg-accent/30 border border-border rounded-2xl">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <div className="text-sm font-bold text-muted-foreground mb-1">Progress</div>
                  <div className="text-2xl font-black">
                    {dream.currentAmount?.toLocaleString()} <span className="text-muted-foreground text-lg font-bold">/ {dream.targetAmount?.toLocaleString()} {dream.targetCurrency}</span>
                  </div>
                </div>
                <div className="text-3xl font-black text-primary">{progress}%</div>
              </div>
              <div className="w-full h-3 bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {dream.description && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Description</h3>
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{dream.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {dream.targetDate && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Target Date</h3>
                <div className="font-bold text-lg">{new Date(dream.targetDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                {countdown && (
                  <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${countdown.includes('missed') ? 'text-red-500' : 'text-orange-500'}`}>
                    <Clock size={16} />
                    {countdown}
                  </div>
                )}
              </div>
            )}
            
            {dream.notes && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
                <div className="p-4 bg-accent/50 rounded-xl text-sm whitespace-pre-wrap">{dream.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Relationships */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon size={24} className="text-muted-foreground" /> Related Work
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goals */}
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2"><Target size={18} className="text-blue-500" /> Goals</h3>
                <button onClick={() => setLinkType('Goal')} className="text-xs font-bold text-primary hover:underline">+ Link</button>
              </div>
              {relatedGoals.length === 0 ? <p className="text-xs text-muted-foreground italic">No linked goals</p> : (
                <div className="space-y-2">
                  {relatedGoals.map(g => (
                    <div key={g._id} className="flex justify-between items-center bg-accent/50 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium truncate mr-2">{g.title}</span>
                      <button onClick={() => handleUnlink('Goal', g._id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2"><FolderGit2 size={18} className="text-pink-500" /> Projects</h3>
                <button onClick={() => setLinkType('Project')} className="text-xs font-bold text-primary hover:underline">+ Link</button>
              </div>
              {relatedProjects.length === 0 ? <p className="text-xs text-muted-foreground italic">No linked projects</p> : (
                <div className="space-y-2">
                  {relatedProjects.map(p => (
                    <div key={p._id} className="flex justify-between items-center bg-accent/50 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium truncate mr-2">{p.title}</span>
                      <button onClick={() => handleUnlink('Project', p._id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2"><BrainCircuit size={18} className="text-purple-500" /> Skills</h3>
                <button onClick={() => setLinkType('Skill')} className="text-xs font-bold text-primary hover:underline">+ Link</button>
              </div>
              {relatedSkills.length === 0 ? <p className="text-xs text-muted-foreground italic">No linked skills</p> : (
                <div className="space-y-2">
                  {relatedSkills.map(s => (
                    <div key={s._id} className="flex justify-between items-center bg-accent/50 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium truncate mr-2">{s.name}</span>
                      <button onClick={() => handleUnlink('Skill', s._id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificates */}
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold flex items-center gap-2"><Award size={18} className="text-yellow-500" /> Certificates</h3>
                <button onClick={() => setLinkType('Certificate')} className="text-xs font-bold text-primary hover:underline">+ Link</button>
              </div>
              {relatedCertificates.length === 0 ? <p className="text-xs text-muted-foreground italic">No linked certificates</p> : (
                <div className="space-y-2">
                  {relatedCertificates.map(c => (
                    <div key={c._id} className="flex justify-between items-center bg-accent/50 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium truncate mr-2">{c.name || c.title}</span>
                      <button onClick={() => handleUnlink('Certificate', c._id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {showEdit && (
        <DreamForm 
          initialData={dream}
          onSave={(saved) => {
            setDream(saved)
            setShowEdit(false)
          }}
          onCancel={() => setShowEdit(false)}
        />
      )}

      {/* Modals & Overlays */}
      {linkType && (
        <LinkSelectorModal
          type={linkType}
          existingIds={
            linkType === 'Goal' ? relatedGoals.map(g => g._id) :
            linkType === 'Project' ? relatedProjects.map(p => p._id) :
            linkType === 'Skill' ? relatedSkills.map(s => s._id) :
            relatedCertificates.map(c => c._id)
          }
          onLink={handleLink}
          onClose={() => setLinkType(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && !showDeleteSuccess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground p-0 rounded-2xl shadow-[0_0_50px_-12px_rgba(56,189,248,0.25)] border border-sky-500/20 w-full max-w-md flex flex-col overflow-hidden scale-in-center animate-in zoom-in-95 duration-300">
            <div className="bg-sky-500/10 p-6 flex flex-col items-center justify-center text-center border-b border-sky-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent"></div>
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner mb-4 relative z-10 border border-sky-500/20">
                <Trash2 size={32} className="text-sky-500 drop-shadow-md animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground relative z-10">Delete Dream?</h3>
            </div>
            
            <div className="p-6">
              <p className="text-center text-muted-foreground mb-6">
                Are you sure you want to permanently incinerate this dream? All linked associations will be removed. This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:shadow-blue-500/50"
                >
                  <Trash2 size={16} />
                  Incinerate
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Burn Animation Overlay */}
      {showDeleteSuccess && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden animate-in fade-in duration-300">
          <style>{`
            @keyframes char-paper {
              0% { transform: perspective(500px) rotateX(0deg); }
              100% { transform: perspective(500px) rotateX(45deg) translateY(-20px); }
            }
            @keyframes char-paper-color {
              0% { filter: brightness(1) sepia(0); }
              30% { filter: brightness(0.2) sepia(0.5) hue-rotate(180deg); }
              100% { filter: brightness(0.05) sepia(1) hue-rotate(180deg); }
            }
            @keyframes burn-up {
              0% { height: 128px; opacity: 1; }
              85% { height: 0px; opacity: 1; }
              100% { height: 0px; opacity: 0; }
            }
            @keyframes heat-distortion {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.3); opacity: 0.8; }
            }
            @keyframes text-burn-in {
              0% { transform: scale(0.8) translateY(20px); opacity: 0; filter: blur(10px); }
              50% { transform: scale(0.8) translateY(20px); opacity: 0; filter: blur(10px); }
              70% { transform: scale(1.1) translateY(0); opacity: 1; filter: blur(0px); }
              100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0px); }
            }
          `}</style>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(56,189,248,0.15)_0%,transparent_70%)] rounded-full animate-[heat-distortion_2s_ease-in-out_infinite]" />
            <div className="absolute w-[1000px] h-[1000px] bg-[radial-gradient(circle,rgba(3,105,161,0.1)_0%,transparent_60%)] rounded-full animate-[heat-distortion_3s_ease-in-out_infinite_reverse]" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
            <div className="relative w-40 h-40 mb-12" style={{ animation: 'char-paper 2.5s ease-in forwards' }}>
              
              <div className="absolute top-4 left-0 w-full overflow-hidden flex flex-col items-center" style={{ animation: 'burn-up 2.5s ease-in forwards' }}>
                
                <div 
                     className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-indigo-100 via-sky-100 to-purple-100 rounded-full shadow-[0_0_40px_rgba(129,140,248,0.4)] border-[3px] border-white/80 flex flex-col items-center justify-center relative overflow-hidden"
                     style={{ animation: 'char-paper-color 2.5s ease-in forwards' }}>
                  
                  {/* Magical Rotating Rings */}
                  <div className="absolute inset-2 border-2 border-indigo-300/40 rounded-full border-dashed" style={{ animation: 'drift 15s linear infinite' }}></div>
                  <div className="absolute inset-4 border border-sky-300/50 rounded-full" style={{ animation: 'drift 10s linear infinite reverse' }}></div>
                  
                  {/* Core Dream Icon */}
                  <MoonStar size={48} className="text-indigo-500 mb-1 drop-shadow-lg relative z-10" strokeWidth={1.5} />
                  
                  {/* Magic sparkles inside the orb */}
                  <div className="absolute top-6 left-6 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)] animate-pulse"></div>
                  <div className="absolute bottom-8 right-6 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] animate-pulse"></div>
                  <div className="absolute top-1/2 right-4 w-2 h-2 bg-indigo-200 rounded-full blur-[1px]"></div>
                </div>

                <div className="absolute bottom-[-10px] w-36 h-12 flex justify-center items-end opacity-90 blur-[3px]">
                  <div className="w-32 h-10 flex justify-around items-end">
                    <div className="w-4 h-full bg-cyan-300 rounded-t-full shadow-[0_0_15px_5px_#38bdf8] animate-pulse" />
                    <div className="w-6 h-3/4 bg-blue-400 rounded-t-full shadow-[0_0_15px_5px_#38bdf8] animate-pulse" style={{ animationDelay: '0.1s' }} />
                    <div className="w-5 h-5/6 bg-sky-300 rounded-t-full shadow-[0_0_15px_5px_#38bdf8] animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-4 h-full bg-indigo-400 rounded-t-full shadow-[0_0_15px_5px_#38bdf8] animate-pulse" style={{ animationDelay: '0.15s' }} />
                  </div>
                  <div className="absolute bottom-2 w-28 h-4 bg-white blur-[4px] rounded-full opacity-80" />
                </div>
              </div>
            </div>
            
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-600 uppercase tracking-widest drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]" style={{ animation: 'text-burn-in 2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards' }}>
              Dream Incinerated
            </h2>
            <p className="mt-4 text-sky-200/80 text-xl font-bold uppercase tracking-[0.4em]" style={{ animation: 'text-burn-in 2.2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards' }}>
              Reduced to Ash
            </p>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
