import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HardDrive, Server, FileText, Settings, Trash2, ChevronDown, ChevronRight, Loader2, Database, Image as ImageIcon, FileAudio, FileVideo, Files, RefreshCw, AlertTriangle } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { AppStorageInfo, StorageSection } from '../../types'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../../components/ui/tooltip'

export default function StorageSettings() {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<AppStorageInfo | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [maxSizeLimit, setMaxSizeLimit] = useState<string>('null')
  const [clearingCache, setClearingCache] = useState(false)
  const [showClearCacheModal, setShowClearCacheModal] = useState(false)
  const [showClearSuccess, setShowClearSuccess] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<'public' | 'private'>('public')
  const [viewMode, setViewMode] = useState<'public' | 'private' | 'both'>('public')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      let scrollable: Element | null = e.target as Element
      while (scrollable && scrollable.tagName !== 'MAIN') {
        if (scrollable.scrollHeight > scrollable.clientHeight) {
          const overflowY = window.getComputedStyle(scrollable).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') {
             break
          }
        }
        scrollable = scrollable.parentElement
      }
      
      if (!scrollable || scrollable.tagName === 'MAIN' || scrollable === document.documentElement) {
        return; // Let App.tsx handle global scrolling
      }

      e.preventDefault()
      e.stopPropagation()
      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation()
      }
      
      const startY = e.clientY
      const startScrollY = scrollable.scrollTop
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY
        scrollable!.scrollTop = startScrollY - deltaY
      }
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }
  }

  const loadInfo = async (modeToLoad: 'public' | 'private' | 'both') => {
    setLoading(true)
    try {
      // @ts-ignore
      if (window.api.storage) {
        // @ts-ignore
        const data = await window.api.storage.getInfo(modeToLoad)
        setInfo(data)
        setMaxSizeLimit(data.maxAppSize ? data.maxAppSize.toString() : 'null')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // @ts-ignore
    if (window.api.profile) {
      // @ts-ignore
      window.api.profile.getCurrent().then(p => {
        setCurrentProfile(p)
        const initialMode = p === 'private' ? 'both' : 'public'
        setViewMode(initialMode)
        loadInfo(initialMode)
      })
    } else {
      loadInfo('public')
    }
  }, [])

  const handleClearCacheClick = () => {
    setShowClearCacheModal(true)
  }

  const confirmClearCache = async () => {
    setShowClearCacheModal(false)
    setClearingCache(true)
    try {
      // @ts-ignore
      const freed = await window.api.storage.clearCache()
      NotificationEngine.notify('success', 'Cache Cleared', `Successfully freed ${formatBytes(freed)}`)
      await loadInfo(viewMode)
      
      setShowClearSuccess(true)
      setTimeout(() => setShowClearSuccess(false), 2500)
    } catch (e) {
      NotificationEngine.notify('error', 'Error', 'Failed to clear cache')
    } finally {
      setClearingCache(false)
    }
  }

  const handleResetClick = () => {
    setShowResetModal(true)
  }

  const confirmReset = async (mode: 'public' | 'private' | 'both') => {
    setShowResetModal(false)
    setResetting(true)
    try {
      // @ts-ignore
      const success = await window.api.storage.resetData(mode)
      if (success) {
        NotificationEngine.notify('success', 'Data Reset', 'Data successfully deleted.')
        await loadInfo(viewMode)
      } else {
        NotificationEngine.notify('error', 'Error', 'Failed to reset data.')
      }
    } catch (e) {
      NotificationEngine.notify('error', 'Error', 'Failed to reset data.')
    } finally {
      setResetting(false)
    }
  }

  const handleSaveLimit = async (val: string) => {
    setMaxSizeLimit(val)
    try {
      const num = val === 'null' ? null : parseInt(val, 10)
      // @ts-ignore
      await window.api.storage.setMaxAppSize(num)
      NotificationEngine.notify('success', 'Limit Updated', 'Maximum app storage limit saved.')
      await loadInfo(viewMode)
    } catch (e) {
      NotificationEngine.notify('error', 'Error', 'Failed to update limit')
    }
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const getPercentage = (part: number, total: number) => {
    if (total === 0 || part === 0) return '0.0%'
    const p = (part / total) * 100
    if (p > 0 && p < 0.1) return '0.0%'
    return p.toFixed(1) + '%'
  }

  const toggleSection = (name: string) => {
    setExpandedSection(expandedSection === name ? null : name)
  }

  const getFileIcon = (type: string) => {
    if (type === 'Images') return <ImageIcon size={18} className="text-blue-400" />
    if (type === 'Videos') return <FileVideo size={18} className="text-purple-400" />
    if (type === 'Audio') return <FileAudio size={18} className="text-yellow-400" />
    if (type === 'Documents') return <FileText size={18} className="text-orange-400" />
    if (type === 'Database') return <Database size={18} className="text-emerald-400" />
    return <Files size={18} className="text-gray-400" />
  }

  const getFileBgColor = (type: string) => {
    if (type === 'Images') return 'bg-blue-400'
    if (type === 'Videos') return 'bg-purple-400'
    if (type === 'Audio') return 'bg-yellow-400'
    if (type === 'Documents') return 'bg-orange-400'
    if (type === 'Database') return 'bg-emerald-400'
    return 'bg-gray-400'
  }

  if (loading && !info) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
  }

  if (!info) return <div>Failed to load storage info.</div>

  const gbOptions = [1, 2, 5, 10, 25, 50, 100].map(gb => ({ label: `${gb} GB`, value: (gb * 1024 * 1024 * 1024).toString() }))
  
  return (
    <div 
      className="space-y-8 pb-16 cursor-default select-none animate-in fade-in slide-in-from-bottom-4 duration-700" 
      ref={containerRef}
      onMouseDownCapture={handleMouseDown}
      onContextMenuCapture={(e) => e.preventDefault()}
    >
      <div className="flex justify-between items-end mb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 tracking-tight">Storage Management</h2>
          <p className="text-muted-foreground text-sm">Monitor and manage your application's data footprint.</p>
        </div>
        <div className="flex items-center gap-4">
          {currentProfile === 'private' && (
            <div className="flex bg-card/40 p-1.5 rounded-2xl border border-white/10 dark:border-white/5 shadow-lg backdrop-blur-xl transition-all">
              <button 
                onClick={() => { setViewMode('private'); loadInfo('private'); }}
                className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 outline-none ${viewMode === 'private' ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.1)] shadow-primary/20 scale-100' : 'bg-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground scale-95 hover:scale-100'}`}
              >
                Private Only
              </button>
              <button 
                onClick={() => { setViewMode('both'); loadInfo('both'); }}
                className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 outline-none ${viewMode === 'both' ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.1)] shadow-primary/20 scale-100' : 'bg-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground scale-95 hover:scale-100'}`}
              >
                Private & Public
              </button>
            </div>
          )}
          <button onClick={() => loadInfo(viewMode)} disabled={loading} className="flex items-center gap-2 text-sm px-6 py-3 bg-card/50 hover:bg-primary hover:text-primary-foreground border border-white/10 text-foreground font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-1 active:scale-95 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] hover:shadow-primary/30 outline-none backdrop-blur-xl disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:cursor-not-allowed group/btn">
            <RefreshCw size={16} className={`transition-all duration-500 ${loading ? 'animate-spin' : 'group-hover/btn:rotate-180'}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Overview */}
      <section className="relative overflow-hidden p-8 lg:p-10 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-all duration-1000 -z-10" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-1000 -z-10" />
        
        <div className="flex items-center gap-6">
          <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl text-primary shadow-[0_0_20px_rgba(0,0,0,0.05)] shadow-primary/10 shrink-0 transform group-hover:scale-110 transition-transform duration-500">
            <Server size={40} className="drop-shadow-md" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-muted-foreground/80 mb-2 uppercase tracking-wider text-xs">Total Application Size</h3>
            <div className="text-5xl font-black mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{formatBytes(info.totalAppSize)}</div>
            {info.maxAppSize && (
              <div className="space-y-3 max-w-xl">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-muted-foreground"><span className="text-foreground">{((info.totalAppSize / info.maxAppSize) * 100).toFixed(1)}%</span> of limit</span>
                  <span className="text-muted-foreground">{formatBytes(info.maxAppSize)}</span>
                </div>
                <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden backdrop-blur-sm p-0.5 border border-white/5 shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] relative overflow-hidden ${info.totalAppSize / info.maxAppSize > 0.9 ? 'bg-gradient-to-r from-destructive/80 to-destructive shadow-destructive/50' : 'bg-gradient-to-r from-primary to-primary/70 shadow-primary/50'}`} 
                    style={{ width: `${Math.min((info.totalAppSize / info.maxAppSize) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {!info.maxAppSize && <p className="text-sm text-muted-foreground/80 font-medium bg-accent/30 inline-block px-3 py-1 rounded-full">No limit configured</p>}
          </div>
        </div>
      </section>

      {/* Drive Storage */}
      {info.drive && info.drive.total > 0 && (
        <section className="relative overflow-hidden p-8 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-xl text-foreground/70 group-hover:text-primary transition-colors">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="font-bold text-xl leading-none mb-1">Drive {info.drive.path}</h3>
                <p className="text-sm font-medium text-muted-foreground">System Storage Analysis</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{info.drive.percentUsed.toFixed(1)}%</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Used</p>
            </div>
          </div>

          <div className="flex justify-between text-sm mb-3 font-semibold text-muted-foreground px-1">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" />Used: <span className="text-foreground">{formatBytes(info.drive.used)}</span></span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary" />Free: <span className="text-foreground">{formatBytes(info.drive.free)}</span></span>
          </div>

          <TooltipProvider delayDuration={100}>
            <div className="flex h-4 w-full bg-secondary/40 rounded-full overflow-hidden mb-4 p-0.5 border border-white/5 shadow-inner">
              {info.fileTypes.map((ft, idx) => {
                const percent = (ft.size / info.drive.total) * 100
                if (percent < 0.001 && ft.size > 0) return null;
                const bgColor = getFileBgColor(ft.type)
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div className={`h-full ${bgColor} transition-all duration-500 hover:brightness-125 hover:scale-y-110 cursor-pointer first:rounded-l-full last:rounded-r-full shadow-sm relative`} style={{ width: `${percent}%`, minWidth: percent > 0 ? '2px' : '0' }}>
                        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="backdrop-blur-xl bg-card/90 border-white/10">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm flex items-center gap-2">{getFileIcon(ft.type)} {ft.type}</span>
                        <span className="text-muted-foreground text-xs">{formatBytes(ft.size)} ({(percent).toFixed(2)}%)</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
              {(() => {
                const appFileTypesSize = info.fileTypes.reduce((acc, ft) => acc + ft.size, 0)
                const otherAppSize = Math.max(0, info.totalAppSize - appFileTypesSize)
                const percent = (otherAppSize / info.drive.total) * 100
                if (percent <= 0) return null;
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full bg-cyan-400 transition-all duration-500 hover:brightness-125 hover:scale-y-110 cursor-pointer shadow-sm relative" style={{ width: `${percent}%`, minWidth: percent > 0 ? '2px' : '0' }}>
                        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="backdrop-blur-xl bg-card/90 border-white/10">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm">App Data & Cache</span>
                        <span className="text-muted-foreground text-xs">{formatBytes(otherAppSize)} ({(percent).toFixed(2)}%)</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })()}
              {(() => {
                const otherDriveSpace = Math.max(0, info.drive.used - info.totalAppSize)
                const percent = (otherDriveSpace / info.drive.total) * 100
                if (percent <= 0) return null;
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-full bg-muted-foreground/30 transition-all duration-500 hover:brightness-125 hover:scale-y-110 cursor-pointer last:rounded-r-full shadow-inner relative" style={{ width: `${percent}%` }}>
                        <div className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="backdrop-blur-xl bg-card/90 border-white/10">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-sm">Other Drive Data</span>
                        <span className="text-muted-foreground text-xs">{formatBytes(otherDriveSpace)} ({(percent).toFixed(2)}%)</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })()}
            </div>
          </TooltipProvider>
        </section>
      )}

      {/* Storage Details Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Storage by Section */}
        <section className="xl:col-span-2 relative overflow-hidden p-8 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl flex flex-col group">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-accent/20 rounded-full blur-[80px] group-hover:bg-accent/30 transition-all duration-1000 -z-10" />
          
          <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
            <span className="p-2 bg-accent/30 text-accent-foreground rounded-lg"><Database size={20} /></span>
            Storage Breakdown
          </h3>
          <div className="space-y-3 flex-1">
            {info.sections.map((sec, idx) => (
              <div key={idx} className="group/item border border-white/5 bg-background/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden hover:shadow-md hover:border-white/10 transition-all duration-300">
                <button 
                  onClick={() => toggleSection(sec.name)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent/20 transition-colors outline-none cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md transition-colors ${expandedSection === sec.name ? 'bg-primary/20 text-primary' : 'bg-transparent text-muted-foreground group-hover/item:text-foreground'}`}>
                      {expandedSection === sec.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <span className="font-semibold">{sec.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-semibold">
                    <span className="text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md">{sec.count} items</span>
                    <span className="w-24 text-right text-foreground">{formatBytes(sec.size)}</span>
                    <span className="w-16 text-right text-muted-foreground/70 bg-background/50 px-2 py-0.5 rounded-md">
                      {getPercentage(sec.size, info.totalAppSize)}
                    </span>
                  </div>
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedSection === sec.name ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 border-t border-white/5 bg-black/5 dark:bg-black/20 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {sec.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No specific items found. System data.</p>
                    ) : (
                      sec.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-2.5 px-4 bg-background/40 hover:bg-background/80 rounded-xl transition-all duration-200 border border-transparent hover:border-white/10 hover:shadow-sm">
                          <span className="text-sm font-medium truncate mr-4 flex-1">{item.name}</span>
                          <div className="flex gap-4 text-xs font-bold shrink-0 items-center">
                            <span className="w-20 text-right">{formatBytes(item.size)}</span>
                            <span className="w-12 text-right text-primary/70">
                              {getPercentage(item.size, info.totalAppSize)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* File Types */}
        <section className="xl:col-span-1 relative overflow-hidden p-8 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl flex flex-col group">
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000 -z-10" />
          
          <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
            <span className="p-2 bg-indigo-500/20 text-indigo-500 rounded-lg"><Files size={20} /></span>
            File Types
          </h3>
          <div className="flex flex-col gap-4 flex-1 content-start">
            {info.fileTypes.map((ft, idx) => {
              const percent = info.totalAppSize > 0 ? (ft.size / info.totalAppSize) * 100 : 0;
              return (
              <div key={idx} className="group/type relative overflow-hidden flex flex-col p-5 bg-background/50 backdrop-blur-xl border border-white/5 rounded-2xl transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 hover:border-white/20">
                <div className={`absolute -right-10 -top-10 w-32 h-32 opacity-20 group-hover/type:opacity-40 blur-3xl transition-opacity duration-500 ${getFileBgColor(ft.type)}`} />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-card/80 rounded-xl shadow-sm border border-white/10 group-hover/type:scale-110 transition-transform duration-300">
                      {getFileIcon(ft.type)}
                    </div>
                    <div>
                      <span className="font-bold text-base block leading-tight">{ft.type}</span>
                      <span className="text-xs font-medium text-muted-foreground">{ft.count} files</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-lg tracking-tight block">{formatBytes(ft.size)}</span>
                    <span className="text-xs font-bold text-primary/80">{getPercentage(ft.size, info.totalAppSize)}</span>
                  </div>
                </div>
                
                <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden relative z-10">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${getFileBgColor(ft.type)}`} 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )})}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cache Management */}
        <section className="relative overflow-hidden p-8 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl flex flex-col group">
          <div className="absolute top-0 right-0 p-32 bg-destructive/5 rounded-full blur-3xl -z-10 group-hover:bg-destructive/10 transition-all duration-700" />
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-destructive/10 text-destructive rounded-xl"><Trash2 size={22} /></div>
            <h3 className="font-bold text-xl">Cache Management</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed">
            Temporary files generated by the application. Clearing the cache can free up space without affecting your personal records, photos, or journals.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-background/40 backdrop-blur-md border border-white/5 rounded-2xl mt-auto transition-all duration-300 group-hover:border-destructive/20 group-hover:shadow-lg group-hover:bg-background/60 gap-4">
            <div>
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Cache</p>
              <p className="text-3xl font-black tracking-tight text-foreground/90">{formatBytes(info.cacheSize)}</p>
            </div>
            <button 
              onClick={handleClearCacheClick}
              disabled={clearingCache}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive/10 hover:bg-destructive hover:text-white text-destructive border border-destructive/20 hover:border-destructive rounded-xl transition-all duration-300 font-bold text-sm disabled:opacity-50 active:scale-95 hover:-translate-y-1 hover:shadow-[0_8px_16px_-4px_rgba(220,38,38,0.2)] outline-none"
            >
              {clearingCache ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              Clear Cache
            </button>
          </div>
        </section>

        {/* Max App Size */}
        <section className="relative overflow-hidden p-8 bg-card/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl flex flex-col group">
          <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl -z-10 group-hover:bg-amber-500/10 transition-all duration-700" />
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl"><Settings size={22} /></div>
            <h3 className="font-bold text-xl">Storage Limits</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed">
            Set a maximum threshold for Kiseki Record. Once this limit is reached, you will be prompted before adding new large files.
          </p>
          
          <div className="flex flex-col gap-4 mt-auto bg-background/40 backdrop-blur-md p-6 border border-white/5 rounded-2xl transition-all duration-300 group-hover:border-amber-500/20 group-hover:shadow-lg group-hover:bg-background/60">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maximum Capacity</label>
            <div className="relative">
              <select 
                value={maxSizeLimit} 
                onChange={(e) => handleSaveLimit(e.target.value)}
                className="w-full p-4 pl-5 pr-10 bg-background/80 border border-white/10 rounded-xl hover:border-amber-500/50 transition-all duration-300 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 text-sm font-bold active:scale-[0.99] cursor-pointer outline-none shadow-inner appearance-none"
              >
                <option value="null">Unlimited Storage</option>
                {gbOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
            </div>
          </div>
        </section>

        {/* Data Reset */}
        <section className="md:col-span-2 relative overflow-hidden p-8 bg-card/40 backdrop-blur-2xl border border-destructive/20 dark:border-destructive/30 rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl flex flex-col group">
          <div className="absolute top-0 left-0 p-32 bg-destructive/10 rounded-full blur-3xl -z-10 group-hover:bg-destructive/20 transition-all duration-700" />
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-destructive/20 text-destructive rounded-xl"><AlertTriangle size={22} /></div>
            <h3 className="font-bold text-xl text-destructive">Data Reset</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-8 font-medium leading-relaxed">
            Permanently delete all your personal records, photos, and journals. This action cannot be undone. Please ensure you have backed up your vault if you want to keep your data.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-background/40 backdrop-blur-md border border-destructive/10 rounded-2xl mt-auto transition-all duration-300 group-hover:border-destructive/30 group-hover:shadow-lg group-hover:bg-background/60 gap-4">
            <div>
              <p className="font-semibold text-xs text-destructive uppercase tracking-wider mb-1">Danger Zone</p>
              <p className="text-sm font-medium text-muted-foreground">Clear application database</p>
            </div>
            <button 
              onClick={handleResetClick}
              disabled={resetting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-destructive text-white rounded-xl transition-all duration-300 font-bold text-sm disabled:opacity-50 active:scale-95 hover:-translate-y-1 hover:shadow-[0_8px_16px_-4px_rgba(220,38,38,0.4)] outline-none"
            >
              {resetting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              Reset Data
            </button>
          </div>
        </section>
      </div>

      {/* Reset Data Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setShowResetModal(false) }}>
          <div className="bg-card text-card-foreground p-0 rounded-2xl shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] border border-destructive/20 w-full max-w-md flex flex-col overflow-hidden scale-in-center animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-center border-b border-destructive/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-transparent"></div>
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner mb-4 relative z-10 border border-destructive/20">
                <AlertTriangle size={32} className="text-destructive drop-shadow-md animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground relative z-10">Reset Data</h3>
            </div>
            
            <div className="p-6">
              <p className="text-center text-muted-foreground mb-4 font-medium">
                {currentProfile === 'public' 
                  ? 'Are you sure you want to delete all public data? This action cannot be undone.'
                  : 'Are you sure you want to delete data? This action cannot be undone.'}
              </p>
              
              <div className="bg-accent/50 p-3 rounded-lg border border-border flex items-start gap-3 mb-6">
                <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground text-left leading-relaxed">
                  All selected records, journal entries, goals, and habits will be permanently removed.
                </p>
              </div>

              {currentProfile === 'public' ? (
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setShowResetModal(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => confirmReset('public')}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-destructive text-white shadow-lg shadow-destructive/30 hover:shadow-destructive/50 hover:from-red-500 hover:to-red-600 transition-all active:scale-95"
                  >
                    Delete Public Data
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-6">
                  <button 
                    onClick={() => confirmReset('private')}
                    className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground border border-destructive hover:bg-destructive/10 transition-all active:scale-95"
                  >
                    Delete Private Data Only
                  </button>
                  <button 
                    onClick={() => confirmReset('both')}
                    className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-destructive text-white shadow-lg shadow-destructive/30 hover:shadow-destructive/50 transition-all active:scale-95"
                  >
                    Delete ALL Data (Public & Private)
                  </button>
                  <button 
                    onClick={() => setShowResetModal(false)}
                    className="w-full mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Cache Clear Modal */}
      {showClearCacheModal && !showClearSuccess && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-in fade-in duration-300" onClick={(e) => { e.stopPropagation(); setShowClearCacheModal(false) }}>
          <div className="bg-card text-card-foreground p-0 rounded-2xl shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)] border border-destructive/20 w-full max-w-md flex flex-col overflow-hidden scale-in-center animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-center border-b border-destructive/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-destructive/5 to-transparent"></div>
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner mb-4 relative z-10 border border-destructive/20">
                <Trash2 size={32} className="text-destructive drop-shadow-md animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground relative z-10">Clear Cache?</h3>
            </div>
            
            <div className="p-6">
              <p className="text-center text-muted-foreground mb-4 font-medium">
                Are you sure you want to clear temporary and cache files? 
              </p>
              
              <div className="bg-accent/50 p-3 rounded-lg border border-border flex items-start gap-3 mb-6">
                <Settings size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground text-left leading-relaxed">
                  This will free up space. Your personal records, photos, and journals will <strong className="text-foreground">not</strong> be deleted.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowClearCacheModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-accent hover:bg-accent/80 border border-transparent hover:border-border transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmClearCache}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-destructive text-white shadow-lg shadow-destructive/30 hover:shadow-destructive/50 hover:from-red-500 hover:to-red-600 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation */}
      {showClearSuccess && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-destructive/30 via-background/90 to-background/95 backdrop-blur-md animate-in fade-in duration-300">
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
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
              <rect x="70" y="80" width="100" height="120" rx="10" fill="#7f1d1d" opacity="0.4" transform="translate(10, 15) rotate(-5 120 120)" />
              <rect x="70" y="80" width="100" height="120" rx="10" fill="#991b1b" opacity="0.6" transform="translate(5, 8) rotate(-2 120 120)" />
              
              <path d="M 70 80 L 170 80 L 155 200 C 155 205, 150 210, 145 210 L 95 210 C 90 210, 85 205, 85 200 Z" fill="#ef4444" />
              <path d="M 70 80 L 120 80 L 120 210 L 95 210 C 90 210, 85 205, 85 200 Z" fill="#f87171" opacity="0.5" />
              
              <rect x="95" y="95" width="6" height="95" rx="3" fill="#b91c1c" />
              <rect x="117" y="95" width="6" height="95" rx="3" fill="#b91c1c" />
              <rect x="139" y="95" width="6" height="95" rx="3" fill="#b91c1c" />
              
              <g style={{ animation: 'suckIn 1.5s ease-in-out infinite' }}>
                <rect x="100" y="60" width="40" height="15" rx="2" fill="#60a5fa" />
                <rect x="110" y="40" width="20" height="10" rx="2" fill="#34d399" />
                <rect x="90" y="20" width="60" height="10" rx="2" fill="#fbbf24" />
              </g>

              <g style={{ transformOrigin: '70px 80px', animation: 'openLid 2.5s infinite ease-in-out' }}>
                <rect x="60" y="70" width="120" height="12" rx="4" fill="#dc2626" />
                <rect x="100" y="55" width="40" height="15" rx="4" fill="#dc2626" />
                <rect x="60" y="70" width="60" height="12" rx="4" fill="#f87171" opacity="0.5" />
              </g>
            </svg>

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
              Cache Cleared!
            </h2>
          </div>
        </div>
      )}

    </div>
  )
}
