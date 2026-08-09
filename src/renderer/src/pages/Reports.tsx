import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Clock, CalendarDays, Calendar as CalendarIcon, FileSearch, LineChart, Award, Download } from 'lucide-react'
import Overview from './reports/Overview'
import TimelineReport from './reports/TimelineReport'
import MonthlyReport from './reports/MonthlyReport'
import YearlyReport from './reports/YearlyReport'
import CustomReport from './reports/CustomReport'
import Analytics from './reports/Analytics'
import AchievementsReport from './reports/AchievementsReport'
import Export from './reports/Export'

function SidebarLink({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation()
  
  // If 'to' is '/reports', exact match it so it doesn't highlight for all subpaths
  const isActive = to === '/reports' 
    ? location.pathname === '/reports' || location.pathname === '/reports/' 
    : location.pathname.startsWith(to)

  return (
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
  )
}

export default function Reports() {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden animate-in fade-in duration-500">
      
      {/* Reports Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col h-full flex-shrink-0">
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
          <SidebarLink to="/reports" icon={LayoutDashboard}>Overview</SidebarLink>
          <SidebarLink to="/reports/timeline" icon={Clock}>Timeline Report</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periodic</p>
          </div>
          <SidebarLink to="/reports/monthly" icon={CalendarDays}>Monthly Reports</SidebarLink>
          <SidebarLink to="/reports/yearly" icon={CalendarIcon}>Yearly Reports</SidebarLink>
          <SidebarLink to="/reports/custom" icon={FileSearch}>Custom Reports</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insights</p>
          </div>
          <SidebarLink to="/reports/analytics" icon={LineChart}>Analytics</SidebarLink>
          <SidebarLink to="/reports/achievements" icon={Award}>Achievements</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
          </div>
          <SidebarLink to="/reports/export" icon={Download}>Export</SidebarLink>
        </div>
      </aside>

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
