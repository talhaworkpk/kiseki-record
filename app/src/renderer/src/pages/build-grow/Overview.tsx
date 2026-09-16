import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Target, FolderGit2, BrainCircuit, Rocket } from 'lucide-react'
import { projectService } from '../../lib/domain/ProjectService'
import { goalService } from '../../lib/domain/GoalService'
import { skillService, Skill } from '../../lib/domain/SkillService'
import { ProjectRecord, Goal } from '../../types'

export default function BuildGrowOverview() {
  const [activeProjects, setActiveProjects] = useState<ProjectRecord[]>([])
  const [activeGoals, setActiveGoals] = useState<Goal[]>([])
  const [developingSkills, setDevelopingSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const projects = await projectService.find({ status: 'Active' });
        setActiveProjects(projects);

        const goals = await goalService.find({ status: 'Active', isArchived: { $ne: true } });
        setActiveGoals(goals);

        const skills = await skillService.find({ isArchived: { $ne: true } });
        // Assume skills with level < 100 or non-max level are developing.
        // Also just showing active non-archived ones.
        setDevelopingSkills(skills.filter(s => s.level !== undefined && s.level < 100));
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let isDragging = false
    let startY = 0
    let scrollTop = 0
    let hasDragged = false

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right click
        isDragging = true
        hasDragged = false
        startY = e.pageY - el.offsetTop
        scrollTop = el.scrollTop
        el.style.cursor = 'grabbing'
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false
        el.style.cursor = ''
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      e.preventDefault()
      hasDragged = true
      const y = e.pageY - el.offsetTop
      const walk = (y - startY) * 2 // Scroll-fast
      el.scrollTop = scrollTop - walk
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault()
      }
    }

    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('contextmenu', handleContextMenu)

    return () => {
      el.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return (
    <div ref={scrollRef} className="h-full bg-background overflow-y-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Rocket className="text-primary" size={32} />
          Build & Grow
        </h1>
        <p className="text-muted-foreground">Overview of the things you're building, achieving, and developing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Link to="/build-grow/projects" className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-pink-500/50 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl group-hover:scale-110 transition-transform">
              <FolderGit2 size={24} />
            </div>
            <span className="text-3xl font-black">{activeProjects.length}</span>
          </div>
          <h3 className="font-bold text-lg mb-1">Active Projects</h3>
          <p className="text-sm text-muted-foreground">Projects currently in progress</p>
        </Link>

        <Link to="/build-grow/goals" className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
              <Target size={24} />
            </div>
            <span className="text-3xl font-black">{activeGoals.length}</span>
          </div>
          <h3 className="font-bold text-lg mb-1">Active Goals</h3>
          <p className="text-sm text-muted-foreground">Goals you are working towards</p>
        </Link>

        <Link to="/build-grow/skills" className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-purple-500/50 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
              <BrainCircuit size={24} />
            </div>
            <span className="text-3xl font-black">{developingSkills.length}</span>
          </div>
          <h3 className="font-bold text-lg mb-1">Skills Developing</h3>
          <p className="text-sm text-muted-foreground">Skills you are actively mastering</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FolderGit2 size={20} className="text-pink-500" /> Current Projects
          </h3>
          <div className="space-y-4">
            {activeProjects.slice(0, 5).map(project => (
              <Link to={`/build-grow/projects?highlight=${project._id}`} key={project._id} className="block bg-card border border-border p-4 rounded-xl hover:border-pink-500/50 hover:shadow-sm transition-all group">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold group-hover:text-pink-500 transition-colors">{project.title}</span>
                  <span className="text-xs font-bold text-muted-foreground px-2 py-0.5 bg-accent rounded-full">{project.status}</span>
                </div>
              </Link>
            ))}
            {activeProjects.length === 0 && (
              <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                <p className="font-bold mb-1">No active projects yet.</p>
                <p className="text-sm text-muted-foreground">Start building something new.</p>
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2">
            <Target size={20} className="text-blue-500" /> Current Goals
          </h3>
          <div className="space-y-4">
            {activeGoals.slice(0, 5).map(goal => (
              <Link to={`/build-grow/goals?highlight=${goal._id}`} key={goal._id} className="block bg-card border border-border p-4 rounded-xl hover:border-blue-500/50 hover:shadow-sm transition-all group">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold group-hover:text-blue-500 transition-colors">{goal.title}</span>
                  <span className="text-sm font-bold text-blue-500">{goal.progress}%</span>
                </div>
                <div className="w-full bg-accent rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${goal.progress}%` }}></div>
                </div>
              </Link>
            ))}
            {activeGoals.length === 0 && (
              <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                <p className="font-bold mb-1">No active goals yet.</p>
                <p className="text-sm text-muted-foreground">Define something you're working toward.</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BrainCircuit size={20} className="text-purple-500" /> Skills in Development
          </h3>
          <div className="space-y-4">
            {developingSkills.slice(0, 5).map(skill => (
              <Link to={`/build-grow/skills?highlight=${skill._id}`} key={skill._id} className="block bg-card border border-border p-4 rounded-xl hover:border-purple-500/50 hover:shadow-sm transition-all group flex items-center justify-between">
                <div>
                  <div className="font-bold group-hover:text-purple-500 transition-colors">{skill.name}</div>
                  {skill.category && <div className="text-xs text-muted-foreground">{skill.category}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-accent rounded-full h-1.5 overflow-hidden hidden sm:block">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${skill.level || 0}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-purple-500 w-8 text-right">{skill.level || 0}%</span>
                </div>
              </Link>
            ))}
            {developingSkills.length === 0 && (
              <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                <p className="font-bold mb-1">No developing skills yet.</p>
                <p className="text-sm text-muted-foreground">Start tracking a skill you're learning.</p>
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold mt-8 mb-4">Recent Progress</h3>
          <div className="bg-card border border-border p-6 rounded-xl space-y-4">
            {/* Simple static placeholder for recent progress for now, as we don't have a distinct progress feed API yet, except habit activity logs which are unrelated. */}
            <p className="text-sm text-muted-foreground italic">Keep updating your projects, goals, and skills to see recent progress appear here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
