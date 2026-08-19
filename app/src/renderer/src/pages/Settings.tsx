import { useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Download, Edit, Trash2, FileDown, GitMerge, FileArchive } from 'lucide-react'
import { NotificationEngine } from '../lib/NotificationEngine'
import OfflineMaps from './Settings/OfflineMaps'
import PrivateProfileSettings from './Settings/PrivateProfileSettings'
import DesktopNotificationSettings from './Settings/DesktopNotificationSettings'
import StorageSettings from './Settings/StorageSettings'

export default function Settings() {
  const [currentProfile, setCurrentProfile] = useState<'public' | 'private'>('public')
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<string | null>(null)
  const [recentExports, setRecentExports] = useState<{ path: string, name: string, date: number }[]>([])
  
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  
  const [devMode, setDevMode] = useState(false)
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    setDevMode(localStorage.getItem('developerMode') === 'true')
    setTheme(localStorage.getItem('theme') || 'system')
    
    const loadBackups = async () => {
      try {
        // @ts-ignore
        const res = await window.api.vault.listBackups()
        if (res.success) {
          setRecentExports(res.backups)
        }
      } catch (e) {
        console.error('Failed to load backups', e)
      }
    }
    loadBackups()
    // @ts-ignore
    if (window.api.profile) {
      // @ts-ignore
      window.api.profile.getCurrent().then(p => setCurrentProfile(p))
    }
  }, [])

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    window.dispatchEvent(new Event('themeChanged'))
  }

  const handleDevModeToggle = () => {
    const newState = !devMode
    setDevMode(newState)
    localStorage.setItem('developerMode', String(newState))
    window.dispatchEvent(new Event('storage')) // Trigger App.tsx listener
  }

  const handleExport = async () => {
    setExporting(true)
    setExportResult(null)
    try {
      // @ts-ignore
      const res = await window.api.vault.export({})
      if (res.success) {
        setExportResult(`Successfully exported to: ${res.filePath}`)
        NotificationEngine.notify('success', 'Export Successful', `Data exported to ${res.filePath}`, 'Settings')
        
        // Refresh the backup list from disk instead of relying on state
        // @ts-ignore
        const listRes = await window.api.vault.listBackups()
        if (listRes.success) {
          const backups = listRes.backups
          setRecentExports(backups)
          
          // delete older backups from disk if there are more than 3
          if (backups.length > 3) {
            const toDelete = backups.slice(3)
            for (const old of toDelete) {
              // @ts-ignore
              await window.api.vault.delete({ filePath: old.path }).catch(() => {})
            }
            // @ts-ignore
            const finalRes = await window.api.vault.listBackups()
            if (finalRes.success) setRecentExports(finalRes.backups)
          }
        }
      } else {
        setExportResult(`Export failed: ${res.error}`)
        NotificationEngine.notify('error', 'Export Failed', `Export failed: ${res.error}`, 'Settings')
      }
    } catch (err: any) {
      setExportResult(`Error: ${err.message}`)
      NotificationEngine.notify('error', 'Export Failed', `Error: ${err.message}`, 'Settings')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (mode: 'merge' | 'replace', filePath?: string) => {
    if (mode === 'replace' && !confirm('WARNING: Replacing will overwrite your current data. Are you sure you want to proceed?')) {
      return
    }
    if (mode === 'merge' && !confirm('Are you sure you want to merge this backup? New records will be added and updated records will be replaced.')) {
      return
    }
    
    setImporting(true)
    setImportResult(null)
    try {
      // @ts-ignore
      const res = await window.api.vault.import({ mode, filePath })
      if (res.success) {
        setImportResult(`Successfully imported from: ${res.filePath}. Please restart the app to see changes.`)
        NotificationEngine.notify('success', 'Import Successful', `Data imported from ${res.filePath}. Restart to apply.`, 'Settings')
      } else {
        setImportResult(`Import failed: ${res.error}`)
        NotificationEngine.notify('error', 'Import Failed', `Import failed: ${res.error}`, 'Settings')
      }
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`)
      NotificationEngine.notify('error', 'Import Failed', `Error: ${err.message}`, 'Settings')
    } finally {
      setImporting(false)
    }
  }

  const handleSpecificAction = async (action: 'download' | 'rename' | 'delete', path: string) => {
    try {
      if (action === 'delete') {
        if (!confirm('Are you sure you want to permanently delete this backup from your computer?')) return
        // @ts-ignore
        const res = await window.api.vault.delete({ filePath: path })
        if (res.success) {
          // @ts-ignore
          const listRes = await window.api.vault.listBackups()
          if (listRes.success) setRecentExports(listRes.backups)
          NotificationEngine.notify('info', 'Backup Deleted', 'The backup file was deleted.')
        } else {
          alert('Failed to delete file: ' + res.error)
        }
      } else if (action === 'rename') {
        const newName = prompt('Enter a new name for this backup (e.g. my_backup.kvault):')
        if (!newName) return
        
        // @ts-ignore
        const res = await window.api.vault.rename({ oldPath: path, newName })
        if (res.success) {
          // @ts-ignore
          const listRes = await window.api.vault.listBackups()
          if (listRes.success) setRecentExports(listRes.backups)
          NotificationEngine.notify('success', 'Backup Renamed', 'The backup file was successfully renamed.')
        } else {
          alert('Failed to rename file: ' + res.error)
        }
      } else if (action === 'download') {
        // @ts-ignore
        const res = await window.api.vault.download({ sourcePath: path })
        if (res.success) {
          NotificationEngine.notify('success', 'Backup Copied', `Copied backup to ${res.filePath}`)
        } else if (!res.cancelled) {
          alert('Failed to download/copy: ' + res.error)
        }
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs.Root defaultValue="general" className="flex flex-col">
        <Tabs.List className="flex w-full border-b border-border mb-6">
          <Tabs.Trigger
            value="general"
            className="px-6 py-3 font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors focus-visible:outline-none"
          >
            General
          </Tabs.Trigger>
          <Tabs.Trigger
            value="maps"
            className="px-6 py-3 font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors focus-visible:outline-none"
          >
            Offline Maps
          </Tabs.Trigger>
          <Tabs.Trigger
            value="notifications"
            className="px-6 py-3 font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors focus-visible:outline-none"
          >
            Notifications
          </Tabs.Trigger>
          <Tabs.Trigger
            value="storage"
            className="px-6 py-3 font-medium text-muted-foreground data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors focus-visible:outline-none"
          >
            Storage
          </Tabs.Trigger>
          {currentProfile === 'private' && (
            <Tabs.Trigger
              value="private"
              className="px-6 py-3 font-medium text-destructive data-[state=active]:text-destructive data-[state=active]:border-b-2 data-[state=active]:border-destructive transition-colors focus-visible:outline-none"
            >
              Private Profile
            </Tabs.Trigger>
          )}
        </Tabs.List>

        <Tabs.Content value="general" className="focus-visible:outline-none space-y-8">
          <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Local Vault (Backup)</h2>
          <p className="text-muted-foreground mb-4">
            Export all your data (including journal photos and attachments) into a single `.kvault` file. Keep this file safe. You can also import data from a previously exported vault.
          </p>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Export Data</h3>
              <button 
                onClick={handleExport}
                disabled={exporting || importing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                {exporting ? 'Exporting...' : 'Export Vault'}
              </button>
              {exportResult && (
                <p className="mt-2 text-sm font-medium p-3 bg-accent text-accent-foreground rounded">
                  {exportResult}
                </p>
              )}
            </div>

            {recentExports.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h3 className="font-medium mb-3">Recent Exports</h3>
                <div className="space-y-3">
                  {recentExports.map((recent, i) => (
                    <div key={i} className="flex flex-col gap-2 p-3 bg-accent/30 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FileArchive className="text-primary shrink-0" size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate" title={recent.path}>{recent.name}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(recent.date).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleSpecificAction('rename', recent.path)} className="p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground rounded" title="Rename"><Edit size={14} /></button>
                          <button onClick={() => handleSpecificAction('download', recent.path)} className="p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground rounded" title="Download / Copy"><Download size={14} /></button>
                          <button onClick={() => handleSpecificAction('delete', recent.path)} className="p-1.5 text-red-400 hover:bg-red-500/20 hover:text-red-500 rounded" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleImport('replace', recent.path)}
                          disabled={exporting || importing}
                          className="flex-1 py-1.5 bg-background hover:bg-destructive hover:text-white border border-border rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <FileDown size={14} /> Import (Replace)
                        </button>
                        <button 
                          onClick={() => handleImport('merge', recent.path)}
                          disabled={exporting || importing}
                          className="flex-1 py-1.5 bg-background hover:bg-primary hover:text-white border border-border rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <GitMerge size={14} /> Merge Data
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <h3 className="font-medium mb-2">Import Data</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleImport('merge')}
                  disabled={exporting || importing}
                  className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-md hover:bg-secondary/90 disabled:opacity-50 font-medium"
                >
                  Merge Vault Data
                </button>
                <button 
                  onClick={() => handleImport('replace')}
                  disabled={exporting || importing}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 font-medium"
                >
                  Replace All Data
                </button>
              </div>
              {importResult && (
                <p className="mt-2 text-sm font-medium p-3 bg-accent text-accent-foreground rounded">
                  {importResult}
                </p>
              )}
            </div>
          </div>
        </section>
        
        <section className="p-6 border border-border rounded-xl bg-card shadow-sm">
          <h2 className="text-xl font-semibold mb-4">System Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1">Appearance</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme or sync it with your OS.
                </p>
              </div>
              <select 
                value={theme}
                onChange={handleThemeChange}
                className="p-2 rounded-md border border-border bg-background outline-none font-medium"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-1 text-destructive">Developer Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Enable advanced error logging and AI-assisted troubleshooting.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={devMode} onChange={handleDevModeToggle} />
                <div className="w-11 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destructive"></div>
              </label>
            </div>
          </div>
        </section>
        </Tabs.Content>
        
        <Tabs.Content value="maps" className="focus-visible:outline-none">
          <OfflineMaps />
        </Tabs.Content>
        
        <Tabs.Content value="notifications" className="focus-visible:outline-none">
          <DesktopNotificationSettings devMode={devMode} />
        </Tabs.Content>

        <Tabs.Content value="storage" className="focus-visible:outline-none space-y-8">
          <StorageSettings />
        </Tabs.Content>

        {currentProfile === 'private' && (
          <Tabs.Content value="private" className="focus-visible:outline-none">
            <PrivateProfileSettings />
          </Tabs.Content>
        )}
      </Tabs.Root>
    </div>
  )
}
