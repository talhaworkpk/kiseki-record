import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, Briefcase, FolderGit2, Sparkles, Award, Target, FileText, LineChart, Clock } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip'

// Placeholder imports for subpages
// We will replace these with actual imports as we build them.
import Overview from './career/Overview'
import ProfessionalTimeline from './career/ProfessionalTimeline'
import EducationList from './career/EducationList'
import CareerList from './career/CareerList'
import CertificatesGallery from './career/CertificatesGallery'
import Achievements from './career/Achievements'
import ResumeBuilder from './career/ResumeBuilder'
import CareerAnalytics from './career/CareerAnalytics'
import CareerAI from './career/CareerAI'
import { Sparkles as SparklesIcon } from 'lucide-react'

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

export default function Career() {
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
    <div className="flex h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-50 via-background to-indigo-50/50 dark:from-sky-950/30 dark:via-background dark:to-indigo-950/30 overflow-hidden animate-in fade-in duration-500 border-x border-border">
      
      {/* Inner Sidebar for Education & Career */}
      {!isSidebarHidden && (
      <aside className="w-64 border-r border-border bg-gradient-to-b from-white/60 to-sky-50/30 dark:from-slate-900/60 dark:to-slate-900/30 flex flex-col z-10">
        <div className="h-16 px-6 border-b border-border flex items-center gap-3">
          <GraduationCap className="text-primary" size={24} />
          <span className="font-bold text-lg tracking-tight">Edu & Career</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          <SidebarLink to="/career/overview" icon={LayoutDashboard} description="See a high-level summary of your professional journey and learning progress.">Overview</SidebarLink>
          <SidebarLink to="/career/timeline" icon={Clock} description="View your entire educational and career history on an interactive timeline.">Timeline</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Records</p>
          </div>
          <SidebarLink to="/career/education" icon={GraduationCap} description="Keep a record of your degrees, schools, and academic achievements.">Education</SidebarLink>
          <SidebarLink to="/career/career" icon={Briefcase} description="Track your job roles, promotions, and work experiences.">Career</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Milestones</p>
          </div>
          <SidebarLink to="/career/certificates" icon={FileText} description="Store and display your professional certifications and licenses.">Certificates</SidebarLink>
          <SidebarLink to="/career/achievements" icon={Award} description="Record special awards, recognitions, and major professional wins.">Achievements</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Professional</p>
          </div>
          <SidebarLink to="/career/resume" icon={FileText} description="Auto-generate an updated resume from your career data.">Resume Builder</SidebarLink>
          <SidebarLink to="/career/analytics" icon={LineChart} description="Analyze your skill growth, tenure, and overall career trajectory.">Analytics</SidebarLink>
          <SidebarLink to="/career/ai" icon={SparklesIcon} description="Get AI-driven advice for interviews, career planning, and learning paths.">Career AI</SidebarLink>
        </div>
      </aside>
      )}

      {/* Main Content Area for Subpages */}
      <main className="flex-1 relative overflow-hidden bg-transparent">
        <Routes>
          <Route path="/" element={<Navigate to="/career/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/timeline" element={<ProfessionalTimeline />} />
          <Route path="/education" element={<EducationList />} />
          <Route path="/career" element={<CareerList />} />
          <Route path="/projects" element={<Navigate to="/build-grow/projects" replace />} />
          <Route path="/skills" element={<Navigate to="/build-grow/skills" replace />} />
          <Route path="/certificates" element={<CertificatesGallery />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/goals" element={<Navigate to="/build-grow/goals" replace />} />
          <Route path="/resume" element={<ResumeBuilder />} />
          <Route path="/analytics" element={<CareerAnalytics />} />
          <Route path="/ai" element={<CareerAI />} />
        </Routes>
      </main>

    </div>
  )
}
