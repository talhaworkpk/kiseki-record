import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, LineChart, ListChecks, Award, Sparkles, Target, Archive, Search } from 'lucide-react'

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

function SidebarLink({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation()
  
  // Exact match for base route
  const isActive = to === '/habits' 
    ? location.pathname === '/habits' || location.pathname === '/habits/'
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

export default function Habits() {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden animate-in fade-in duration-500">
      
      {/* Habits Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col h-full flex-shrink-0">
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
          <SidebarLink to="/habits" icon={LayoutDashboard}>Dashboard</SidebarLink>
          <SidebarLink to="/habits/all" icon={ListChecks}>All Habits</SidebarLink>
          <SidebarLink to="/habits/timeline" icon={CalendarDays}>Timeline</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intelligence</p>
          </div>
          <SidebarLink to="/habits/analytics" icon={LineChart}>Analytics</SidebarLink>
          <SidebarLink to="/habits/insights" icon={Sparkles}>AI Insights</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Records</p>
          </div>
          <SidebarLink to="/habits/history" icon={Search}>History</SidebarLink>
          <SidebarLink to="/habits/milestones" icon={Award}>Milestones</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</p>
          </div>
          <SidebarLink to="/habits/archived" icon={Archive}>Archived Habits</SidebarLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-background">
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
  )
}
