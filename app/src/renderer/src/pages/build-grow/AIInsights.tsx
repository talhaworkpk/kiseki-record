import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Bot, TrendingUp, AlertTriangle, ArrowRight, Zap, Target, FolderGit2, Link as LinkIcon, Lightbulb, Flame, Activity, Rocket, Award, Sparkles } from 'lucide-react'
import { growthIntelligenceService, GrowthInsights, GrowthInsight } from '../../lib/domain/GrowthIntelligenceService'

export default function BuildGrowAIInsights() {
  const [insights, setInsights] = useState<GrowthInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await growthIntelligenceService.generateInsights();
        setInsights(data);
      } catch (err) {
        console.error("Failed to load AI Insights:", err);
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
  }, [insights])

  if (loading) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center p-8">
        <div className="animate-spin text-primary mb-4"><Brain size={32} /></div>
        <p className="text-muted-foreground">Analyzing growth patterns...</p>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="bg-card border border-border p-12 rounded-3xl shadow-sm text-center max-w-lg">
          <div className="inline-flex items-center justify-center p-6 bg-primary/10 text-primary rounded-full mb-6">
            <Brain size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-4">Start building your growth picture</h1>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Add your first Project, Goal, or Skill and Kiseki will begin identifying patterns to help you grow.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/build-grow/projects" className="px-6 py-3 bg-pink-500 text-white rounded-full font-bold shadow-sm hover:bg-pink-600 transition-colors">Add Project</Link>
            <Link to="/build-grow/goals" className="px-6 py-3 bg-blue-500 text-white rounded-full font-bold shadow-sm hover:bg-blue-600 transition-colors">Add Goal</Link>
          </div>
        </div>
      </div>
    )
  }

  const { overview, todaysInsight, needsAttention, opportunities, connections, recommendations } = insights;

  return (
    <div ref={scrollRef} className="h-full bg-background overflow-y-auto p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8 border-b border-border pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Brain className="text-primary" size={32} />
            AI Insights
          </h1>
          <p className="text-muted-foreground font-medium">Your personal growth intelligence.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-accent px-4 py-2 rounded-full">
          <Activity size={16} className="text-primary" />
          Live Deterministic Analysis
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Today's Insight (⭐) */}
        {todaysInsight && (
          <section>
            <div className="bg-gradient-to-r from-blue-500/10 via-primary/5 to-purple-500/10 border border-primary/20 p-8 rounded-3xl relative overflow-hidden shadow-sm">
              <div className="absolute -right-10 -top-10 text-primary/5 blur-sm">
                <Brain size={200} />
              </div>
              <div className="relative z-10">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Zap size={16} /> Today's Insight
                </h2>
                <h3 className="text-2xl font-black mb-3">{todaysInsight.title}</h3>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl">{todaysInsight.description}</p>
                <Link to={todaysInsight.actionUrl} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors shadow-sm">
                  {todaysInsight.actionText} <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Growth Overview */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-muted-foreground" /> Growth Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">Projects</div>
              <div className="text-2xl font-black mb-2">{overview.projects.active} active</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• {overview.projects.completedThisMonth} completed this month</li>
                <li>• {overview.projects.stalled} stalled</li>
              </ul>
            </div>
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">Goals</div>
              <div className="text-2xl font-black mb-2">{overview.goals.active} active</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• {overview.goals.averageProgress}% avg progress</li>
                <li>• {overview.goals.needsAttention} need attention</li>
              </ul>
            </div>
            <div className="bg-card border border-border p-5 rounded-2xl">
              <div className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">Skills</div>
              <div className="text-2xl font-black mb-2">{overview.skills.tracked} tracked</div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• {overview.skills.linkedToActiveProjects} in active Projects</li>
                <li>• {overview.skills.linkedToCertificates} in Certificates</li>
                {overview.skills.inactive > 0 && <li className="text-red-400">• {overview.skills.inactive} need attention</li>}
              </ul>
            </div>
            <div className="bg-card border border-border p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent">
              <div className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider flex items-center gap-1"><Flame size={14} className="text-orange-500"/> Momentum</div>
              <div className="text-2xl font-black mb-2 text-orange-500">{overview.momentum}</div>
              <p className="text-xs text-muted-foreground">Based on recent activity</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Needs Attention */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-500">
              <AlertTriangle size={20} /> Needs Attention
            </h3>
            <div className="space-y-3">
              {needsAttention.length > 0 ? needsAttention.map(insight => (
                <div key={insight.id} className="bg-card border border-border border-l-4 border-l-red-500 p-4 rounded-xl shadow-sm">
                  <h4 className="font-bold mb-1">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  <Link to={insight.actionUrl} className="text-xs font-bold bg-accent hover:bg-accent/80 px-3 py-1.5 rounded-md transition-colors inline-block">{insight.actionText}</Link>
                </div>
              )) : (
                <p className="text-muted-foreground text-sm italic">Nothing currently requires your attention.</p>
              )}
            </div>
          </section>

          {/* Opportunities */}
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-500">
              <Rocket size={20} /> Opportunities
            </h3>
            <div className="space-y-3">
              {opportunities.length > 0 ? opportunities.map(insight => (
                <div key={insight.id} className="bg-card border border-border border-l-4 border-l-green-500 p-4 rounded-xl shadow-sm">
                  <h4 className="font-bold mb-1">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  <Link to={insight.actionUrl} className="text-xs font-bold bg-accent hover:bg-accent/80 px-3 py-1.5 rounded-md transition-colors inline-block">{insight.actionText}</Link>
                </div>
              )) : (
                <p className="text-muted-foreground text-sm italic">Keep working to uncover new growth opportunities.</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recommended Focus */}
          <section className="lg:col-span-1">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-500" /> Recommended Focus
            </h3>
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-sm font-bold text-muted-foreground mb-2">What should you focus on?</p>
              {recommendations.length > 0 ? recommendations.map((rec, i) => (
                <div key={rec.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <h4 className="font-bold text-sm mb-1">{i + 1}. {rec.actionText}</h4>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                  <Link to={rec.actionUrl} className="text-[10px] uppercase tracking-wider font-bold text-primary mt-1 inline-block hover:underline">Go to {rec.actionText.split(' ')[1] || 'Action'}</Link>
                </div>
              )) : (
                <p className="text-muted-foreground text-sm italic">No specific recommendations yet.</p>
              )}
            </div>
          </section>

          {/* Connections */}
          <section className="lg:col-span-2">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <LinkIcon size={20} className="text-blue-500" /> Connections
            </h3>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[250px]">
              <p className="text-sm font-bold text-muted-foreground mb-6">Your current work is contributing toward:</p>
              
              {connections.length > 0 ? (
                <div className="space-y-6">
                  {connections.map(conn => {
                    let Icon1, Icon2, color1, color2, label1, label2;
                    
                    if (conn.type === 'project-goal') {
                      Icon1 = FolderGit2; color1 = 'text-pink-500'; label1 = 'Project';
                      Icon2 = Target; color2 = 'text-blue-500'; label2 = 'Goal';
                    } else if (conn.type === 'project-skill') {
                      Icon1 = FolderGit2; color1 = 'text-pink-500'; label1 = 'Project';
                      Icon2 = Sparkles; color2 = 'text-yellow-500'; label2 = 'Skill';
                    } else if (conn.type === 'skill-certificate') {
                      Icon1 = Sparkles; color1 = 'text-yellow-500'; label1 = 'Skill';
                      Icon2 = Award; color2 = 'text-purple-500'; label2 = 'Certificate';
                    } else {
                      Icon1 = FolderGit2; color1 = 'text-primary'; label1 = conn.sourceType;
                      Icon2 = Target; color2 = 'text-primary'; label2 = conn.targetType;
                    }

                    return (
                    <div key={conn.id} className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold bg-accent w-fit px-3 py-1.5 rounded-lg border border-border">
                        <Icon1 size={16} className={color1} /> 
                        <span className="text-xs font-normal text-muted-foreground mr-1">{label1}:</span> 
                        {conn.sourceTitle}
                      </div>
                      <div className="flex flex-col ml-6 pl-4 border-l-2 border-border/50 relative">
                        <div className="absolute -left-1.5 top-2 w-3 h-3 bg-background border-2 border-border rounded-full"></div>
                        <div className="flex items-center gap-2 text-sm font-bold bg-background border border-border w-fit px-3 py-1.5 rounded-lg shadow-sm">
                          <Icon2 size={16} className={color2} />
                          <span className="text-xs font-normal text-muted-foreground mr-1">{label2}:</span>
                          {conn.targetTitle}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">No explicit connections detected. Try linking your Goals to Projects.</p>
              )}
            </div>
          </section>

        </div>
        
      </div>
    </div>
  )
}
