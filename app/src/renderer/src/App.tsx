import React, { useState, useEffect, ErrorInfo } from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Book, LayoutDashboard, Settings as SettingsIcon, FileText, Target, Zap, Users, GraduationCap, BrainCircuit, Bot, AlertTriangle, FileBarChart, CheckCircle2, Info, XCircle, Award, Mail, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import Records from './pages/Records'
import Journal from './pages/Journal'
import Settings from './pages/Settings'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import Habits from './pages/Habits'
import Relationships from './pages/Relationships'
import RelationshipProfile from './pages/RelationshipProfile'
import Skills from './pages/Skills'
import Career from './pages/Career'
import Assistant from './pages/Assistant'
import Logs from './pages/Logs'
import Reports from './pages/Reports'
import JournalAnalytics from './pages/JournalAnalytics'
import JournalTimeline from './pages/JournalTimeline'
import JournalDashboard from './pages/JournalDashboard'
import UserProfileDialog from './components/UserProfile'
import { PrivateSetupModal } from './components/auth/PrivateSetupModal'
import { PrivateAuthModal } from './components/auth/PrivateAuthModal'
import Notifications from './pages/Notifications'
import MemoryCapsules from './pages/MemoryCapsules'
import { UserProfile } from './types'
import { NavigationHistoryProvider, useNavigationHistory } from './contexts/NavigationHistoryContext'
import { NotificationProvider, useNotificationContext } from './contexts/NotificationContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip'

function NavigationButtons() {
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === 'ArrowLeft' && canGoBack) {
          e.preventDefault()
          goBack()
        } else if (e.key === 'ArrowRight' && canGoForward) {
          e.preventDefault()
          goForward()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canGoBack, canGoForward, goBack, goForward])

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Go Back (Ctrl + Left Arrow)"
          >
            <ChevronLeft size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Go Back (Ctrl + ←)
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className="p-2 rounded-lg hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Go Forward (Ctrl + Right Arrow)"
          >
            <ChevronRight size={20} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Go Forward (Ctrl + →)
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function NavLink({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation()
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          to={to} 
          className={`flex items-center gap-4 px-3 py-2.5 mx-2 rounded-md text-sm font-medium transition-colors duration-200 overflow-hidden ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
        >
          <div className="shrink-0 flex items-center justify-center ml-0.5"><Icon size={20} /></div>
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {children}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="group-hover:hidden">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ title, defaultOpen = true, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="space-y-1 mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center px-5 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group/btn outline-none overflow-hidden whitespace-nowrap h-6"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-1 text-left flex justify-between items-center w-full">
          {title}
          <span className="opacity-50 group-hover/btn:opacity-100 transition-opacity text-[10px]">{isOpen ? '▼' : '▶'}</span>
        </span>
      </button>
      {isOpen && <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  )
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
          <AlertTriangle size={64} className="text-red-500 mb-6 mx-auto" />
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">A component crashed while rendering.</p>
          <div className="w-full text-left bg-muted p-4 rounded-lg overflow-auto max-h-[500px] border border-border select-all">
            <p className="font-mono text-sm text-red-500 font-bold mb-4">{this.state.error?.toString()}</p>
            <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90"
          >
            Reload Application
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function KeyboardShortcutsWrapper() {
  useKeyboardShortcuts()
  return <AppShellWithNavigation />
}

function AppShellWithNavigation() {
  return (
    <TooltipProvider delayDuration={300}>
      <NotificationProvider>
        <AppShell />
      </NotificationProvider>
    </TooltipProvider>
  )
}

function AppShell() {
  const navigate = useNavigate()
  const [ollamaReady, setOllamaReady] = useState(false)
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  const [currentProfile, setCurrentProfile] = useState<'public' | 'private'>('public')
  const [showPrivateSetup, setShowPrivateSetup] = useState(false)
  const [showPrivateAuth, setShowPrivateAuth] = useState(false)

  // Activity tracking to prevent auto-lock while active
  useEffect(() => {
    if (currentProfile !== 'private') return

    let lastActivityTime = Date.now()
    const MIN_INTERVAL = 30000 // Send activity at most every 30 seconds

    const trackActivity = () => {
      const now = Date.now()
      if (now - lastActivityTime > MIN_INTERVAL) {
        lastActivityTime = now
        // @ts-ignore
        if (window.api.profile?.activity) {
          // @ts-ignore
          window.api.profile.activity().catch(console.error)
        }
      }
    }

    window.addEventListener('mousemove', trackActivity, { passive: true })
    window.addEventListener('keydown', trackActivity, { passive: true })
    window.addEventListener('click', trackActivity, { passive: true })

    return () => {
      window.removeEventListener('mousemove', trackActivity)
      window.removeEventListener('keydown', trackActivity)
      window.removeEventListener('click', trackActivity)
    }
  }, [currentProfile])

  // Profile management & shortcut
  useEffect(() => {
    // @ts-ignore
    if (!window.api.ipcRenderer || !window.api.profile) return
    
    // Check current profile
    // @ts-ignore
    window.api.profile.getCurrent().then(cp => setCurrentProfile(cp))

    const handleProfileChanged = (_event: any, newProfile: string) => {
      // Complete state wipe by reloading
      window.location.reload()
    }
    // @ts-ignore
    window.api.ipcRenderer.on('profile-changed', handleProfileChanged)

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        // @ts-ignore
        const current = await window.api.profile.getCurrent()
        if (current === 'private') {
           // @ts-ignore
           await window.api.profile.switch(null)
        } else {
           // @ts-ignore
           const hasPrivate = await window.api.profile.hasPrivate()
           if (hasPrivate) setShowPrivateAuth(true)
           else setShowPrivateSetup(true)
        }
      }
      if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault()
        // @ts-ignore
        if (window.api.app && window.api.app.restart) {
          // @ts-ignore
          window.api.app.restart()
        } else {
          window.location.reload()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)

    const handleDesktopNotificationClick = (_event: any, data: any) => {
      if (data && data.targetPath) {
        navigate(data.targetPath)
      }
    }
    // @ts-ignore
    window.api.ipcRenderer.on('desktop-notification-click', handleDesktopNotificationClick)

    return () => {
      // @ts-ignore
      window.api.ipcRenderer.removeListener('profile-changed', handleProfileChanged)
      // @ts-ignore
      window.api.ipcRenderer.removeListener('desktop-notification-click', handleDesktopNotificationClick)
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  useEffect(() => {
    const checkOllama = async () => {
      try {
        const res = await fetch('http://127.0.0.1:11434/', { method: 'GET' })
        if (res.ok) {
          setOllamaReady(true)
        } else {
          setOllamaReady(false)
        }
      } catch (e) {
        setOllamaReady(false)
      }
    }
    checkOllama()
    const interval = setInterval(checkOllama, 5000)
    return () => clearInterval(interval)
  }, [])

  // In a real app we'd load devModeEnabled from a store. For now, checking local storage as a quick workaround until we link settings
  useEffect(() => {
    const isDev = localStorage.getItem('developerMode') === 'true'
    setDevModeEnabled(isDev)
    
    // Listen for custom event from settings
    const handleStorageChange = () => {
      setDevModeEnabled(localStorage.getItem('developerMode') === 'true')
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Theme Management
  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem('theme') || 'system'
      const root = window.document.documentElement
      
      root.classList.remove('light', 'dark')
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    }
    
    applyTheme()
    window.addEventListener('themeChanged', applyTheme)
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', applyTheme)
    
    return () => {
      window.removeEventListener('themeChanged', applyTheme)
      mediaQuery.removeEventListener('change', applyTheme)
    }
  }, [])

  // Load user profile on mount and when dialog closes
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // @ts-ignore
        const data = await window.api.db.find('userProfile', {})
        if (data && data.length > 0) {
          setUserProfile(data[0])
          console.log('Profile loaded:', data[0])
        }
      } catch (err) {
        console.error('Failed to load user profile:', err)
      }
    }
    loadUserProfile()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      loadUserProfile()
    }
    window.addEventListener('profileUpdated', handleProfileUpdate)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate)
  }, [])

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="group w-[72px] hover:w-64 transition-all duration-300 ease-in-out border-r border-border bg-card flex flex-col shadow-sm z-50 flex-shrink-0 overflow-hidden relative">
        <div className="h-16 px-5 border-b border-border flex items-center gap-4 shrink-0 overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="w-8 h-8 shrink-0 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md hover:opacity-80 transition-opacity cursor-pointer"
              >
                {userProfile?.photoPath ? (
                  <img 
                    src={userProfile.photoPath} 
                    alt="Profile" 
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : userProfile?.fullName ? (
                  userProfile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                ) : (
                  'K'
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="group-hover:hidden">
              Profile & Settings
            </TooltipContent>
          </Tooltip>
          <span className="font-bold text-lg tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {currentProfile === 'private' ? `👤 ${userProfile?.fullName?.split(' ')[0] || 'Private'}` : 'Kiseki Record'}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-none custom-scrollbar-sidebar">
          <NavGroup title="Overview">
            <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/reports" icon={FileBarChart}>Reports</NavLink>
          </NavGroup>
          
          <NavGroup title="Core" defaultOpen={true}>
            <NavLink to="/records" icon={FileText}>Records</NavLink>
            <NavLink to="/journal" icon={Book}>Journal</NavLink>
            <NavLink to="/memory-capsules" icon={Mail}>Memory Capsules</NavLink>
          </NavGroup>

          <NavGroup title="Life Management">
            <NavLink to="/career/goals" icon={Target}>Goals</NavLink>
            <NavLink to="/habits" icon={Zap}>Habits</NavLink>
            <NavLink to="/relationships" icon={Users}>Relationships</NavLink>
            <NavLink to="/career/skills" icon={BrainCircuit}>Skills</NavLink>
            <NavLink to="/career" icon={GraduationCap}>Edu & Career</NavLink>
          </NavGroup>

          <NavGroup title="Intelligence">
            <NavLink to="/assistant" icon={Bot}>AI Assistant</NavLink>
          </NavGroup>

          {devModeEnabled && (
            <NavGroup title="Developer" defaultOpen={false}>
              <NavLink to="/logs" icon={AlertTriangle}>Errors & Logs</NavLink>
            </NavGroup>
          )}

          <NavGroup title="System">
            <NavLink to="/notifications" icon={Bell}>
              <div className="flex items-center justify-between w-full">
                <span>Notifications</span>
                <NotificationBadge />
              </div>
            </NavLink>
          </NavGroup>
        </div>
        <div className="h-16 border-t border-border px-5 flex items-center shrink-0 bg-card/50 overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings" className="flex items-center gap-4 text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-accent rounded-md overflow-hidden">
                <SettingsIcon size={20} className="shrink-0" />
                <span className="whitespace-nowrap font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="group-hover:hidden">
              Application Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background relative">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 z-50">
          <NavigationButtons />
          <div className="flex items-center gap-4">
            <NotificationDropdown devModeEnabled={devModeEnabled} />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-xs font-medium transition-colors cursor-default ${ollamaReady ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${ollamaReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {ollamaReady ? 'Ollama Ready' : 'Ollama Offline'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {ollamaReady ? 'Local AI is running and ready' : 'Local AI is not running. Please start Ollama.'}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto relative">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/reports/*" element={<Reports />} />
              <Route path="/records" element={<Records />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/journal/dashboard" element={<JournalDashboard />} />
              <Route path="/journal/analytics" element={<JournalAnalytics />} />
              <Route path="/journal/timeline" element={<JournalTimeline />} />
              <Route path="/memory-capsules" element={<MemoryCapsules />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/habits/*" element={<Habits />} />
              <Route path="/relationships" element={<Relationships />} />
              <Route path="/relationships/:id" element={<RelationshipProfile />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/career/*" element={<Career />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      <UserProfileDialog isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      
      <PrivateSetupModal 
        isOpen={showPrivateSetup} 
        onClose={() => setShowPrivateSetup(false)} 
        onSuccess={() => { setShowPrivateSetup(false); setShowPrivateAuth(true) }} 
      />
      <PrivateAuthModal 
        isOpen={showPrivateAuth} 
        onClose={() => setShowPrivateAuth(false)} 
        onSuccess={() => setShowPrivateAuth(false)} 
      />
    </div>
  )
}

// Local component for the Notification Badge in Sidebar
function NotificationBadge() {
  const { unreadCount } = useNotificationContext()
  if (unreadCount === 0) return null
  return <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount > 99 ? '99+' : unreadCount}</span>
}

// Local component for Notification Dropdown

function NotificationDropdown({ devModeEnabled }: { devModeEnabled: boolean }) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationContext()
  const navigate = useNavigate()
  
  // Close dropdown when clicking outside
  const ref = React.useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const recent = notifications.slice(0, 5) // Show top 5

  return (
    <div className="relative" ref={ref}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            onClick={() => setOpen(!open)}
            className={`relative p-2 rounded-md transition-colors ${open ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card"></span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Notifications
        </TooltipContent>
      </Tooltip>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
          <div className="p-3 border-b border-border flex items-center justify-between bg-accent/30">
            <h3 className="font-bold text-sm">Notifications</h3>
            <div className="flex gap-2">
              {devModeEnabled && (
                <button 
                  onClick={() => {
                    const event = new CustomEvent('app-notification', {
                      detail: { _id: Date.now().toString(), type: 'info', title: 'Test Notification', message: 'This is a manual test of the toast system.', timestamp: Date.now(), isRead: false }
                    })
                    window.dispatchEvent(event)
                  }}
                  className="text-[10px] uppercase tracking-wider font-bold text-purple-500 hover:underline"
                >
                  Test Toast
                </button>
              )}
              {unreadCount > 0 && (
                <button onClick={() => markAllAsRead()} className="text-[10px] uppercase tracking-wider font-bold text-primary hover:underline">Mark all read</button>
              )}
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="mx-auto mb-2 opacity-20" size={24}/>
                <p className="text-xs">No notifications yet.</p>
              </div>
            ) : (
              recent.map(n => {
                let icon = <Info className="text-blue-500" size={16} />
                if (n.type === 'success') icon = <CheckCircle2 className="text-green-500" size={16} />
                else if (n.type === 'warning') icon = <AlertTriangle className="text-yellow-500" size={16} />
                else if (n.type === 'error') icon = <XCircle className="text-red-500" size={16} />
                else if (n.type === 'achievement') icon = <Award className="text-yellow-500" size={16} />
                else if (n.type === 'milestone') icon = <Target className="text-orange-500" size={16} />
                else if (n.type === 'memory') icon = <Mail className="text-pink-500" size={16} />

                return (
                  <div 
                    key={n._id}
                    onClick={() => {
                      markAsRead(n._id!)
                      setOpen(false)
                      if (n.targetPath) navigate(n.targetPath)
                    }}
                    className={`p-3 border-b border-border last:border-0 hover:bg-accent cursor-pointer transition-colors flex items-start gap-3 ${!n.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="shrink-0 mt-0.5">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-bold truncate ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</span>
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-2"></span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">{n.message}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          <Link 
            to="/notifications" 
            onClick={() => setOpen(false)}
            className="block w-full p-2 text-center text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors bg-accent/10 border-t border-border"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <NavigationHistoryProvider>
        <KeyboardShortcutsWrapper />
      </NavigationHistoryProvider>
    </Router>
  )
}
