import { X, AlertCircle } from 'lucide-react'

interface MissReasonPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenMissReason: () => void
  habitTitle: string
}

export default function MissReasonPromptModal({ isOpen, onClose, onOpenMissReason, habitTitle }: MissReasonPromptModalProps) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-card">
          <div>
            <h2 className="text-xl font-bold text-orange-500">Add Miss Reason</h2>
            <div className="text-sm font-medium text-muted-foreground">Improve your habit tracking</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
            <div className="shrink-0 mt-0.5">
              <AlertCircle size={24} className="text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground/90 leading-relaxed">
                You missed <span className="font-bold text-orange-500">"{habitTitle}"</span>. Adding a reason helps you understand patterns and improve your consistency over time.
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed">
            Tracking why you miss habits can help you identify obstacles and create better strategies to stay on track.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold hover:bg-accent transition-colors">Skip</button>
          <button 
            onClick={onOpenMissReason}
            className="px-5 py-2.5 rounded-xl font-bold bg-orange-500 text-white hover:scale-105 transition-transform shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <AlertCircle size={18} /> Add Miss Reason
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
