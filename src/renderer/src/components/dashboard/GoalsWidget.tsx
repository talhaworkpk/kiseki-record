import React from 'react'
import { Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'

export function GoalsWidget({ data }: any) {
  const navigate = useNavigate()
  const goals = data.goals || []
  const topGoals = goals.filter((g:any) => g.status !== 'Completed').slice(0, 3)

  return (
    <div className="p-6 bg-card rounded-2xl border border-border h-full">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Target size={20} className="text-orange-500" /> Active Goals
      </h2>
      <div className="space-y-5">
        {topGoals.map((g: any, i: number) => {
          const progress = g.progress !== undefined ? g.progress : 0
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div onClick={() => navigate('/career/goals')} className="group cursor-pointer">
                  <div className="flex justify-between items-end mb-2">
                    <p className="font-bold text-sm group-hover:text-orange-500 transition-colors">{g.title}</p>
                    <span className="text-xs font-bold text-orange-500">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">View Goal Details</TooltipContent>
            </Tooltip>
          )
        })}
        {topGoals.length === 0 && <p className="text-muted-foreground text-sm">No active goals.</p>}
      </div>
    </div>
  )
}
