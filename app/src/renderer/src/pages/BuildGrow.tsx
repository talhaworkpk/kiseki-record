import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Rocket, FolderGit2, Target, BrainCircuit, Bot } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'
import { useOnboarding } from '../hooks/useOnboarding'
import { SectionWelcome } from '../components/onboarding/SectionWelcome'
import { ONBOARDING_CONFIGS } from '../lib/onboardingConfig'

import BuildGrowOverview from './build-grow/Overview'
import ProjectsPortfolio from './career/ProjectsPortfolio'
import CareerGoals from './career/Goals'
import SkillsTracker from './career/SkillsTracker'
import BuildGrowAIInsights from './build-grow/AIInsights'

function SidebarLink({ to, icon: Icon, description, children }: { to: string, icon: any, description?: string, children: React.ReactNode }) {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link 
          to={to} 
          className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
        >
          <Icon size={18} /> {children}
        </Link>
      </TooltipTrigger>
      {description && (
        <TooltipContent side="right" sideOffset={10} className="border-none p-0 bg-transparent shadow-none">
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

export default function BuildGrow() {
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
  const { showWelcome, completeWelcome } = useOnboarding('projects')

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
      {showWelcome && <SectionWelcome config={ONBOARDING_CONFIGS.projects} onComplete={completeWelcome} />}
    <div className="flex h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-50 via-background to-indigo-50/50 dark:from-sky-950/30 dark:via-background dark:to-indigo-950/30 overflow-hidden animate-in fade-in duration-500 border-x border-border">
      
      {/* Inner Sidebar for Build & Grow */}
      {!isSidebarHidden && (
      <aside className="w-64 border-r border-border bg-gradient-to-b from-white/60 to-sky-50/30 dark:from-slate-900/60 dark:to-slate-900/30 flex flex-col z-10">
        <div className="h-16 px-6 border-b border-border flex items-center gap-3">
          <Rocket className="text-primary" size={24} />
          <span className="font-bold text-lg tracking-tight">Build & Grow</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          <SidebarLink to="/build-grow/overview" icon={LayoutDashboard} description="View summary of things you're building.">Overview</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Build</p>
          </div>
          <SidebarLink to="/build-grow/projects" icon={FolderGit2} description="Showcase personal and professional projects you've built.">Projects</SidebarLink>
          <SidebarLink to="/build-grow/goals" icon={Target} description="Set, track, and achieve your short-term and long-term objectives.">Goals</SidebarLink>
          <SidebarLink to="/build-grow/skills" icon={BrainCircuit} description="Log your learning progress, track proficiencies, and master new skills.">Skills</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intelligence</p>
          </div>
          <SidebarLink to="/build-grow/ai-insights" icon={Bot} description="Insights about your Projects, Goals, and Skills will appear here.">AI Insights</SidebarLink>
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-transparent">
        <Routes>
          <Route path="/" element={<Navigate to="/build-grow/overview" replace />} />
          <Route path="/overview" element={<BuildGrowOverview />} />
          <Route path="/projects" element={<ProjectsPortfolio />} />
          <Route path="/goals" element={<CareerGoals />} />
          <Route path="/skills" element={<SkillsTracker />} />
          <Route path="/ai-insights" element={<BuildGrowAIInsights />} />
          <Route path="*" element={<Navigate to="/build-grow/overview" replace />} />
        </Routes>
      </div>
    </div>
    </>
  )
}
