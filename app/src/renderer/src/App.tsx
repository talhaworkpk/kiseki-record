import React, { useState, useEffect, ErrorInfo } from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Book, LayoutDashboard, Settings as SettingsIcon, FileText, Target, Zap, Users, GraduationCap, BrainCircuit, Bot, AlertTriangle, FileBarChart, CheckCircle2, Info, XCircle, Award, Mail, Bell, ChevronLeft, ChevronRight, FolderGit2, Stars, Rocket, Clock, ScrollText } from 'lucide-react'
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
import ChronicleLayout from './pages/chronicle/ChronicleLayout'
import ChronicleEntryView from './pages/chronicle/ChronicleEntryView'
import ProjectsPortfolio from './pages/career/ProjectsPortfolio'
import CareerGoals from './pages/career/Goals'
import SkillsTracker from './pages/career/SkillsTracker'
import BuildGrow from './pages/BuildGrow'
import DreamList from './pages/dreams/DreamList'
import DreamDetail from './pages/dreams/DreamDetail'
import { DREAM_CATEGORIES } from './lib/constants/dreams'
import { UserProfile } from './types'
import { NavigationHistoryProvider, useNavigationHistory } from './contexts/NavigationHistoryContext'
import { NotificationProvider, useNotificationContext } from './contexts/NotificationContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip'
import { ClockProvider } from './contexts/ClockContext'
import ClockLayout from './pages/clock/ClockLayout'
import { GlobalAlarmOverlay } from './components/GlobalAlarmOverlay'
import { GlobalAchievementCelebration } from './components/GlobalAchievementCelebration'
import { AchievementEngine } from './lib/AchievementEngine'
import { MessageReceiverService } from './lib/messaging/MessageReceiverService'
import { OnlineReminderService } from './lib/messaging/OnlineReminderService'
import { UnknownSenderModal } from './components/relationships/UnknownSenderModal'
import { CustomTitleBar } from './components/CustomTitleBar'
import { CustomCursor } from './components/CustomCursor'
import { OverscrollContainer } from './components/ui/OverscrollContainer'
import { GlobalWelcome } from './components/onboarding/GlobalWelcome'
import { onboardingService } from './lib/onboardingService'

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
    <div className="flex items-center gap-1.5 bg-background/40 backdrop-blur-xl p-1 rounded-full border border-border/10 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={goBack}
            disabled={!canGoBack}
            onPointerDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-full hover:bg-white/40 dark:hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-90 active:translate-y-0 active:shadow-inner disabled:opacity-30 disabled:scale-100 disabled:translate-y-0 disabled:cursor-not-allowed transition-all duration-300 text-muted-foreground hover:text-foreground disabled:hover:bg-transparent disabled:hover:shadow-none ring-1 ring-transparent hover:ring-white/20"
            title="Go Back (Ctrl + Left Arrow)"
          >
            <ChevronLeft size={18} strokeWidth={2.5} className="transition-transform duration-300" />
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
            onPointerDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-full hover:bg-white/40 dark:hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-90 active:translate-y-0 active:shadow-inner disabled:opacity-30 disabled:scale-100 disabled:translate-y-0 disabled:cursor-not-allowed transition-all duration-300 text-muted-foreground hover:text-foreground disabled:hover:bg-transparent disabled:hover:shadow-none ring-1 ring-transparent hover:ring-white/20"
            title="Go Forward (Ctrl + Right Arrow)"
          >
            <ChevronRight size={18} strokeWidth={2.5} className="transition-transform duration-300" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Go Forward (Ctrl + →)
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function NavLink({ to, icon: Icon, description, children }: { to: string, icon: any, description?: string, children: React.ReactNode }) {
  const location = useLocation()
  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  const linkRef = React.useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (isActive && linkRef.current) {
      linkRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          ref={linkRef}
          to={to} 
          onPointerDown={(e) => e.preventDefault()}
          className={`flex items-center gap-3.5 px-2 py-1.5 mx-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden group/link relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border-l-[3px] border-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] dark:shadow-none" />
          )}
          <div className={`relative shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-lg transition-all duration-500 z-10 ${isActive ? 'bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_4px_12px_rgba(var(--primary),0.4)] ring-1 ring-white/20 dark:ring-white/10 scale-100' : 'bg-transparent group-hover/link:bg-accent/80 group-hover/link:shadow-sm scale-95 group-hover/link:scale-100'}`}>
            <Icon size={18} strokeWidth={1.75} className={`transition-transform duration-500 ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} />
          </div>
          <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 font-semibold tracking-wide translate-x-[-8px] group-hover:translate-x-0">
            {children}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="group-hover:hidden border-none p-0 bg-transparent shadow-none">
        <div className="bg-gradient-to-br from-sky-400 via-blue-600 to-amber-500 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-xl p-3.5 flex flex-col gap-1.5 w-60 text-white relative overflow-hidden">
          {/* Subtle top highlight for a premium glass-like reflection */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
          <div className="flex items-center gap-2.5 font-bold text-sm text-white relative z-10 drop-shadow-sm">
            <div className="p-1.5 bg-white/20 rounded-md text-white backdrop-blur-sm">
              <Icon size={16} />
            </div>
            {children}
          </div>
          {description && <p className="text-xs text-blue-50 leading-relaxed drop-shadow-sm">{description}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function NavGroup({ title, defaultOpen = true, to, children }: { title: string, defaultOpen?: boolean, to?: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const navigate = useNavigate()
  
  const handleClick = () => {
    if (to) {
      navigate(to)
      setIsOpen(true)
    } else {
      setIsOpen(!isOpen)
    }
  }

  return (
    <div className="space-y-1 mb-4">
      <button 
        onClick={handleClick} 
        className="w-full flex items-center px-5 py-2 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-[0.25em] hover:text-foreground transition-all duration-300 group/btn outline-none overflow-hidden whitespace-nowrap h-8"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex-1 text-left flex justify-between items-center w-full translate-x-[-4px] group-hover:translate-x-0">
          {title}
          <span className="opacity-0 group-hover/btn:opacity-100 transition-all duration-300 text-[9px] translate-x-2 group-hover/btn:translate-x-0">{isOpen ? '▼' : '▶'}</span>
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
        <ClockProvider>
          <CustomCursor />
          <AppShell />
        </ClockProvider>
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
  
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
  const [isNavbarHidden, setIsNavbarHidden] = useState(false)
  const [isTitleBarHidden, setIsTitleBarHidden] = useState(false)

  // Global onboarding welcome
  const [showGlobalWelcome, setShowGlobalWelcome] = useState(false)
  const [onboardingReady, setOnboardingReady] = useState(false)

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
        const res = await fetch(`http://127.0.0.1:11434/?t=${Date.now()}`, { method: 'GET', cache: 'no-store' })
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

  useEffect(() => {
    MessageReceiverService.initialize();
    OnlineReminderService.init();
    AchievementEngine.reconcileAchievements();
  }, []);

  // Initialize onboarding system
  useEffect(() => {
    const initOnboarding = async () => {
      await onboardingService.initializeForExistingUser()
      if (!onboardingService.isGlobalCompleted()) {
        setShowGlobalWelcome(true)
      }
      setOnboardingReady(true)
    }
    initOnboarding()
  }, []);

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
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        const isDark = window.document.documentElement.classList.contains('dark')
        const newTheme = isDark ? 'light' : 'dark'
        localStorage.setItem('theme', newTheme)
        window.dispatchEvent(new Event('themeChanged'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('themeChanged', applyTheme)
      mediaQuery.removeEventListener('change', applyTheme)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Focus mode state tracking
  const focusStateRef = React.useRef({ isSidebarHidden, isNavbarHidden })
  useEffect(() => {
    focusStateRef.current = { isSidebarHidden, isNavbarHidden }
  }, [isSidebarHidden, isNavbarHidden])

  // Focus Mode Shortcuts
  useEffect(() => {
    const handleFocusShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F12') {
        e.preventDefault()
        const { isSidebarHidden: s, isNavbarHidden: n } = focusStateRef.current
        const isFocusMode = s && n
        setIsSidebarHidden(!isFocusMode)
        setIsNavbarHidden(!isFocusMode)
      }
      if (e.key === 'F11') {
        // Intentionally not preventing default so native fullscreen triggers
        setIsTitleBarHidden(prev => !prev)
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        setIsNavbarHidden(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleFocusShortcuts)
    return () => window.removeEventListener('keydown', handleFocusShortcuts)
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
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {!isTitleBarHidden && <CustomTitleBar />}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
      {!isSidebarHidden && (
        <div className="w-[74px] shrink-0 z-50 relative">
          <aside className="absolute top-0 bottom-0 left-0 group w-[74px] hover:w-64 transition-all duration-500 ease-out border-r border-border/10 bg-background/50 backdrop-blur-3xl flex flex-col shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_32px_-4px_rgba(0,0,0,0.4)] z-50 flex-shrink-0 overflow-hidden">
        <div className="h-20 px-5 flex items-center gap-3.5 shrink-0 overflow-hidden relative">
          {/* Premium Ambient Profile Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-400/30 via-sky-100/5 to-transparent dark:from-sky-400/20 dark:via-sky-900/5 dark:to-transparent pointer-events-none" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="relative w-10 h-10 shrink-0 bg-gradient-to-tr from-blue-600 via-primary to-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-[0_6px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(var(--primary),0.4)] hover:scale-105 transition-all duration-500 cursor-pointer ring-[1.5px] ring-white/30 dark:ring-white/10 z-10 overflow-hidden before:absolute before:inset-0 before:rounded-full before:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"
              >
                {userProfile?.photoPath ? (
                  <img 
                    src={userProfile.photoPath} 
                    alt="Profile" 
                    className="w-full h-full object-cover z-10"
                  />
                ) : userProfile?.fullName ? (
                  <span className="z-10">{userProfile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                ) : (
                  <span className="z-10">K</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="group-hover:hidden">
              Profile & Settings
            </TooltipContent>
          </Tooltip>
          <span className="font-bold text-[15px] tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-1 min-w-0 truncate">
            {currentProfile === 'private' ? `${userProfile?.fullName?.split(' ')[0] || 'Private'}` : userProfile?.fullName?.split(' ').slice(0, 2).join(' ') || 'Kiseki Record'}
          </span>
        </div>

        <OverscrollContainer className="flex-1 relative z-40">
          <NavGroup title="Overview">
            <NavLink to="/" icon={LayoutDashboard} description="View your daily summary, quick stats, and overall progress at a glance.">Dashboard</NavLink>
            <NavLink to="/reports" icon={FileBarChart} description="Detailed analytics and insights across all your activities and areas of life.">Reports</NavLink>
          </NavGroup>
          
          <NavGroup title="Core" defaultOpen={true}>
            <NavLink to="/records" icon={FileText} description="Store and manage your personal documents, notes, and essential data.">Records</NavLink>
            <NavLink to="/journal" icon={Book} description="Write daily entries, track your mood, and reflect on your experiences.">Journal</NavLink>
            <NavLink to="/memory-capsules" icon={Mail} description="Create time capsules with messages and files to be unlocked in the future.">Memory Capsules</NavLink>
            <NavLink to="/clock" icon={Clock} description="Manage your time, run focused sessions, and review your activity timeline.">Clock</NavLink>
            <NavLink to="/chronicle" icon={ScrollText} description="Your personal chronological timeline and event log.">Chronicle</NavLink>
          </NavGroup>

          <NavGroup title="Build & Grow" defaultOpen={true}>
            <NavLink to="/build-grow/overview" icon={Rocket} description="Overview of the things you're building, achieving, and developing.">Build & Grow</NavLink>
          </NavGroup>

          <NavGroup title="Dreams" defaultOpen={true}>
            <NavLink to="/dreams" icon={Stars} description="Things you want to achieve, experience, build, or make real in your life.">Dreams</NavLink>
          </NavGroup>

          <NavGroup title="Life Management">
            <NavLink to="/habits" icon={Zap} description="Build positive routines, track streaks, and analyze your daily habits.">Habits</NavLink>
            <NavLink to="/relationships" icon={Users} description="Manage connections, set reminders, and nurture your personal network.">Relationships</NavLink>
            <NavLink to="/career" icon={GraduationCap} description="Track your educational milestones, professional experience, and career trajectory.">Edu & Career</NavLink>
          </NavGroup>

          <NavGroup title="Intelligence">
            <NavLink to="/assistant" icon={Bot} description="Chat with your local AI to analyze data, get advice, and generate insights.">AI Assistant</NavLink>
          </NavGroup>

          {devModeEnabled && (
            <NavGroup title="Developer" defaultOpen={false}>
              <NavLink to="/logs" icon={AlertTriangle} description="System diagnostics, error tracking, and application logs for developers.">Errors & Logs</NavLink>
            </NavGroup>
          )}

          <NavGroup title="System">
            <NavLink to="/notifications" icon={Bell} description="View all your recent alerts, reminders, and system notifications.">
              <div className="flex items-center justify-between w-full">
                <span>Notifications</span>
                <NotificationBadge />
              </div>
            </NavLink>
          </NavGroup>
        </OverscrollContainer>
        <div className="h-[72px] border-t border-border/10 px-5 flex items-center shrink-0 bg-background/20 backdrop-blur-xl overflow-hidden relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link 
                to="/settings" 
                onPointerDown={(e) => e.preventDefault()}
                className="flex items-center gap-3.5 text-muted-foreground hover:text-foreground transition-all duration-300 p-1.5 hover:bg-accent/40 rounded-xl overflow-hidden group/settings w-full relative z-10 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              >
                <div className="relative shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-lg transition-all duration-500 bg-transparent group-hover/settings:bg-accent group-hover/settings:shadow-sm">
                  <SettingsIcon size={18} strokeWidth={1.75} className="shrink-0 transition-transform duration-700 group-hover/settings:rotate-180 group-hover/settings:text-primary" />
                </div>
                <span className="whitespace-nowrap font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 tracking-wide translate-x-[-8px] group-hover:translate-x-0">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="group-hover:hidden border-none p-0 bg-transparent shadow-none">
              <div className="bg-gradient-to-br from-sky-400 via-blue-600 to-amber-500 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-xl p-3.5 flex flex-col gap-1.5 w-60 text-white relative overflow-hidden">
                {/* Subtle top highlight for a premium glass-like reflection */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                <div className="flex items-center gap-2.5 font-bold text-sm text-white relative z-10 drop-shadow-sm">
                  <div className="p-1.5 bg-white/20 rounded-md text-white backdrop-blur-sm">
                    <SettingsIcon size={16} />
                  </div>
                  Settings
                </div>
                <p className="text-xs text-blue-50 leading-relaxed drop-shadow-sm">Configure application preferences and behavior.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {/* Premium Ambient Background */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400/20 via-sky-100/5 to-transparent dark:from-sky-400/10 dark:via-sky-900/5 dark:to-transparent" />
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/20 via-blue-100/5 to-transparent dark:from-blue-500/10 dark:via-blue-900/5 dark:to-transparent" />
        
        {!isNavbarHidden && (
          <header className="h-[72px] border-b border-border/10 bg-background/40 backdrop-blur-2xl flex items-center justify-between px-8 z-40 shrink-0 relative shadow-[0_4px_24px_-8px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.2)]">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none" />
          <div className="relative z-10 w-full flex items-center justify-between">
            <NavigationButtons />
            <div className="flex items-center gap-4">
              <NotificationDropdown devModeEnabled={devModeEnabled} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-[11px] font-bold tracking-wider uppercase transition-all duration-500 shadow-sm backdrop-blur-md cursor-default ${ollamaReady ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                    <div className="relative flex h-2 w-2">
                      {ollamaReady && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${ollamaReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                    {ollamaReady ? 'Ollama Ready' : 'Ollama Offline'}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {ollamaReady ? 'Local AI is running and ready' : 'Local AI is not running. Please start Ollama.'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
        )}
        
        <OverscrollContainer className="flex-1 min-h-0 relative z-10" containerClassName="flex flex-col min-h-0">
          <main className="flex-1 min-h-0 flex flex-col relative z-10">
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
                <Route path="/chronicle" element={<ChronicleLayout />} />
                <Route path="/chronicle/:entryId" element={<ChronicleEntryView />} />
                <Route path="/clock/*" element={<ClockLayout />} />
                <Route path="/build-grow/*" element={<BuildGrow />} />
                <Route path="/dreams" element={<DreamList />} />
                <Route path="/dreams/:category" element={<DreamList />} />
                <Route path="/dreams/view/:dreamId" element={<DreamDetail />} />
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
        </OverscrollContainer>
      </div>
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
      <GlobalAlarmOverlay />
      <GlobalAchievementCelebration />
      <UnknownSenderModal />
      {showGlobalWelcome && (
        <GlobalWelcome
          onComplete={() => {
            onboardingService.completeGlobal()
            setShowGlobalWelcome(false)
          }}
        />
      )}
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
            className={`relative p-2.5 rounded-full transition-all duration-300 group ${open ? 'bg-primary/10 text-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_0_12px_rgba(var(--primary),0.2)] ring-1 ring-primary/30 scale-95' : 'bg-background/40 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10 hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 active:scale-90 active:translate-y-0 active:shadow-inner ring-1 ring-border/10 hover:ring-white/20'}`}
          >
            <Bell size={18} strokeWidth={1.75} className={`transition-transform duration-300 ${open ? 'scale-110' : 'group-hover:rotate-[15deg] group-hover:scale-110'}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Notifications
        </TooltipContent>
      </Tooltip>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-[340px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right ring-1 ring-white/10 dark:ring-white/5">
          <div className="p-4 border-b border-border/10 flex items-center justify-between bg-gradient-to-b from-primary/5 to-transparent relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-50"></div>
            <h3 className="font-bold text-[12px] tracking-widest uppercase text-foreground/80">Notifications</h3>
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
          
          <div className="max-h-[360px] overflow-y-auto scrollbar-none">
            {recent.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50 pointer-events-none" />
                <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center mb-3 ring-1 ring-border/20 shadow-inner">
                  <Bell className="opacity-40" size={20}/>
                </div>
                <p className="text-xs font-medium text-muted-foreground/70">No notifications right now.</p>
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
                    className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-all flex items-start gap-4 ${!n.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="shrink-0 mt-0.5 opacity-80">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[13px] font-bold truncate ${!n.isRead ? 'text-foreground' : 'text-muted-foreground/80'}`}>{n.title}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0 ml-2 shadow-[0_0_6px_var(--primary)]"></span>}
                      </div>
                      <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.isRead ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>{n.message}</p>
                      <span className="text-[9px] font-medium text-muted-foreground/40 mt-1.5 block uppercase tracking-wider">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          {recent.length > 0 && (
            <div className="p-2 bg-background/40 backdrop-blur-sm border-t border-white/5">
              <button 
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="w-full py-2 text-[11px] font-bold text-center text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider rounded-lg hover:bg-white/5"
              >
                View all notifications
              </button>
            </div>
          )}
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
