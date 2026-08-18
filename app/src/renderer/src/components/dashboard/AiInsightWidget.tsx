import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AiInsightWidget({ data }: any) {
  const rels = data.relationships || []
  const habits = data.habits || []
  const navigate = useNavigate()
  
  let insight1 = "You're doing great!"
  let insight2 = "Keep tracking your life to generate more insights."
  let recommendation = "Log a new memory today"
  let navPath = '/records'

  if (rels.length > 0) {
    insight1 = `You have ${rels.length} people in your network.`
    recommendation = `Message ${rels[0].name} today`
    navPath = `/relationships/${rels[0]._id}`
  } else if (habits.length > 0) {
    const topHabit = habits[0]
    insight2 = `Your habit '${topHabit.title}' is going strong.`
    recommendation = `Update ${topHabit.title}`
    navPath = `/habits`
  }

  return (
    <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-2xl border border-cyan-500/20 h-full relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:rotate-12 transition-transform text-cyan-500">
        <Sparkles size={100} />
      </div>
      <div className="relative z-10 flex flex-col h-full">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
          <Sparkles size={20} /> AI Insight
        </h2>
        
        <div className="space-y-4 flex-1">
          <div className="p-4 bg-background/60 backdrop-blur-sm rounded-xl border border-cyan-500/10 shadow-sm">
            <p className="text-sm font-medium">{insight1}</p>
          </div>
          <div className="p-4 bg-background/60 backdrop-blur-sm rounded-xl border border-cyan-500/10 shadow-sm">
            <p className="text-sm font-medium">{insight2}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-cyan-500/20">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-600/80 dark:text-cyan-400/80 mb-2">Recommendation</p>
          <button 
            onClick={() => navigate(navPath)}
            className="w-full flex items-center justify-between p-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20 font-bold text-sm"
          >
            {recommendation}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
