import { useState, useEffect, useRef } from 'react'
import { Sparkles, BrainCircuit, Activity, Link as LinkIcon, Loader2 } from 'lucide-react'

type Correlation = {
  habitA: string
  habitB: string
  probability: number
  description: string
}

let globalState = {
  aiLoading: false,
  aiSummary: null as string | null
}

export default function AIInsights() {
  const [loading, setLoading] = useState(true)
  const [correlations, setCorrelations] = useState<Correlation[]>([])
  
  const [aiSummary, setAiSummary] = useState<string | null>(globalState.aiSummary)
  const [aiLoading, setAiLoading] = useState(globalState.aiLoading)
  const [rawStats, setRawStats] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const isMounted = useRef(true)

  const loadData = async () => {
    try {
      // @ts-ignore
      const allHabits = await window.api.db.find('habits', { archived: { $ne: true } })
      // @ts-ignore
      const allLogs = await window.api.db.find('habitLogs', {})

      // Generate Correlations
      // To find correlations, we group by date and see if habit A completed implies habit B completed.
      const logsByDate: Record<string, string[]> = {}
      allLogs.forEach((l: any) => {
        if (l.status === 'completed') {
          if (!logsByDate[l.date]) logsByDate[l.date] = []
          logsByDate[l.date].push(l.habitId)
        }
      })

      const habitNames: Record<string, string> = {}
      allHabits.forEach((h:any) => habitNames[h._id] = h.title)

      const ids = allHabits.map((h:any)=>h._id)
      const corrs: Correlation[] = []

      // Very simple conditional probability: P(B | A) = Count(A & B) / Count(A)
      for (let i = 0; i < ids.length; i++) {
        for (let j = 0; j < ids.length; j++) {
          if (i === j) continue
          const idA = ids[i]
          const idB = ids[j]

          let countA = 0
          let countAB = 0

          Object.values(logsByDate).forEach(completedIds => {
            if (completedIds.includes(idA)) {
              countA++
              if (completedIds.includes(idB)) {
                countAB++
              }
            }
          })

          if (countA > 3) { // Only if they've completed A at least 3 times
            const prob = Math.round((countAB / countA) * 100)
            if (prob > 70) {
              corrs.push({
                habitA: habitNames[idA],
                habitB: habitNames[idB],
                probability: prob,
                description: `When you complete "${habitNames[idA]}", your chances of completing "${habitNames[idB]}" are ${prob}%.`
              })
            }
          }
        }
      }

      // Sort by highest probability and take top 5
      corrs.sort((a, b) => b.probability - a.probability)
      setCorrelations(corrs.slice(0, 5))

      // Build text for AI
      const text = `I have ${allHabits.length} habits. Total logs: ${allLogs.length}. Top correlations: ${corrs.slice(0,3).map(c=>c.description).join(' ')}`
      setRawStats(text)

    } catch (err) {
      console.error(err)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    loadData()
    
    // Sync with global state in case it changed while unmounted
    setAiLoading(globalState.aiLoading)
    setAiSummary(globalState.aiSummary)

    return () => {
      isMounted.current = false
    }
  }, [])

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  const generateAI = async () => {
    if (globalState.aiLoading) return

    globalState.aiLoading = true
    globalState.aiSummary = null

    if (isMounted.current) {
      setAiLoading(true)
      setAiSummary(null)
    }

    const prompt = `Act as an expert habit analyst. Based on this data: "${rawStats}", write a 2-paragraph behavioral analysis explaining my hidden patterns and giving me a psychological tip to improve my consistency. Be encouraging. Do not use markdown.`

    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1:8b', prompt, stream: false })
      })
      const data = res.ok ? await res.json() : await (await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'llama3', prompt, stream: false })})).json()
      
      globalState.aiSummary = data.response
      if (isMounted.current) setAiSummary(data.response)
    } catch (err) {
      const errMsg = 'Failed to connect to Ollama. Please ensure your local AI server is running.'
      globalState.aiSummary = errMsg
      if (isMounted.current) setAiSummary(errMsg)
    } finally {
      globalState.aiLoading = false
      if (isMounted.current) setAiLoading(false)
    }
  }

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={32}/></div>

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BrainCircuit className="text-primary" /> 
          Habit Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">Discover hidden correlations and patterns in your behavior.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Correlations List */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><LinkIcon size={20} className="text-blue-500"/> Strongest Correlations</h2>
          <div className="space-y-4">
            {correlations.map((c, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{c.habitA}</span>
                    <LinkIcon size={14} className="text-muted-foreground"/>
                    <span className="font-bold text-foreground">{c.habitB}</span>
                  </div>
                  <span className="text-xl font-black text-blue-500">{c.probability}%</span>
                </div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                
                <div className="w-full bg-accent h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${c.probability}%`}}></div>
                </div>
              </div>
            ))}
            {correlations.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
                Not enough data to calculate correlations yet. Keep tracking your habits!
              </div>
            )}
          </div>
        </div>

        {/* AI Deep Analysis */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><Sparkles size={20} className="text-purple-500"/> Behavioral Analysis</h2>
          <div className="bg-gradient-to-br from-purple-500/10 to-primary/5 border border-purple-500/20 p-8 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-purple-500">
              <BrainCircuit size={200}/>
            </div>
            
            <div className="relative z-10">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-purple-500 gap-4">
                  <Loader2 size={32} className="animate-spin"/>
                  <span className="font-bold">Analyzing your psychological patterns...</span>
                </div>
              ) : aiSummary ? (
                <div className="prose prose-invert prose-p:leading-relaxed text-foreground/90">
                  {aiSummary.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                  <button onClick={generateAI} className="mt-6 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Regenerate Analysis</button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center mx-auto mb-4">
                    <Activity size={32}/>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Ready for Analysis</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Let AI scan your habit history to find hidden behavioral loops and suggest psychological improvements.</p>
                  <button onClick={generateAI} disabled={!rawStats} className="px-6 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50">
                    Run Deep Scan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
