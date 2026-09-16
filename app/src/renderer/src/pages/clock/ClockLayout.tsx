import React from 'react'
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { Clock, Bell, Timer, TimerReset, History, BrainCircuit } from 'lucide-react'
import Overview from './Overview'
import Alarm from './Alarm'
import TimerPage from './Timer'
import Stopwatch from './Stopwatch'
import Timeline from './Timeline'
import AISight from './AISight'
import ClockBackground from './ClockBackground'
import ClockStudioPanel from './ClockStudioPanel'
import { MoreVertical } from 'lucide-react'
import { ClockAppearanceProvider, useClockAppearance } from '../../contexts/ClockAppearanceContext'

function TopNav() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const navItems = React.useMemo(() => [
    { path: '/clock', label: 'Overview', icon: Clock, exact: true },
    { path: '/clock/alarm', label: 'Alarm', icon: Bell },
    { path: '/clock/timer', label: 'Timer', icon: Timer },
    { path: '/clock/stopwatch', label: 'Stopwatch', icon: TimerReset },
    { path: '/clock/timeline', label: 'Timeline', icon: History },
    { path: '/clock/ai-sight', label: 'AI Sight', icon: BrainCircuit },
  ], [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const currentIndex = navItems.findIndex(item => 
            item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
          )
          
          if (currentIndex !== -1) {
            let nextIndex = currentIndex
            if (e.key === 'ArrowUp') {
              nextIndex = (currentIndex - 1 + navItems.length) % navItems.length
            } else if (e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % navItems.length
            }
            navigate(navItems[nextIndex].path)
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [location.pathname, navigate, navItems])

  return (
    <div className="flex space-x-2 p-4 border-b border-border bg-card/50 overflow-x-auto relative z-10 backdrop-blur-md">
      {navItems.map((item) => {
        const isActive = item.exact 
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path)
          
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              isActive 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function ClockLayout() {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showStudio, setShowStudio] = React.useState(false)
  const isDragging = React.useRef(false)
  const startY = React.useRef(0)
  const scrollTop = React.useRef(0)
  
  const location = useLocation()
  const sectionId = React.useMemo(() => {
    const path = location.pathname.split('/').pop()
    if (path === 'clock') return 'overview'
    if (path === 'ai-sight') return 'aiSight'
    return path as any
  }, [location.pathname])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) { // Right click
      isDragging.current = true
      startY.current = e.pageY - (scrollRef.current?.offsetTop || 0)
      scrollTop.current = scrollRef.current?.scrollTop || 0
      if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing'
    }
  }

  const handleMouseLeave = () => {
    isDragging.current = false
    if (scrollRef.current) scrollRef.current.style.cursor = ''
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      isDragging.current = false
      if (scrollRef.current) scrollRef.current.style.cursor = ''
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    e.preventDefault()
    const y = e.pageY - scrollRef.current.offsetTop
    const walk = (y - startY.current) * 1.5 // The scroll speed multiplier
    scrollRef.current.scrollTop = scrollTop.current - walk
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent default context menu on right click to allow smooth dragging
    e.preventDefault()
  }

  return (
    <ClockAppearanceProvider>
      <ClockLayoutContent 
        scrollRef={scrollRef}
        showStudio={showStudio}
        setShowStudio={setShowStudio}
        sectionId={sectionId}
        handlers={{ handleMouseDown, handleMouseLeave, handleMouseUp, handleMouseMove, handleContextMenu }}
      />
    </ClockAppearanceProvider>
  )
}

function ClockLayoutContent({ scrollRef, showStudio, setShowStudio, sectionId, handlers }: any) {
  const { settings, loadAssetInfo } = useClockAppearance()
  const [cursorUrl, setCursorUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (settings.cursor.type === 'image' && settings.cursor.assetId) {
      loadAssetInfo(settings.cursor.assetId).then((asset: any) => {
        if (asset) setCursorUrl(asset.relativePath)
        else setCursorUrl(null)
      })
    } else {
      setCursorUrl(null)
    }
  }, [settings.cursor.type, settings.cursor.assetId, loadAssetInfo])

  const cursorStyle = cursorUrl 
    ? { cursor: `url('${cursorUrl}'), auto` } 
    : (settings.cursor.type === 'emoji' && settings.cursor.emoji)
      ? { cursor: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='48' viewport='0 0 100 100' style='fill:black;font-size:24px;'><text y='50%'>${settings.cursor.emoji}</text></svg>") 16 0, auto` }
      : {}

  return (
    <div 
      className="flex flex-col h-full bg-background relative overflow-hidden text-[var(--clock-text)]" 
      style={{ '--clock-text': 'inherit', ...cursorStyle } as any}
    >
      <ClockBackground sectionId={sectionId} />
      
      <div className="relative z-10 flex justify-between items-center pr-4 border-b border-border bg-card/50 backdrop-blur-md">
        <TopNav />
        <div className="relative group">
          <button 
            onClick={() => setShowStudio(!showStudio)}
            className={`p-2 rounded-xl transition-all duration-300 shadow-sm ${showStudio ? 'bg-primary text-primary-foreground shadow-primary/30' : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border/50'}`}
            title="Clock Personalization Studio"
          >
            <MoreVertical size={20} className={showStudio ? "rotate-90 transition-transform duration-300" : "transition-transform duration-300"} />
          </button>
          <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-medium shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Personalize Clock
          </div>
        </div>
      </div>
        
        <div 
          ref={scrollRef}
          onMouseDown={handlers.handleMouseDown}
          onMouseLeave={handlers.handleMouseLeave}
          onMouseUp={handlers.handleMouseUp}
          onMouseMove={handlers.handleMouseMove}
          onContextMenu={handlers.handleContextMenu}
          className="flex-1 overflow-auto p-6 scrollbar-none relative z-10"
        >
          <div className="max-w-5xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/alarm" element={<Alarm />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/stopwatch" element={<Stopwatch />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/ai-sight" element={<AISight />} />
              <Route path="*" element={<Navigate to="/clock" replace />} />
            </Routes>
          </div>
        </div>
        
        <ClockStudioPanel isOpen={showStudio} onClose={() => setShowStudio(false)} />
    </div>
  )
}
