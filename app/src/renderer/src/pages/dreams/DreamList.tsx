import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { Plus, Stars, Clock, Trash2, X, Minus, Check } from 'lucide-react'
import { dreamService } from '../../lib/domain/DreamService'
import { Dream } from '../../types'
import { DREAM_CATEGORIES } from '../../lib/constants/dreams'
import DreamForm from './DreamForm'
import { normalizeUrl } from '../../lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../components/ui/tooltip'
import { useOnboarding } from '../../hooks/useOnboarding'
import { SectionWelcome } from '../../components/onboarding/SectionWelcome'
import { ONBOARDING_CONFIGS } from '../../lib/onboardingConfig'

export default function DreamList() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [dreams, setDreams] = useState<Dream[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [customFilter, setCustomFilter] = useState<string | null>(null)
  const { showWelcome, completeWelcome } = useOnboarding('dreams')

  const [selectedDreamIds, setSelectedDreamIds] = useState<Set<string>>(new Set())
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'select' | 'deselect' | null>(null)
  const cursorPosRef = useRef({ x: 0, y: 0 })
  const cursorDomRef = useRef<HTMLDivElement>(null)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  const handleBatchDelete = async () => {
    setIsBatchDeleting(true)
    try {
      const promises = Array.from(selectedDreamIds).map(id => dreamService.delete(id))
      await Promise.all(promises)
      setSelectedDreamIds(new Set())
      setIsMultiSelectMode(false)
      setSelectionMode(null)
      loadDreams()
    } catch (err) {
      console.error("Batch delete failed", err)
    } finally {
      setIsBatchDeleting(false)
    }
  }

  const activeCategory = category 
    ? DREAM_CATEGORIES.find(c => c.id === category) 
    : undefined

  const loadDreams = async () => {
    setLoading(true)
    try {
      const allDreams = await dreamService.find({});
      const standardIds = DREAM_CATEGORIES.map(c => c.id);
      const uniqueCustoms = Array.from(new Set(allDreams.map(d => d.category))).filter(c => c && !standardIds.includes(c));
      setCustomCategories(uniqueCustoms);

      let query: any = {};
      if (category && category !== 'other') {
        query = { category };
      } else if (category === 'other') {
        if (customFilter) {
          query = { category: customFilter };
        } else {
          query = { category: { $nin: standardIds.filter(id => id !== 'other') } };
        }
      }

      const data = await dreamService.find(query)
      
      // Default ordering: Active -> Recently updated -> Paused -> Achieved -> Archived
      const sorted = data.sort((a, b) => {
        const order = { 'Active': 1, 'Paused': 2, 'Achieved': 3, 'Archived': 4 }
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status]
        }
        return b.updatedAt - a.updatedAt
      })
      
      // If no specific category is selected, default to not showing archived dreams unless specifically requested (though we don't have a specific request for it here, so let's hide archived in 'All Dreams')
      if (!category) {
        setDreams(sorted.filter(d => d.status !== 'Archived'))
      } else {
        setDreams(sorted)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadDreams()
  }, [category, customFilter])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let isDragging = false
    let startY = 0
    let scrollTop = 0
    let hasDragged = false
    let isMultiLocal = false

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
      if (e.ctrlKey) {
        e.preventDefault()
        cursorPosRef.current = { x: e.clientX, y: e.clientY }
        if (cursorDomRef.current) {
          cursorDomRef.current.style.transform = `translate(${e.clientX - 14}px, ${e.clientY - 14}px)`
        }
        
        const newMode = e.shiftKey ? 'deselect' : 'select'
        setSelectionMode(newMode)
        
        if (!isMultiLocal) {
          isMultiLocal = true
          setIsMultiSelectMode(true)
        }
        
        const element = document.elementFromPoint(e.clientX, e.clientY)
        const itemEl = element?.closest('[data-dream-id]')
        if (itemEl) {
          const id = itemEl.getAttribute('data-dream-id')
          if (id) {
            setSelectedDreamIds(prev => {
              const mode = e.shiftKey ? 'deselect' : 'select'
              if (mode === 'deselect' && prev.has(id)) {
                const next = new Set(prev)
                next.delete(id)
                return next
              } else if (mode === 'select' && !prev.has(id)) {
                const next = new Set(prev)
                next.add(id)
                return next
              }
              return prev
            })
          }
        }
        return
      } else if (isMultiLocal) {
        isMultiLocal = false
        setIsMultiSelectMode(false)
        setSelectionMode(null)
      }

      if (!isDragging) return
      e.preventDefault()
      hasDragged = true
      const y = e.pageY - el.offsetTop
      const walk = (y - startY) * 2 // Scroll-fast
      el.scrollTop = scrollTop - walk
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (hasDragged || isMultiLocal) {
        e.preventDefault()
      }
    }

    const handleActionKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDreamIds(new Set())
        isMultiLocal = false
        setIsMultiSelectMode(false)
        setSelectionMode(null)
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        // Batch delete is triggered from button directly since we don't have access to state snapshot easily here without breaking dependencies, wait we can just attach it to an effect with dependencies or since we are relying on button it's fine.
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        isMultiLocal = false
        setIsMultiSelectMode(false)
        setSelectionMode(null)
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('keydown', handleActionKeys)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('keydown', handleActionKeys)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Separate effect for Ctrl+D delete
  useEffect(() => {
    const handleCtrlD = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'd' && selectedDreamIds.size > 0) {
        e.preventDefault()
        handleBatchDelete()
      }
    }
    window.addEventListener('keydown', handleCtrlD)
    return () => window.removeEventListener('keydown', handleCtrlD)
  }, [selectedDreamIds])

  // Tab navigation shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const navPaths = ['/dreams', ...DREAM_CATEGORIES.map(c => `/dreams/${c.id}`)]
          const currentIndex = navPaths.findIndex(path => location.pathname === path || (path === '/dreams' && location.pathname === '/dreams'))
          
          if (currentIndex !== -1) {
            let nextIndex = currentIndex
            if (e.key === 'ArrowUp') {
              nextIndex = (currentIndex - 1 + navPaths.length) % navPaths.length
            } else if (e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % navPaths.length
            }
            navigate(navPaths[nextIndex])
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [location.pathname, navigate])

  // Auto-scroll when dragging near edges in multi-select mode
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (isMultiSelectMode && scrollRef.current) {
        const container = scrollRef.current;
        const rect = container.getBoundingClientRect();
        const y = cursorPosRef.current.y;
        
        const EDGE_THRESHOLD = 80;
        const MAX_SPEED = 1.0; 
        
        const distTop = y - rect.top;
        const distBottom = rect.bottom - y;
        
        let scrollAmount = 0;
        
        if (distTop >= 0 && distTop < EDGE_THRESHOLD) {
          scrollAmount = -MAX_SPEED * delta * (1 - distTop / EDGE_THRESHOLD);
        } else if (distBottom >= 0 && distBottom < EDGE_THRESHOLD) {
          scrollAmount = MAX_SPEED * delta * (1 - distBottom / EDGE_THRESHOLD);
        }
        
        if (scrollAmount !== 0) {
          container.scrollTop += scrollAmount;
          
          // Auto-select items as we scroll over them
          const element = document.elementFromPoint(cursorPosRef.current.x, y);
          const itemEl = element?.closest('[data-dream-id]');
          if (itemEl) {
            const id = itemEl.getAttribute('data-dream-id');
            if (id) {
              setSelectedDreamIds(prev => {
                if (selectionMode === 'deselect' && prev.has(id)) {
                  const next = new Set(prev)
                  next.delete(id)
                  return next
                } else if (selectionMode === 'select' && !prev.has(id)) {
                  const next = new Set(prev)
                  next.add(id)
                  return next
                }
                return prev
              })
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    
    if (isMultiSelectMode) {
      animationFrameId = requestAnimationFrame(loop);
    }
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isMultiSelectMode, selectionMode]);

  return (
    <>
      {showWelcome && <SectionWelcome config={ONBOARDING_CONFIGS.dreams} onComplete={completeWelcome} />}
    <div ref={scrollRef} className={`h-full bg-background overflow-y-auto p-8 animate-in fade-in duration-500 relative ${isMultiSelectMode ? '!cursor-none select-none' : ''}`}>
      
      {isMultiSelectMode && (
        <div 
          ref={cursorDomRef}
          className="fixed left-0 top-0 pointer-events-none z-[200] animate-in zoom-in-95 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-lg backdrop-blur will-change-transform"
          style={{ transform: `translate(${cursorPosRef.current.x - 14}px, ${cursorPosRef.current.y - 14}px)` }}
        >
          {selectionMode === 'deselect' ? <Minus size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
        </div>
      )}

      {selectedDreamIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-5 py-3 bg-card border border-border rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in">
          <span className="text-sm font-bold">{selectedDreamIds.size} dream{selectedDreamIds.size > 1 ? 's' : ''} selected</span>
          <button 
            onClick={handleBatchDelete} 
            disabled={isBatchDeleting}
            className="flex items-center gap-2 px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-sm font-bold shadow-lg shadow-destructive/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={16} /> {isBatchDeleting ? 'Deleting...' : 'Delete'}
          </button>
          <button 
            onClick={() => { setSelectedDreamIds(new Set()); setIsMultiSelectMode(false); setSelectionMode(null) }} 
            className="p-1.5 hover:bg-accent rounded-full text-muted-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            {activeCategory ? <activeCategory.icon className="text-primary" size={32} /> : <Stars className="text-primary" size={32} />}
            {activeCategory ? activeCategory.displayName : 'Dreams'}
          </h1>
          <p className="text-muted-foreground">
            {activeCategory ? activeCategory.description : 'Things you want to achieve, experience, build, or make real in your life.'}
          </p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus size={18} /> New Dream
        </button>
      </div>

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
        <Link 
          to="/dreams" 
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${!category ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-accent text-muted-foreground'}`}
        >
          All
        </Link>
        {DREAM_CATEGORIES.map(c => {
          const isActive = category === c.id
          return (
            <Link 
              key={c.id}
              to={`/dreams/${c.id}`} 
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-accent text-muted-foreground'}`}
            >
              <c.icon size={16} /> {c.displayName}
            </Link>
          )
        })}
      </div>

      {category === 'other' && customCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
           <button 
             onClick={() => setCustomFilter(null)} 
             className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${!customFilter ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}
           >
             All Other
           </button>
           {customCategories.map(cc => (
             <button 
               key={cc}
               onClick={() => setCustomFilter(cc)}
               className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${customFilter === cc ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-accent'}`}
             >
               {cc}
             </button>
           ))}
        </div>
      )}

      {!loading && dreams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-3xl bg-card/50 text-center px-4">
          <div className="inline-flex items-center justify-center p-6 bg-primary/10 text-primary rounded-full mb-6">
            <Stars size={48} />
          </div>
          <h2 className="text-2xl font-bold mb-2">What do you want to make real?</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Capture a dream, big or small, and keep it somewhere you can return to.
          </p>
          <button 
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105"
          >
            <Plus size={18} /> Add Your First Dream
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dreams.map(dream => {
            const catDef = DREAM_CATEGORIES.find(c => c.id === dream.category)
            const CatIcon = catDef?.icon || Stars
            
            const isQuantitative = dream.targetAmount !== undefined && dream.currentAmount !== undefined
            const progress = isQuantitative ? Math.min(100, Math.round(((dream.currentAmount || 0) / (dream.targetAmount || 1)) * 100)) : null
            
            return (
              <Link 
                to={`/dreams/view/${dream._id}`} 
                key={dream._id} 
                data-dream-id={dream._id}
                onClick={(e) => {
                  if (selectedDreamIds.size > 0 || e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedDreamIds(prev => {
                      const next = new Set(prev)
                      if (next.has(dream._id!)) next.delete(dream._id!)
                      else next.add(dream._id!)
                      return next
                    })
                  }
                }}
                className={`bg-card border rounded-2xl overflow-hidden transition-all group flex flex-col relative ${selectedDreamIds.has(dream._id!) ? 'border-primary ring-2 ring-primary shadow-lg scale-[0.98]' : 'border-border hover:border-primary/50 hover:shadow-md'} ${isMultiSelectMode ? '!cursor-none' : ''}`}
              >
                {selectedDreamIds.has(dream._id!) && (
                  <div className="absolute top-3 right-3 z-20 p-1 bg-primary text-primary-foreground rounded-full shadow-lg animate-in zoom-in">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}
                {dream.imageUrl ? (
                  <div className="h-32 w-full overflow-hidden border-b border-border bg-accent relative">
                    <img src={normalizeUrl(dream.imageUrl)} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                      <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-md text-white">
                        <CatIcon size={16} />
                      </div>
                      <span className="text-white font-bold text-sm drop-shadow-md">{catDef?.displayName || dream.category}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-border bg-accent/30 flex items-center gap-2">
                     <div className="p-1.5 bg-background rounded-md text-muted-foreground shadow-sm">
                      <CatIcon size={16} />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">{catDef?.displayName || dream.category}</span>
                  </div>
                )}
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{dream.title}</h3>
                    {dream.status !== 'Active' && (
                      <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent text-muted-foreground rounded-full">
                        {dream.status}
                      </span>
                    )}
                  </div>
                  
                  {!isQuantitative && dream.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 mt-1">{dream.description}</p>
                  )}

                  <div className="mt-auto pt-4 space-y-3">
                    {isQuantitative && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold">{dream.currentAmount?.toLocaleString()} / {dream.targetAmount?.toLocaleString()} {dream.targetCurrency}</span>
                          <span className="font-bold text-primary">{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    )}

                    {dream.targetDate && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-accent/50 w-max px-2 py-1 rounded-md">
                            <Clock size={12} /> Target: {new Date(dream.targetDate).toLocaleDateString()}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Target Completion Date</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showForm && (
        <DreamForm 
          onSave={(saved) => {
            setShowForm(false)
            loadDreams()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

    </div>
    </>
  )
}
