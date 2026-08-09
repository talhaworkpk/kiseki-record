import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, GraduationCap, Briefcase, FolderGit2, Sparkles, Award, Target, FileText, LineChart, Clock } from 'lucide-react'

// Placeholder imports for subpages
// We will replace these with actual imports as we build them.
import Overview from './career/Overview'
import ProfessionalTimeline from './career/ProfessionalTimeline'
import EducationList from './career/EducationList'
import CareerList from './career/CareerList'
import ProjectsPortfolio from './career/ProjectsPortfolio'
import SkillsTracker from './career/SkillsTracker'
import CertificatesGallery from './career/CertificatesGallery'
import Achievements from './career/Achievements'
import Goals from './career/Goals'
import ResumeBuilder from './career/ResumeBuilder'
import CareerAnalytics from './career/CareerAnalytics'
import CareerAI from './career/CareerAI'
import { Sparkles as SparklesIcon } from 'lucide-react'

function SidebarLink({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) {
  const location = useLocation()
  const isActive = location.pathname === to
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
    >
      <Icon size={18} /> {children}
    </Link>
  )
}

export default function Career() {
  return (
    <div className="flex h-full bg-background overflow-hidden animate-in fade-in duration-500 border-x border-border">
      
      {/* Inner Sidebar for Education & Career */}
      <aside className="w-64 border-r border-border bg-card flex flex-col z-10">
        <div className="h-16 px-6 border-b border-border flex items-center gap-3">
          <GraduationCap className="text-primary" size={24} />
          <span className="font-bold text-lg tracking-tight">Edu & Career</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
          <SidebarLink to="/career/overview" icon={LayoutDashboard}>Overview</SidebarLink>
          <SidebarLink to="/career/timeline" icon={Clock}>Timeline</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Records</p>
          </div>
          <SidebarLink to="/career/education" icon={GraduationCap}>Education</SidebarLink>
          <SidebarLink to="/career/career" icon={Briefcase}>Career</SidebarLink>
          <SidebarLink to="/career/projects" icon={FolderGit2}>Projects</SidebarLink>
          <SidebarLink to="/career/skills" icon={Sparkles}>Skills</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Milestones</p>
          </div>
          <SidebarLink to="/career/certificates" icon={FileText}>Certificates</SidebarLink>
          <SidebarLink to="/career/achievements" icon={Award}>Achievements</SidebarLink>
          <SidebarLink to="/career/goals" icon={Target}>Goals</SidebarLink>
          
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Professional</p>
          </div>
          <SidebarLink to="/career/resume" icon={FileText}>Resume Builder</SidebarLink>
          <SidebarLink to="/career/analytics" icon={LineChart}>Analytics</SidebarLink>
          <SidebarLink to="/career/ai" icon={SparklesIcon}>Career AI</SidebarLink>
        </div>
      </aside>

      {/* Main Content Area for Subpages */}
      <main className="flex-1 relative overflow-hidden bg-background">
        <Routes>
          <Route path="/" element={<Navigate to="/career/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/timeline" element={<ProfessionalTimeline />} />
          <Route path="/education" element={<EducationList />} />
          <Route path="/career" element={<CareerList />} />
          <Route path="/projects" element={<ProjectsPortfolio />} />
          <Route path="/skills" element={<SkillsTracker />} />
          <Route path="/certificates" element={<CertificatesGallery />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/resume" element={<ResumeBuilder />} />
          <Route path="/analytics" element={<CareerAnalytics />} />
          <Route path="/ai" element={<CareerAI />} />
        </Routes>
      </main>

    </div>
  )
}
