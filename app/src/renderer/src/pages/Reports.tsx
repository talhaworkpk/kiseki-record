import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Clock, CalendarDays, Calendar as CalendarIcon, FileSearch, LineChart, Award, Download } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'
import Overview from './reports/Overview'
import TimelineReport from './reports/TimelineReport'
import MonthlyReport from './reports/MonthlyReport'
import YearlyReport from './reports/YearlyReport'
import CustomReport from './reports/CustomReport'
import Analytics from './reports/Analytics'
import AchievementsReport from './reports/AchievementsReport'
import Export from './reports/Export'

function SidebarLink({ to, icon: Icon, description, children }: { to: string, icon: any, description?: string, children: React.ReactNode }) {
  const location = useLocation()
  
  // If 'to' is '/reports', exact match it so it doesn't highlight for all subpaths
  const isActive = to === '/reports' 
    ? location.pathname === '/reports' || location.pathname === '/reports/' 
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

export default function Reports() {
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)

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
    <div className="flex h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-50 via-background to-indigo-50/50 dark:from-sky-950/30 dark:via-background dark:to-indigo-950/30 overflow-hidden animate-in fade-in duration-500">
      
      {/* Reports Sidebar */}
      {!isSidebarHidden && (
      <aside className="w-64 border-r border-border bg-gradient-to-b from-white/60 to-sky-50/30 dark:from-slate-900/60 dark:to-slate-900/30 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <LineChart className="text-primary" />
            Life Reports
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Reflect on your progress</p>
        </div>
        
        <div className="p-3 space-y-1 flex-1 overflow-y-auto">
          <div className="pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">General</p>
          </div>
          <SidebarLink to="/reports" icon={LayoutDashboard} description="View a general summary of your recent activities across all areas of your life.">Overview</SidebarLink>
          <SidebarLink to="/reports/timeline" icon={Clock} description="See a chronological breakdown of everything you've recorded.">Timeline Report</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periodic</p>
          </div>
          <SidebarLink to="/reports/monthly" icon={CalendarDays} description="Review aggregated statistics and progress from the past month.">Monthly Reports</SidebarLink>
          <SidebarLink to="/reports/yearly" icon={CalendarIcon} description="Reflect on your overarching accomplishments and trends for the entire year.">Yearly Reports</SidebarLink>
          <SidebarLink to="/reports/custom" icon={FileSearch} description="Generate detailed reports tailored to specific date ranges and filters.">Custom Reports</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insights</p>
          </div>
          <SidebarLink to="/reports/analytics" icon={LineChart} description="Visualize data across habits, moods, and productivity with rich charts.">Analytics</SidebarLink>
          <SidebarLink to="/reports/achievements" icon={Award} description="See a summary of the badges and milestones you've achieved.">Achievements</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
          </div>
          <SidebarLink to="/reports/export" icon={Download} description="Download your data securely in various formats (PDF, CSV).">Export</SidebarLink>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-background">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/timeline" element={<TimelineReport />} />
          <Route path="/monthly" element={<MonthlyReport />} />
          <Route path="/yearly" element={<YearlyReport />} />
          <Route path="/custom" element={<CustomReport />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/achievements" element={<AchievementsReport />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </main>

    </div>
  )
}
