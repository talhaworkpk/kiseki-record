import React from 'react'
import { Heart, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function RelationshipsWidget({ data }: any) {
  const navigate = useNavigate()
  const relationships = data.relationships || []
  const topRels = relationships.slice(0, 3)
  
  return (
    <div className="p-6 bg-card rounded-2xl border border-border h-full">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Heart size={20} className="text-pink-500 fill-pink-500" /> Relationships
      </h2>
      <div className="space-y-4">
        {topRels.map((rel: any, i: number) => {
          const initial = rel.name ? rel.name.substring(0, 2).toUpperCase() : '?'
          return (
            <div 
              key={i} 
              onClick={() => navigate(`/relationships/${rel._id}`)}
              className="flex items-center justify-between p-3 bg-background rounded-xl border border-border hover:border-pink-500/50 transition-colors group cursor-pointer"
            >
              <div>
                <p className="font-bold text-sm">{rel.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {rel.category || 'Friend'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold border border-pink-500/20 group-hover:bg-pink-500 group-hover:text-white transition-colors">{initial}</div>
            </div>
          )
        })}
        {topRels.length === 0 && <p className="text-muted-foreground text-sm">No relationships found.</p>}
      </div>
    </div>
  )
}
