import { useState, useEffect, useRef } from 'react'
import { Sparkles, FileText, Briefcase, Target, Award, UserCheck, MessageSquare, Loader2 } from 'lucide-react'

// Module-level state to persist across unmounts
let globalState = {
  loading: false,
  result: null as string | null,
  activeTask: null as string | null,
  careerContext: ''
}

export default function CareerAI() {
  const [loading, setLoading] = useState(globalState.loading)
  const [result, setResult] = useState<string | null>(globalState.result)
  const [activeTask, setActiveTask] = useState<string | null>(globalState.activeTask)
  const [careerContext, setCareerContext] = useState(globalState.careerContext)
  
  const isMounted = useRef(true)

  const loadData = async () => {
    try {
      // @ts-ignore
      const edu = await window.api.db.find('education', {})
      // @ts-ignore
      const car = await window.api.db.find('career', {})
      // @ts-ignore
      const ski = await window.api.db.find('skills', {})
      // @ts-ignore
      const pro = await window.api.db.find('projects', {})

      let context = 'User Profile Context:\n\n'
      if (car.length > 0) {
        context += 'Experience:\n' + car.map((c: any) => `- ${c.position} at ${c.company} (${c.startDate} to ${c.endDate||'Present'}). Responsibilities: ${c.responsibilities?.join(', ')}`).join('\n') + '\n\n'
      }
      if (edu.length > 0) {
        context += 'Education:\n' + edu.map((e: any) => `- ${e.degree} from ${e.school} (${e.status})`).join('\n') + '\n\n'
      }
      if (ski.length > 0) {
        context += 'Skills:\n' + ski.map((s: any) => `- ${s.name} (${s.level}%)`).join('\n') + '\n\n'
      }
      if (pro.length > 0) {
        context += 'Projects:\n' + pro.map((p: any) => `- ${p.title}: ${p.description}`).join('\n') + '\n\n'
      }
      globalState.careerContext = context
      if (isMounted.current) setCareerContext(context)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (!globalState.careerContext) {
      loadData()
    }
    
    // Check if background task finished while unmounted
    setLoading(globalState.loading)
    setResult(globalState.result)
    setActiveTask(globalState.activeTask)

    return () => {
      isMounted.current = false
    }
  }, [])

  const runAiTask = async (taskName: string, promptInstruction: string) => {
    if (globalState.loading) return
    
    globalState.loading = true
    globalState.activeTask = taskName
    globalState.result = null
    
    if (isMounted.current) {
      setLoading(true)
      setActiveTask(taskName)
      setResult(null)
    }

    const fullPrompt = `${promptInstruction}\n\n${globalState.careerContext}`

    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b', // Trying 3.1:8b as per user's previous preference, fallback to llama3
          prompt: fullPrompt,
          stream: false
        })
      })
      
      if (!res.ok) {
        // Fallback to llama3 if 3.1:8b fails
        const resFallback = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            prompt: fullPrompt,
            stream: false
          })
        })
        if (!resFallback.ok) throw new Error('Ollama failed on both llama3.1:8b and llama3')
        const data = await resFallback.json()
        globalState.result = data.response
        if (isMounted.current) setResult(data.response)
      } else {
        const data = await res.json()
        globalState.result = data.response
        if (isMounted.current) setResult(data.response)
      }
    } catch (err) {
      const errMsg = 'Failed to generate insights. Ensure Ollama is running with the llama3 or llama3.1:8b model installed.'
      globalState.result = errMsg
      if (isMounted.current) setResult(errMsg)
    } finally {
      globalState.loading = false
      if (isMounted.current) setLoading(false)
    }
  }

  const tasks = [
    { id: 'resume', name: 'Improve Resume', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', hover: 'hover:border-blue-500/50', prompt: 'Based on my experience, education, and skills below, provide 3-5 high-impact bullet points I can add to my resume to make it stand out more. Make them action-oriented.' },
    { id: 'gaps', name: 'Find Skill Gaps', icon: Target, color: 'text-red-500', bg: 'bg-red-500/10', hover: 'hover:border-red-500/50', prompt: 'Analyze my current skills and experience below. Identify missing skills or technologies that would complement my profile and make me more competitive in my field.' },
    { id: 'advice', name: 'Career Advice', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10', hover: 'hover:border-purple-500/50', prompt: 'Based on my profile below, provide general career advice. What should be my next logical career move? How can I maximize my growth?' },
    { id: 'certs', name: 'Suggest Certifications', icon: Award, color: 'text-green-500', bg: 'bg-green-500/10', hover: 'hover:border-green-500/50', prompt: 'Review my profile below and recommend 3 industry-recognized certifications that would significantly boost my career prospects.' },
    { id: 'interview', name: 'Interview Prep', icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10', hover: 'hover:border-orange-500/50', prompt: 'Based on my resume details below, generate 5 challenging interview questions a hiring manager might ask me, along with brief tips on how to answer them.' },
    { id: 'linkedin', name: 'LinkedIn Summary', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-600/10', hover: 'hover:border-blue-600/50', prompt: 'Write a professional, engaging LinkedIn "About" summary for me based on the following profile details. Keep it under 150 words.' },
  ]

  return (
    <div className="h-full overflow-y-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="text-primary" /> 
          Career AI Assistant
        </h1>
        <p className="text-muted-foreground mt-1">Leverage local AI to analyze your profile and get personalized career guidance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tasks.map(task => (
          <button 
            key={task.id}
            onClick={() => runAiTask(task.name, task.prompt)}
            disabled={loading}
            className={`p-6 text-left bg-card border border-border rounded-xl shadow-sm transition-all group ${task.hover} disabled:opacity-50`}
          >
            <div className={`w-12 h-12 rounded-full ${task.bg} ${task.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <task.icon size={24} />
            </div>
            <h3 className="font-bold">{task.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">Generate using Ollama</p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="p-8 bg-card border border-border rounded-xl shadow-sm flex flex-col items-center justify-center animate-in fade-in">
          <Loader2 size={32} className="animate-spin text-primary mb-4" />
          <h3 className="font-bold text-lg">Generating {activeTask}...</h3>
          <p className="text-muted-foreground">Analyzing your career profile.</p>
        </div>
      )}

      {!loading && result && (
        <div className="p-8 bg-card border border-border rounded-xl shadow-sm animate-in slide-in-from-bottom-4 relative">
          <div className="absolute top-8 right-8 text-primary opacity-20"><Sparkles size={48} /></div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={24} className="text-primary"/>
            {activeTask} Results
          </h2>
          <div className="prose prose-invert max-w-none">
            {result.split('\n').map((line, i) => (
              <p key={i} className="mb-2 text-foreground/90">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
