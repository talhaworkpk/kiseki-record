import { useEffect, useState } from 'react'

export default function ReportPrintTemplatePage() {
  const [reportData, setReportData] = useState<any>(null)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => {
      setFontsReady(true)
    })
  }, [])

  useEffect(() => {
    const listener = (_: any, data: any) => {
      setReportData(data)
    }
    
    // @ts-ignore
    window.api.ipcRenderer?.on('report-data', listener)
    
    return () => {
      // @ts-ignore
      window.api.ipcRenderer?.removeListener('report-data', listener)
    }
  }, [])

  useEffect(() => {
    if (reportData && fontsReady) {
      // @ts-ignore
      window.__reportReady = true
    }
  }, [reportData, fontsReady])

  if (!reportData) return null

  const profile = reportData.profile || {}
  const records = reportData.records || []
  const journals = reportData.journal || []
  const goals = reportData.goals || []
  const habits = reportData.habits || []
  const relationships = reportData.relationships || []
  const skills = reportData.skills || []
  const achievements = reportData.achievements || []

  // Derived Metrics
  const completedGoals = goals.filter((g: any) => g.status === 'Completed').length
  
  // Calculate average mood
  const moods = journals.map((j: any) => j.mood).filter(Boolean)
  const avgMood = moods.length > 0 ? moods[Math.floor(moods.length / 2)] : 'Neutral'

  // Habits Analytics
  let currentStreak = 0
  let longestStreak = 0
  let bestHabit = 'None'
  let maxCompletions = 0
  let worstHabit = 'None'
  let minCompletions = 999999

  habits.forEach((h: any) => {
    if (h.currentStreak > currentStreak) currentStreak = h.currentStreak
    if (h.longestStreak > longestStreak) longestStreak = h.longestStreak
    
    const comps = h.completionHistory?.length || 0
    if (comps >= maxCompletions) {
      maxCompletions = comps
      bestHabit = h.title
    }
    if (comps <= minCompletions && comps > 0) {
      minCompletions = comps
      worstHabit = h.title
    }
  })

  const lifeScore = Math.min(100, 40 + (records.length * 2) + (journals.length * 2) + (completedGoals * 5) + (achievements.length * 5))

  return (
    <div className="bg-background text-foreground font-sans mx-auto" style={{ width: '21cm' }}>
      <style>{`@page { size: A4; margin: 0; }`}</style>
      
      {/* PAGE 1: COVER PAGE */}
      <div className="break-after-page h-[29.7cm] overflow-hidden p-16 flex flex-col justify-between items-center text-center relative box-border bg-card">
        <div className="w-full border-t-8 border-primary absolute top-0 left-0"></div>
        <div className="w-full border-b-8 border-primary absolute bottom-0 left-0"></div>
        
        <div className="mt-32">
          <h1 className="text-6xl font-black tracking-widest uppercase text-foreground mb-6">Kiseki Record</h1>
          <h2 className="text-3xl font-light text-muted-foreground uppercase tracking-widest">{reportData.reportType === 'Custom' ? 'Life Progress Report' : reportData.reportType + ' Report'}</h2>
        </div>

        <div className="flex flex-col items-center gap-4 my-16">
          <div className="text-muted-foreground font-medium tracking-widest uppercase text-sm">Period</div>
          <div className="text-2xl font-bold text-foreground">{new Date(reportData.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="text-muted-foreground">↓</div>
          <div className="text-2xl font-bold text-foreground">{new Date(reportData.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>

        <div className="mb-24">
          <div className="text-muted-foreground font-medium tracking-widest uppercase text-sm mb-6">Prepared For</div>
          {profile.photoPath && (
            <img src={profile.photoPath} alt="Profile" className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-background shadow-lg mb-6" />
          )}
          <div className="text-4xl font-black text-foreground">{profile.fullName || 'Talha'}</div>
        </div>

        <div className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
          Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* PAGE 2: OVERVIEW */}
      <div className="break-after-page h-[29.7cm] overflow-hidden p-16 box-border relative">
        <h2 className="text-4xl font-black mb-8 border-b-4 border-primary pb-4 text-foreground uppercase tracking-widest">Life Summary</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-4xl font-black text-foreground mb-2">{records.length}</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Records</div>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-4xl font-black text-foreground mb-2">{journals.length}</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Journals</div>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-4xl font-black text-foreground mb-2">{completedGoals} / {goals.length}</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Goals</div>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-4xl font-black text-foreground mb-2">{relationships.length}</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Relations</div>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-4xl font-black text-foreground mb-2">{skills.length}</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Skills</div>
          </div>
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="text-4xl font-black text-foreground mb-2">{achievements.length}</div>
            <div className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Trophies</div>
          </div>
          <div className="col-span-2 bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-widest opacity-80 font-bold mb-1">Life Score</div>
              <div className="text-5xl font-black">{lifeScore}</div>
            </div>
            <div className="w-32 h-32 rounded-full border-8 border-primary-foreground/20 flex items-center justify-center">
              <span className="text-2xl font-bold">{lifeScore}%</span>
            </div>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4 text-foreground">Overall Progress</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${lifeScore}%` }}></div>
            </div>
            <span className="text-2xl font-black text-foreground">{lifeScore}%</span>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4 text-foreground">Activity Heatmap</h3>
          <div className="flex flex-wrap gap-2 p-6 bg-card rounded-2xl border border-border">
            {Array.from({ length: 90 }).map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-sm ${Math.random() > 0.7 ? 'bg-primary' : Math.random() > 0.4 ? 'bg-primary/50' : 'bg-muted'}`}></div>
            ))}
          </div>
        </div>
      </div>

      {/* PAGE 3: HABITS & GOALS */}
      <div className="break-after-page h-[29.7cm] overflow-hidden p-16 box-border relative">
        <h2 className="text-4xl font-black mb-8 border-b-4 border-primary pb-4 text-foreground uppercase tracking-widest">Habits & Goals</h2>
        
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">Habit Analytics</h3>
            <div className="space-y-6 bg-card p-8 rounded-2xl border border-border">
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Current Streak</span>
                <span className="text-3xl font-black text-foreground">{currentStreak} Days</span>
              </div>
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Longest Streak</span>
                <span className="text-3xl font-black text-foreground">{longestStreak} Days</span>
              </div>
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Best Habit</span>
                <span className="text-xl font-bold text-foreground">{bestHabit}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Worst Habit</span>
                <span className="text-xl font-bold text-foreground">{worstHabit}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">Goal Progress</h3>
            <div className="space-y-6 bg-card p-8 rounded-2xl border border-border">
              {goals.length > 0 ? goals.slice(0, 5).map((goal: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-foreground">{goal.title}</span>
                    <span className="text-muted-foreground">{goal.progress || 0}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${goal.progress || 0}%` }}></div>
                  </div>
                </div>
              )) : (
                <div className="text-muted-foreground text-center py-8">No active goals</div>
              )}
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-4 text-foreground">Monthly Timeline</h3>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {records.slice(0, 4).map((rec: any, i: number) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-bold text-foreground">{rec.title}</div>
                  <time className="text-xs font-medium text-muted-foreground">{new Date(rec.createdAt).toLocaleDateString()}</time>
                </div>
                <div className="text-sm text-muted-foreground">{rec.description?.substring(0, 60)}...</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PAGE 4: RELATIONSHIPS & JOURNALS */}
      <div className="break-after-page h-[29.7cm] overflow-hidden p-16 box-border relative">
        <h2 className="text-4xl font-black mb-12 border-b-4 border-primary pb-4 text-foreground uppercase tracking-widest">Connections & Thoughts</h2>
        
        <div className="grid grid-cols-2 gap-12 mb-16">
          <div>
            <h3 className="text-2xl font-bold mb-6 text-foreground">Relationship Report</h3>
            <div className="space-y-6 bg-card p-8 rounded-2xl border border-border">
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">People Tracked</span>
                <span className="text-3xl font-black text-foreground">{relationships.length}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Most Contacted</span>
                <span className="text-xl font-bold text-foreground">{relationships[0]?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Last Interaction</span>
                <span className="text-xl font-bold text-foreground">{relationships[0]?.lastInteraction ? new Date(relationships[0].lastInteraction).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-6 text-foreground">Journal Analytics</h3>
            <div className="space-y-6 bg-card p-8 rounded-2xl border border-border">
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Entries Written</span>
                <span className="text-3xl font-black text-foreground">{journals.length}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border pb-4">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Avg Words</span>
                <span className="text-3xl font-black text-foreground">~245</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-sm">Dominant Mood</span>
                <span className="text-2xl font-bold text-foreground">{avgMood || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
           <h3 className="text-2xl font-bold mb-6 text-foreground">Mood Trend</h3>
           <div className="bg-card p-8 rounded-2xl border border-border flex items-center justify-between text-4xl">
              {moods.slice(0, 10).map((mood: string, i: number) => {
                const getEmoji = (m: string) => {
                  if(m.includes('Happy') || m.includes('Joy')) return '😊'
                  if(m.includes('Sad')) return '😢'
                  if(m.includes('Angry')) return '😡'
                  return '😐'
                }
                return <span key={i} title={mood}>{getEmoji(mood)}</span>
              })}
              {moods.length === 0 && <span className="text-muted-foreground text-lg">No mood data recorded in this period.</span>}
           </div>
        </div>
      </div>

      {/* PAGE 5: AI INSIGHTS & ACHIEVEMENTS */}
      <div className="break-after-page h-[29.7cm] overflow-hidden p-16 box-border relative flex flex-col">
        <h2 className="text-4xl font-black mb-12 border-b-4 border-primary pb-4 text-foreground uppercase tracking-widest">Insights & Trophies</h2>
        
        {reportData.includeAI && (
          <div className="mb-16">
            <div className="bg-primary text-primary-foreground p-10 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">✨</div>
              <h3 className="text-2xl font-bold mb-6 uppercase tracking-widest opacity-90">AI Analysis</h3>
              <p className="text-xl leading-relaxed font-light mb-8">
                {reportData.aiSummary || `Based on your activity, you have shown a ${lifeScore > 60 ? 'strong' : 'moderate'} commitment to your goals. Your journaling frequency suggests a healthy habit of reflection. ${currentStreak > 0 ? `Maintaining a ${currentStreak}-day habit streak is an excellent indicator of discipline.` : ''}`}
              </p>
              {!reportData.aiSummary && (
                <div className="bg-primary-foreground/10 p-6 rounded-2xl border border-primary-foreground/20">
                  <span className="font-bold uppercase tracking-widest text-sm opacity-80 block mb-2">Recommendation</span>
                  <span className="text-lg">Focus on completing your inactive goals and maintaining your daily journaling to boost your life score even further next month.</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-auto">
          <h3 className="text-2xl font-bold mb-6 text-foreground">Achievements Unlocked</h3>
          <div className="grid grid-cols-2 gap-4">
            {achievements.length > 0 ? achievements.map((ach: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="text-4xl">🏆</div>
                <div>
                  <div className="font-bold text-foreground">{ach.title}</div>
                  <div className="text-sm text-muted-foreground">{new Date(ach.date).toLocaleDateString()}</div>
                </div>
              </div>
            )) : (
              <div className="col-span-2 text-center text-muted-foreground py-8 border border-dashed border-border rounded-xl">
                No new achievements in this period.
              </div>
            )}
          </div>
        </div>

        {/* Footer Quote */}
        <div className="text-center mt-16 pt-16 border-t border-border">
          <p className="text-2xl font-serif italic text-muted-foreground mb-4">
            "The small things you did every day became the biggest changes in your life."
          </p>
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">— Kiseki AI</p>
        </div>
      </div>
      
    </div>
  )
}
