import React, { useState } from 'react'
import { ImageIcon, Star } from 'lucide-react'
import MemoryPreviewModal from '../relationships/MemoryPreviewModal'
import { useNavigate } from 'react-router-dom'
import { normalizeUrl } from '../../lib/utils'

export function RecentMemoriesWidget({ data }: any) {
  const records = data.records || []
  const relationships = data.relationships || []
  const memories = [...records].sort((a: any, b: any) => b.createdAt - a.createdAt).slice(0, 2)

  const [selectedMemory, setSelectedMemory] = useState<any>(null)
  const navigate = useNavigate()

  return (
    <div className="p-6 bg-card rounded-2xl border border-border h-full">
      <h2 className="text-xl font-bold mb-4">📸 Recent Memories</h2>
      <div className="flex flex-col gap-4">
        {memories.map((m: any) => (
          <div key={m._id} onClick={() => setSelectedMemory(m)} className="relative rounded-xl overflow-hidden border border-border group cursor-pointer bg-background">
            <div className="h-32 bg-accent relative">
              {(() => {
                // For Photo type records, use first attachment regardless of extension
                const photo = m.type === 'Photo' && m.attachments && m.attachments.length > 0
                  ? m.attachments[0]
                  : m.attachments?.find((a: string) => a.match(/\.(jpeg|jpg|gif|png|webp|gfif|bmp|tiff|svg|ico|heic|heif|raw|cr2|nef|orf|sr2)$/i))
                if (photo) {
                  return <img src={normalizeUrl(photo)} className="w-full h-full object-cover" alt="cover" />
                }
                return (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                    <ImageIcon className="text-primary/40" size={32} />
                  </div>
                )
              })()}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">View Memory</span>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-sm truncate">{m.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{m.mood || 'Neutral'}</span>
                <span className="flex items-center gap-1 text-yellow-500 text-xs font-bold"><Star size={12} className="fill-yellow-500"/> {m.importance || 5}/10</span>
              </div>
            </div>
          </div>
        ))}
        {memories.length === 0 && <p className="text-muted-foreground text-sm">No recent memories found.</p>}
      </div>

      {selectedMemory && (
        <MemoryPreviewModal
          isOpen={true}
          onClose={() => setSelectedMemory(null)}
          memory={selectedMemory}
          relationships={relationships}
          onEdit={() => navigate('/records')}
          onDelete={() => navigate('/records')}
          onDuplicate={() => navigate('/records')}
        />
      )}
    </div>
  )
}
