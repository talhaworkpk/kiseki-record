import { useState, useEffect, useRef } from 'react'
import { HardDrive, Server, FileText, Settings, Trash2, ChevronDown, ChevronRight, Loader2, Database, Image as ImageIcon, FileAudio, FileVideo, Files } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { AppStorageInfo, StorageSection } from '../../types'

export default function StorageSettings() {
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<AppStorageInfo | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [maxSizeLimit, setMaxSizeLimit] = useState<string>('null')
  const [clearingCache, setClearingCache] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<'public' | 'private'>('public')
  const [viewMode, setViewMode] = useState<'public' | 'private' | 'both'>('public')
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      
      let scrollable: Element | null = e.target as Element
      while (scrollable) {
        if (scrollable.scrollHeight > scrollable.clientHeight) {
          const overflowY = window.getComputedStyle(scrollable).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') {
             break
          }
        }
        scrollable = scrollable.parentElement
      }
      if (!scrollable) scrollable = document.querySelector('main') || document.documentElement
      
      const startY = e.clientY
      const startScrollY = scrollable.scrollTop || window.scrollY
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY
        if (scrollable === document.documentElement) {
          window.scrollTo(window.scrollX, startScrollY - deltaY)
        } else {
          scrollable!.scrollTop = startScrollY - deltaY
        }
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

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear temporary/cache files? Your personal data will not be deleted.')) return
    
    setClearingCache(true)
    try {
      // @ts-ignore
      const freed = await window.api.storage.clearCache()
      NotificationEngine.notify('success', 'Cache Cleared', `Successfully freed ${formatBytes(freed)}`)
      await loadInfo(viewMode)
    } catch (e) {
      NotificationEngine.notify('error', 'Error', 'Failed to clear cache')
    } finally {
      setClearingCache(false)
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

  if (loading && !info) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
  }

  if (!info) return <div>Failed to load storage info.</div>

  const gbOptions = [1, 2, 5, 10, 25, 50, 100].map(gb => ({ label: `${gb} GB`, value: (gb * 1024 * 1024 * 1024).toString() }))
  
  return (
    <div 
      className="space-y-6 pb-12 cursor-default select-none" 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Storage Management</h2>
          {currentProfile === 'private' && (
            <div className="flex bg-accent/30 p-1 rounded-xl border border-border/50 shadow-sm items-center gap-1">
              <button 
                onClick={() => { setViewMode('private'); loadInfo('private'); }}
                className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${viewMode === 'private' ? 'bg-primary text-primary-foreground shadow-md transform scale-[1.02]' : 'bg-transparent text-muted-foreground hover:bg-background/80 hover:text-foreground'}`}
              >
                Private Only
              </button>
              <button 
                onClick={() => { setViewMode('both'); loadInfo('both'); }}
                className={`px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${viewMode === 'both' ? 'bg-primary text-primary-foreground shadow-md transform scale-[1.02]' : 'bg-transparent text-muted-foreground hover:bg-background/80 hover:text-foreground'}`}
              >
                Private & Public
              </button>
            </div>
          )}
        </div>
        <button onClick={() => loadInfo(viewMode)} className="text-sm px-3 py-1.5 bg-accent hover:bg-primary/20 text-foreground font-medium rounded-md transition-colors">
          Refresh Data
        </button>
      </div>

      {/* Overview */}
      <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-primary/10 rounded-full text-primary shrink-0">
            <Server size={32} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-muted-foreground mb-1">Total App Size</h3>
            <div className="text-4xl font-bold mb-2">{formatBytes(info.totalAppSize)}</div>
            {info.maxAppSize && (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {((info.totalAppSize / info.maxAppSize) * 100).toFixed(1)}% of {formatBytes(info.maxAppSize)} limit
                </p>
                <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${info.totalAppSize / info.maxAppSize > 0.9 ? 'bg-destructive' : 'bg-primary'}`} 
                    style={{ width: `${Math.min((info.totalAppSize / info.maxAppSize) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
            {!info.maxAppSize && <p className="text-sm text-muted-foreground">No limit configured.</p>}
          </div>
        </div>
      </section>

      {/* Drive Storage */}
      {info.drive && info.drive.total > 0 && (
        <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="text-primary" size={20} />
            <h3 className="font-semibold text-lg">Drive {info.drive.path}</h3>
          </div>
          <div className="flex justify-between text-sm mb-2 font-medium">
            <span>Used: {formatBytes(info.drive.used)}</span>
            <span className="text-muted-foreground">Free: {formatBytes(info.drive.free)}</span>
          </div>
          <div className="h-3 w-full bg-accent rounded-full overflow-hidden mb-2">
            <div 
              className={`h-full rounded-full transition-all ${info.drive.percentUsed > 90 ? 'bg-destructive' : info.drive.percentUsed > 80 ? 'bg-yellow-500' : 'bg-primary'}`} 
              style={{ width: `${info.drive.percentUsed}%` }}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{info.drive.percentUsed.toFixed(1)}% used of {formatBytes(info.drive.total)}</p>
        </section>
      )}

      {/* Storage by Section */}
      <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Storage by Section</h3>
        <div className="space-y-2">
          {info.sections.map((sec, idx) => (
            <div key={idx} className="border border-border rounded-xl bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <button 
                onClick={() => toggleSection(sec.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  {expandedSection === sec.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="font-semibold">{sec.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span className="text-muted-foreground">{sec.count} items</span>
                  <span className="w-24 text-right">{formatBytes(sec.size)}</span>
                  <span className="w-16 text-right text-muted-foreground">
                    {getPercentage(sec.size, info.totalAppSize)}
                  </span>
                </div>
              </button>
              
              {expandedSection === sec.name && (
                <div className="p-4 border-t border-border bg-accent/10 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {sec.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No specific items found, data is mostly system or DB overhead.</p>
                  ) : (
                    sec.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 px-3 hover:bg-background/80 rounded-md transition-colors border border-transparent hover:border-border">
                        <span className="text-sm font-medium truncate mr-4 flex-1">{item.name}</span>
                        <div className="flex gap-4 text-xs font-medium shrink-0">
                          <span className="w-20 text-right">{formatBytes(item.size)}</span>
                          <span className="w-12 text-right text-muted-foreground">
                            {getPercentage(item.size, info.totalAppSize)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* File Types */}
      <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
        <h3 className="font-semibold text-lg mb-4">Storage by File Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {info.fileTypes.map((ft, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 bg-accent/20 rounded-lg">
              <div className="p-2 bg-background rounded-md shadow-sm">
                {getFileIcon(ft.type)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium text-sm">{ft.type}</span>
                  <span className="font-bold text-sm">{formatBytes(ft.size)}</span>
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{ft.count} items</span>
                  <span>{getPercentage(ft.size, info.totalAppSize)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cache Management */}
        <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Cache</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cache is used to improve app performance. Clearing it will not delete your personal records, photos, or journals.
          </p>
          <div className="flex justify-between items-center p-4 bg-accent/20 rounded-lg">
            <div>
              <p className="font-medium">Current Cache Size</p>
              <p className="text-2xl font-bold">{formatBytes(info.cacheSize)}</p>
            </div>
            <button 
              onClick={handleClearCache}
              disabled={clearingCache}
              className="flex items-center gap-2 px-4 py-2 bg-background hover:bg-destructive hover:text-white text-destructive border border-destructive rounded-md transition-colors font-medium text-sm disabled:opacity-50"
            >
              {clearingCache ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Clear Cache
            </button>
          </div>
        </section>

        {/* Max App Size */}
        <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Storage Limits</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Set a maximum storage limit. If Kiseki Record reaches this size, you will be blocked from adding large files.
          </p>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Maximum App Size</label>
            <select 
              value={maxSizeLimit} 
              onChange={(e) => handleSaveLimit(e.target.value)}
              className="w-full p-2.5 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary text-sm font-medium"
            >
              <option value="null">No Limit</option>
              {gbOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </section>
      </div>

    </div>
  )
}
