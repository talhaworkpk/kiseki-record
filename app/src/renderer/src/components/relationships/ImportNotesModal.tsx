import { useState, useEffect } from 'react'
import { X, Folder, FileText } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'

interface ImportNotesModalProps {
  isOpen: boolean
  onClose: () => void
  personId: string
  fileContent: string
  onSuccess: () => void
}

const ALBUMS = ['General', 'Trips', 'Events', 'Childhood', 'Holidays', 'School', 'Work', 'Family', 'Friends']

export default function ImportNotesModal({ isOpen, onClose, personId, fileContent, onSuccess }: ImportNotesModalProps) {
  const [album, setAlbum] = useState('General')
  const [allAlbums, setAllAlbums] = useState<string[]>(ALBUMS.filter(a => a !== 'Custom'))
  const [parsedMemories, setParsedMemories] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [conflictStrategy, setConflictStrategy] = useState<'duplicate' | 'skip' | 'replace'>('duplicate')

  useEffect(() => {
    if (isOpen) {
      loadAlbums()
      parseFile(fileContent)
    }
  }, [isOpen, fileContent])

  const loadAlbums = async () => {
    try {
      // @ts-ignore
      const records = await window.api.db.find('records', { type: 'Memory' })
      const customCategories = records.map((r: any) => r.category).filter((c: string) => c && !ALBUMS.includes(c))
      const uniqueCustomCategories = Array.from(new Set(customCategories)) as string[]
      setAllAlbums([...ALBUMS.filter(a => a !== 'Custom'), ...uniqueCustomCategories])
    } catch(e) { console.error(e) }
  }

  const parseFile = (content: string) => {
    // Expected format:
    // ##### DATE: YYYY-MM-DD ##########
    // Title String
    // ----------------------------------------
    // Description String
    // ##### END #######################
    
    const memories: any[] = []
    
    // Split the file by the starting delimiter
    const blocks = content.split(/##### DATE:\s*/).filter(block => block.trim() !== '')
    
    for (const block of blocks) {
      try {
        // Extract date
        const dateEndIdx = block.indexOf('##########')
        if (dateEndIdx === -1) continue
        const dateStr = block.substring(0, dateEndIdx).trim()
        
        // Ensure valid date length
        if (dateStr.length < 10) continue
        
        // Find the END delimiter
        const endIdx = block.indexOf('##### END')
        if (endIdx === -1) continue
        
        // Extract the content between DATE ########## and ##### END
        const mainContent = block.substring(dateEndIdx + 10, endIdx).trim()
        
        // Look for the separator '---------'
        const separatorIdx = mainContent.search(/-{10,}/)
        
        let title = 'Imported Note'
        let description = mainContent
        
        if (separatorIdx !== -1) {
          title = mainContent.substring(0, separatorIdx).trim() || 'Imported Note'
          
          // Find where the separator ends
          const separatorMatch = mainContent.match(/-{10,}/)
          const separatorEndIdx = separatorIdx + (separatorMatch ? separatorMatch[0].length : 0)
          
          description = mainContent.substring(separatorEndIdx).trim()
        }
        
        if (description) {
          memories.push({
            date: dateStr,
            title,
            description
          })
        }
      } catch (e) {
        console.warn('Failed to parse block', e)
      }
    }
    
    setParsedMemories(memories)
  }

  const handleImport = async () => {
    if (parsedMemories.length === 0) {
      NotificationEngine.notify('error', 'Nothing to import', 'No valid memories were found in the file.', 'Relationships')
      return
    }

    setIsImporting(true)
    const now = Date.now()
    const finalAlbum = album.trim()

    try {
      // Fetch existing memories for this person to check for conflicts
      // @ts-ignore
      const existingMemories = await window.api.db.find('records', { type: 'Memory', people: personId })
      
      let importedCount = 0
      let skippedCount = 0
      let replacedCount = 0

      for (const memory of parsedMemories) {
        const existingOnDate = existingMemories.find((m: any) => m.date === memory.date && m.title === memory.title)

        if (existingOnDate) {
          if (conflictStrategy === 'skip') {
            skippedCount++
            continue
          }
          if (conflictStrategy === 'replace') {
            // Remove the old one before creating the new one
            // @ts-ignore
            await window.api.db.remove('records', { _id: existingOnDate._id })
            replacedCount++
          }
        }

        const newRecord = {
          title: memory.title,
          description: memory.description,
          date: memory.date, // the YYYY-MM-DD string is valid
          type: 'Memory',
          category: finalAlbum || undefined, // Store Album in category
          tags: [],
          people: [personId],
          importance: 3,
          privacyLevel: 'private',
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          isArchived: false,
          attachments: []
        }
        // @ts-ignore
        await window.api.db.insert('records', newRecord)
        importedCount++
      }
      
      // Update relationship last active
      // @ts-ignore
      await window.api.db.update('relationships', { _id: personId }, { $set: { updatedAt: Date.now() } }, {})

      let summaryMsg = `Successfully imported ${importedCount} memories.`
      if (skippedCount > 0) summaryMsg += ` Skipped ${skippedCount}.`
      if (replacedCount > 0) summaryMsg += ` Replaced ${replacedCount}.`

      NotificationEngine.notify('success', 'Import Complete', summaryMsg, 'Relationships')
      onSuccess()
      onClose()
    } catch (e) {
      console.error(e)
      NotificationEngine.notify('error', 'Import Failed', 'An error occurred during import.', 'Relationships')
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-accent/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-xl">
              <FileText size={20} />
            </div>
            <h2 className="text-xl font-bold">Import Notes</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {parsedMemories.length > 0 ? (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-700 dark:text-green-400 font-medium">
              Found <strong>{parsedMemories.length}</strong> memories ready to import!
            </div>
          ) : (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-700 dark:text-red-400 font-medium">
              Could not find any memories matching the required format.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                <Folder size={14} className="inline mr-1 -mt-0.5"/> Album (Optional)
              </label>
              <input 
                type="text"
                list="import-albums-list"
                value={album}
                onChange={e=>setAlbum(e.target.value)}
                placeholder="Select or type an album name..."
                className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <datalist id="import-albums-list">
                {allAlbums.map(a => <option key={a} value={a} />)}
              </datalist>
              <p className="text-xs text-muted-foreground mt-2">
                Leave blank if you don't want to assign these memories to a specific album.
              </p>
            </div>
            
            <div className="pt-2">
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                Conflict Resolution Strategy
              </label>
              <select
                value={conflictStrategy}
                onChange={e => setConflictStrategy(e.target.value as any)}
                className="w-full bg-accent/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
              >
                <option value="duplicate">Add as duplicates (Allow multiple memories with same date and title)</option>
                <option value="skip">Skip (Ignore if a memory already exists with the same date and title)</option>
                <option value="replace">Replace (Overwrite the existing memory with the same date and title)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                What should happen if a memory already exists with the exact same date and title?
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-accent/10">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
          <button 
            onClick={handleImport}
            disabled={parsedMemories.length === 0 || isImporting}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : 'Import Memories'}
          </button>
        </div>

      </div>
    </div>
  )
}
