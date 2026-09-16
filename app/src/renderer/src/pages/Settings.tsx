import { useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Download, Edit, Trash2, FileDown, GitMerge, FileArchive, Settings2, Map, Bell, Sparkles, HardDrive, HelpCircle, UserCircle, ShieldAlert } from 'lucide-react'
import { NotificationEngine } from '../lib/NotificationEngine'
import OfflineMaps from './Settings/OfflineMaps'
import PrivateProfileSettings from './Settings/PrivateProfileSettings'
import DesktopNotificationSettings from './Settings/DesktopNotificationSettings'
import StorageSettings from './Settings/StorageSettings'
import AIAssistantSettings from './Settings/AIAssistantSettings'
import UserGuidanceSettings from './Settings/UserGuidanceSettings'
import KisekiIDSettings from './Settings/KisekiIDSettings'
import { useKisekiHiddenFeatures } from '../hooks/useKisekiHiddenFeatures'

export default function Settings() {
  const showKiseki = useKisekiHiddenFeatures()
  const [currentProfile, setCurrentProfile] = useState<'public' | 'private'>('public')
  const [activeTab, setActiveTab] = useState('general')
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<string | null>(null)
  const [recentExports, setRecentExports] = useState<{ path: string, name: string, date: number }[]>([])
  const [backupLocation, setBackupLocation] = useState<string>('')
  
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  
  const [devMode, setDevMode] = useState(false)
  const [theme, setTheme] = useState('system')
  const [useAppPointer, setUseAppPointer] = useState(true)

  useEffect(() => {
    setDevMode(localStorage.getItem('developerMode') === 'true')
    setTheme(localStorage.getItem('theme') || 'system')
    const appPointer = localStorage.getItem('useAppPointer')
    setUseAppPointer(appPointer === null ? true : appPointer === 'true')
    
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
    
    const loadBackupLocation = async () => {
      try {
        // @ts-ignore
        const loc = await window.api.vault.getBackupLocation()
        setBackupLocation(loc)
      } catch (e) {}
    }

    loadBackups()
    loadBackupLocation()

    // @ts-ignore
    if (window.api.profile) {
      // @ts-ignore
      // @ts-ignore
      window.api.profile.getCurrent().then(p => setCurrentProfile(p))
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const tabs = ['general', 'maps', 'notifications', 'ai', 'storage', 'guidance']
          if (showKiseki) tabs.push('kiseki')
          if (currentProfile === 'private') tabs.push('private')
          
          const currentIndex = tabs.indexOf(activeTab)
          
          if (currentIndex !== -1) {
            let nextIndex = currentIndex
            if (e.key === 'ArrowUp') {
              nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
            } else if (e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % tabs.length
            }
            setActiveTab(tabs[nextIndex])
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, currentProfile, showKiseki])

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

  const handleAppPointerToggle = () => {
    const newState = !useAppPointer
    setUseAppPointer(newState)
    localStorage.setItem('useAppPointer', String(newState))
    window.dispatchEvent(new Event('appPointerChanged'))
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

  const handleChangeLocation = async () => {
    try {
      // @ts-ignore
      const res = await window.api.vault.setBackupLocation()
      if (res.success) {
        setBackupLocation(res.path)
        NotificationEngine.notify('success', 'Location Updated', 'Backup location changed successfully.', 'Settings')
        
        // Reload backups since the location changed
        // @ts-ignore
        const listRes = await window.api.vault.listBackups()
        if (listRes.success) setRecentExports(listRes.backups)
      }
    } catch (e: any) {
      alert('Failed to change location: ' + e.message)
    }
  }

  const NavItem = ({ value, icon: Icon, label, description, isDanger }: { value: string, icon: any, label: string, description?: string, isDanger?: boolean }) => (
    <Tabs.Trigger
      value={value}
      className={`
        group flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-all duration-300 outline-none relative overflow-visible
        data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/10
        data-[state=inactive]:hover:bg-foreground/5 data-[state=inactive]:hover:translate-x-1.5 data-[state=inactive]:border data-[state=inactive]:border-transparent
        active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer
        ${isDanger ? 'data-[state=active]:bg-destructive/10 data-[state=active]:border-destructive/20 data-[state=inactive]:hover:bg-destructive/5' : ''}
      `}
    >
      <div className={`
        absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity duration-300 rounded-xl pointer-events-none
        ${isDanger ? 'from-destructive/10' : ''} group-hover:opacity-50 group-data-[state=active]:opacity-100
      `} />
      <div className={`
        relative p-2.5 rounded-lg transition-all duration-300
        ${isDanger 
          ? 'group-data-[state=active]:bg-destructive/20 group-data-[state=active]:text-destructive group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-muted-foreground group-data-[state=inactive]:shadow-sm group-hover:text-destructive group-hover:scale-110' 
          : 'group-data-[state=active]:bg-primary/20 group-data-[state=active]:text-primary group-data-[state=inactive]:bg-background group-data-[state=inactive]:text-muted-foreground group-data-[state=inactive]:shadow-sm group-hover:text-primary group-hover:scale-110'}
      `}>
        <Icon size={18} strokeWidth={2.5} className="transition-transform duration-300" />
      </div>
      <div className="relative flex-1 min-w-0">
        <div className={`font-semibold text-[14px] transition-colors duration-300 ${isDanger ? 'group-data-[state=active]:text-destructive group-data-[state=inactive]:text-foreground/70 group-hover:text-destructive' : 'group-data-[state=active]:text-foreground group-data-[state=inactive]:text-foreground/70 group-hover:text-foreground'}`}>
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-muted-foreground/60 truncate transition-all duration-300 group-data-[state=active]:text-foreground/60 group-hover:text-foreground/60">
            {description}
          </div>
        )}
      </div>
      <div className={`
        absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 rounded-r-full transition-all duration-300
        group-data-[state=active]:h-3/4 group-data-[state=active]:bg-primary
        ${isDanger ? 'group-data-[state=active]:bg-destructive' : ''}
      `} />
    </Tabs.Trigger>
  )

  return (
    <div className="flex-1 w-full h-full relative flex flex-col overflow-hidden bg-background">
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-in fade-in duration-[2000ms]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[100px] animate-in fade-in duration-[2500ms]" />
      </div>

      <div className="flex-1 min-h-0 w-full max-w-[1400px] mx-auto p-6 md:p-10 lg:p-12 flex flex-col z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="mb-10 lg:mb-14 px-4 shrink-0">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground/90">Settings</h1>
          <p className="text-muted-foreground/80 mt-2.5 text-[15px] max-w-2xl leading-relaxed">
            Personalize your Kiseki Record experience, manage backups, and configure system preferences.
          </p>
        </header>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8 lg:gap-12 flex-1 min-h-0">
          {/* Navigation Sidebar */}
          <Tabs.List className="flex md:flex-col gap-1.5 w-full md:w-72 shrink-0 overflow-x-auto md:overflow-y-auto pb-4 md:pb-0 scrollbar-none rounded-xl">
            <NavItem value="general" icon={Settings2} label="General" description="System and backup settings" />
            <NavItem value="maps" icon={Map} label="Offline Maps" description="Manage map tiles and storage" />
            <NavItem value="notifications" icon={Bell} label="Notifications" description="Desktop alerts and sounds" />
            <NavItem value="ai" icon={Sparkles} label="AI Assistant" description="Configure LLM integration" />
            <NavItem value="storage" icon={HardDrive} label="Storage" description="Manage database and media" />
            <NavItem value="guidance" icon={HelpCircle} label="User Guidance" description="Tutorials and help" />
            
            {showKiseki && (
              <NavItem value="kiseki" icon={UserCircle} label="My Kiseki ID" description="Account synchronization" />
            )}
            
            {currentProfile === 'private' && (
              <div className="md:mt-4 md:pt-4 md:border-t md:border-border/50">
                <NavItem value="private" icon={ShieldAlert} label="Private Profile" description="Security and access" isDanger />
              </div>
            )}
          </Tabs.List>

          {/* Content Area */}
          <div className="flex-1 min-w-0 bg-transparent overflow-y-auto relative px-2 scrollbar-none">
            
            <div className="relative pb-10">
              <Tabs.Content value="general" className="focus-visible:outline-none space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {/* Local Vault Section */}
                <section>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold tracking-tight">Local Vault (Backup)</h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Export all your data (including journal photos and attachments) into a single `.kvault` file. Keep this file safe. You can also import data from a previously exported vault.
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Backup Location Card */}
                    <div className="p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/40 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all hover:shadow-md">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1">Backup Location</h3>
                        <p className="text-sm text-muted-foreground font-mono break-all bg-accent/30 p-2 rounded-md inline-block">{backupLocation || 'Not set'}</p>
                      </div>
                      <button 
                        onClick={handleChangeLocation}
                        className="px-4 py-2 bg-secondary text-secondary-foreground border border-border/50 rounded-lg hover:bg-secondary/80 hover:border-border text-sm font-medium transition-all hover:shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/30 outline-none shrink-0"
                      >
                        Change Location
                      </button>
                    </div>
                    
                    {/* Export Card */}
                    <div className="p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold mb-1">Export Data</h3>
                          <p className="text-sm text-muted-foreground">Create a new backup vault file.</p>
                        </div>
                        <button 
                          onClick={handleExport}
                          disabled={exporting || importing}
                          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/50 outline-none flex items-center gap-2 relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-lg pointer-events-none mix-blend-overlay" />
                          <FileArchive size={16} />
                          {exporting ? 'Exporting...' : 'Export Vault'}
                        </button>
                      </div>

                      {exportResult && (
                        <div className="mt-3 text-sm font-medium p-3 bg-primary/10 text-primary border border-primary/20 rounded-lg animate-in fade-in">
                          {exportResult}
                        </div>
                      )}

                      {recentExports.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-border/50">
                          <h3 className="font-semibold text-sm mb-3">Recent Exports</h3>
                          <div className="grid gap-3">
                            {recentExports.map((recent, i) => (
                              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-accent/20 border border-border/30 rounded-xl hover:bg-accent/40 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="p-2 bg-background rounded-lg shadow-sm">
                                    <FileArchive className="text-primary" size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate" title={recent.path}>{recent.name}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(recent.date).toLocaleString()}</p>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => handleSpecificAction('rename', recent.path)} className="p-2 text-muted-foreground hover:bg-background hover:text-foreground rounded-md transition-all shadow-sm border border-transparent hover:border-border/50 active:scale-90 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none" title="Rename"><Edit size={14} /></button>
                                    <button onClick={() => handleSpecificAction('download', recent.path)} className="p-2 text-muted-foreground hover:bg-background hover:text-foreground rounded-md transition-all shadow-sm border border-transparent hover:border-border/50 active:scale-90 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none" title="Download / Copy"><Download size={14} /></button>
                                    <button onClick={() => handleSpecificAction('delete', recent.path)} className="p-2 text-destructive/70 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all shadow-sm border border-transparent hover:border-destructive/20 active:scale-90 focus-visible:ring-2 focus-visible:ring-destructive/40 outline-none" title="Delete"><Trash2 size={14} /></button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleImport('merge', recent.path)}
                                      disabled={exporting || importing}
                                      className="px-3 py-1.5 bg-background hover:bg-primary hover:text-primary-foreground border border-border/50 hover:border-primary rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                                    >
                                      <GitMerge size={14} /> Merge
                                    </button>
                                    <button 
                                      onClick={() => handleImport('replace', recent.path)}
                                      disabled={exporting || importing}
                                      className="px-3 py-1.5 bg-background hover:bg-destructive hover:text-destructive-foreground border border-border/50 hover:border-destructive rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 focus-visible:ring-2 focus-visible:ring-destructive/40 outline-none"
                                    >
                                      <FileDown size={14} /> Replace
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Import External Card */}
                    <div className="p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold mb-1">Import External Vault</h3>
                          <p className="text-sm text-muted-foreground">Import data from a vault file not listed above.</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button 
                            onClick={() => handleImport('merge')}
                            disabled={exporting || importing}
                            className="px-4 py-2 bg-secondary text-secondary-foreground border border-border/50 rounded-lg hover:bg-secondary/80 hover:border-border disabled:opacity-50 font-medium transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/30 outline-none text-sm shadow-sm"
                          >
                            Merge Data
                          </button>
                          <button 
                            onClick={() => handleImport('replace')}
                            disabled={exporting || importing}
                            className="px-4 py-2 bg-destructive/90 text-destructive-foreground rounded-lg hover:bg-destructive disabled:opacity-50 font-medium transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-destructive/40 outline-none text-sm shadow-sm"
                          >
                            Replace All
                          </button>
                        </div>
                      </div>
                      {importResult && (
                        <div className="mt-4 text-sm font-medium p-3 bg-accent text-accent-foreground rounded-lg animate-in fade-in">
                          {importResult}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                
                {/* System Settings Section */}
                <section className="pt-8 border-t border-border/30">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold tracking-tight">System Settings</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Theme */}
                    <div className="flex items-center justify-between p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-md">
                      <div>
                        <h3 className="font-semibold mb-1">Appearance</h3>
                        <p className="text-sm text-muted-foreground">Choose your preferred theme.</p>
                      </div>
                      <select 
                        value={theme}
                        onChange={handleThemeChange}
                        className="px-4 py-2 rounded-lg border border-border bg-background outline-none font-medium text-sm shadow-sm hover:border-primary/50 transition-all focus:ring-2 focus:ring-primary/40 focus:border-primary/50 active:scale-[0.98] cursor-pointer"
                      >
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                        <option value="system">System Default</option>
                      </select>
                    </div>
                    
                    {/* Developer Mode */}
                    <div className="flex items-center justify-between p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-destructive/20 shadow-sm hover:border-destructive/40 transition-all hover:shadow-md">
                      <div>
                        <h3 className="font-semibold mb-1 text-destructive">Developer Mode</h3>
                        <p className="text-sm text-muted-foreground">Enable advanced error logging and AI-assisted troubleshooting.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer active:scale-95 transition-transform duration-200">
                        <input type="checkbox" className="sr-only peer" checked={devMode} onChange={handleDevModeToggle} />
                        <div className="w-12 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destructive shadow-inner"></div>
                      </label>
                    </div>

                    {/* App Pointer Mode */}
                    <div className="flex items-center justify-between p-6 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-md">
                      <div>
                        <h3 className="font-semibold mb-1">Custom App Pointer</h3>
                        <p className="text-sm text-muted-foreground">Use the stylized custom cursor instead of the system default.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer active:scale-95 transition-transform duration-200">
                        <input type="checkbox" className="sr-only peer" checked={useAppPointer} onChange={handleAppPointerToggle} />
                        <div className="w-12 h-6 bg-accent peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </section>
              </Tabs.Content>
              
              <Tabs.Content value="maps" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                <OfflineMaps />
              </Tabs.Content>
              
              <Tabs.Content value="notifications" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                <DesktopNotificationSettings devMode={devMode} />
              </Tabs.Content>

              <Tabs.Content value="ai" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                <AIAssistantSettings />
              </Tabs.Content>

              <Tabs.Content value="storage" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                <StorageSettings />
              </Tabs.Content>

              <Tabs.Content value="guidance" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                <UserGuidanceSettings />
              </Tabs.Content>

              {showKiseki && (
                <Tabs.Content value="kiseki" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                  <KisekiIDSettings />
                </Tabs.Content>
              )}

              {currentProfile === 'private' && (
                <Tabs.Content value="private" className="focus-visible:outline-none animate-in fade-in slide-in-from-right-4 duration-500">
                  <PrivateProfileSettings />
                </Tabs.Content>
              )}
            </div>
          </div>
        </Tabs.Root>
      </div>
    </div>
  )
}
