import React from 'react'
import { Activity } from 'lucide-react'

export function HeatmapWidget({ data }: any) {
  // Generate dummy heatmap data: a grid of weeks and days (7 rows x N columns)
  const cols = 24
  const rows = 7
  
  const getLevel = () => {
    const r = Math.random()
    if (r > 0.9) return 'bg-green-500'
    if (r > 0.7) return 'bg-green-400'
    if (r > 0.5) return 'bg-green-300'
    if (r > 0.3) return 'bg-green-200'
    return 'bg-accent'
  }

  return (
    <div className="p-6 bg-card rounded-2xl border border-border h-full flex flex-col">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Activity size={20} /> Life Activity
      </h2>
      <div className="flex-1 flex items-center justify-center overflow-x-auto pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-1.5">
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <div 
                  key={rowIndex} 
                  className={`w-3.5 h-3.5 rounded-[3px] ${getLevel()} transition-all hover:scale-125 cursor-pointer`}
                  title={`Activity Level`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
