import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, LineChart, ListChecks, Award, Sparkles, Target, Archive, Search } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'
import { useOnboarding } from '../hooks/useOnboarding'
import { SectionWelcome } from '../components/onboarding/SectionWelcome'
import { ONBOARDING_CONFIGS } from '../lib/onboardingConfig'

// Placeholders for Sub-Pages
import Dashboard from './habits/Dashboard'
import Timeline from './habits/Timeline'
import Analytics from './habits/Analytics'
import History from './habits/History'
import Milestones from './habits/Milestones'
import Archived from './habits/Archived'
import HabitDetails from './habits/HabitDetails'
import AIInsights from './habits/AIInsights'
import AllHabits from './habits/AllHabits'

function SidebarLink({ to, icon: Icon, description, children }: { to: string, icon: any, description?: string, children: React.ReactNode }) {
  const location = useLocation()
  
  // Exact match for base route
  const isActive = to === '/habits' 
    ? location.pathname === '/habits' || location.pathname === '/habits/'
    : location.pathname.startsWith(to)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isActive 
              ? 'bg-primary/10 text-primary font-medium' 
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Icon size={18} />
          {children}
        </Link>
      </TooltipTrigger>
      {description && (
        <TooltipContent side="right" sideOffset={10} className="border-none p-0 bg-transparent shadow-none z-50">
          <div className="bg-gradient-to-br from-sky-400 via-blue-600 to-amber-500 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-xl p-3.5 flex flex-col gap-1.5 w-60 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            <div className="flex items-center gap-2.5 font-bold text-sm text-white relative z-10 drop-shadow-sm">
              <div className="p-1.5 bg-white/20 rounded-md text-white backdrop-blur-sm">
                <Icon size={16} />
              </div>
              {children}
            </div>
            <p className="text-xs text-blue-50 leading-relaxed drop-shadow-sm">{description}</p>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

export default function Habits() {
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
  const { showWelcome, completeWelcome } = useOnboarding('habits')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setIsSidebarHidden(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {showWelcome && <SectionWelcome config={ONBOARDING_CONFIGS.habits} onComplete={completeWelcome} />}
    <div className="flex-1 min-h-0 flex h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-50 via-background to-indigo-50/50 dark:from-sky-950/30 dark:via-background dark:to-indigo-950/30 overflow-hidden animate-in fade-in duration-500">
      
      {/* Habits Sidebar */}
      {!isSidebarHidden && (
      <aside className="w-64 border-r border-border bg-gradient-to-b from-white/60 to-sky-50/30 dark:from-slate-900/60 dark:to-slate-900/30 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2 text-primary">
            <ListChecks />
            Habit Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Track and improve daily</p>
        </div>
        
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          <div className="pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tracking</p>
          </div>
          <SidebarLink to="/habits" icon={LayoutDashboard} description="Get a daily overview of your habits, completion rates, and active streaks.">Dashboard</SidebarLink>
          <SidebarLink to="/habits/all" icon={ListChecks} description="Manage and configure all your tracked habits in one place.">All Habits</SidebarLink>
          <SidebarLink to="/habits/timeline" icon={CalendarDays} description="View your habit consistency and logs on a calendar view.">Timeline</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intelligence</p>
          </div>
          <SidebarLink to="/habits/analytics" icon={LineChart} description="Dive deep into charts showing your habit performance over time.">Analytics</SidebarLink>
          <SidebarLink to="/habits/insights" icon={Sparkles} description="Get AI recommendations on when to build habits based on your past data.">AI Insights</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Records</p>
          </div>
          <SidebarLink to="/habits/history" icon={Search} description="Search and review the historical logs of all your habit check-ins.">History</SidebarLink>
          <SidebarLink to="/habits/milestones" icon={Award} description="See the milestones and long-term achievements you've unlocked.">Milestones</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</p>
          </div>
          <SidebarLink to="/habits/archived" icon={Archive} description="View habits you have paused or retired from your daily routine.">Archived Habits</SidebarLink>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-transparent">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/all" element={<AllHabits />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<History />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/archived" element={<Archived />} />
          <Route path="/insights" element={<AIInsights />} />
          <Route path="/:id" element={<HabitDetails />} />
        </Routes>
      </main>

    </div>
    </>
  )
}
