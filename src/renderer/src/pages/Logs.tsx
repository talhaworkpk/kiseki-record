import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, Copy, Download, Bot } from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: number
  source: string
  severity: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  componentStack?: string
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [isExplaining, setIsExplaining] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = () => {
    const storedLogs = JSON.parse(localStorage.getItem('appLogs') || '[]')
    setLogs(storedLogs)
  }

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      localStorage.removeItem('appLogs')
      setLogs([])
      setSelectedLog(null)
    }
  }

  const copyLog = (log: LogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2))
  }

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kiseki-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const explainWithAI = async (log: LogEntry) => {
    setIsExplaining(true)
    setAiExplanation(null)
    
    const prompt = `Explain the following application error simply. Provide: 1) A simple explanation, 2) Probable cause, 3) Safe troubleshooting steps, 4) Relevant file or feature area. 
    Error Message: ${log.message}
    Source: ${log.source}
    Stack: ${log.stack || 'None'}
    Component Stack: ${log.componentStack || 'None'}`

    try {
      // First get a model
      const modelRes = await fetch('http://127.0.0.1:11434/api/tags')
      if (!modelRes.ok) throw new Error('Ollama offline')
      const modelData = await modelRes.json()
      if (modelData.models.length === 0) throw new Error('No models found')
      
      const model = modelData.models[0].name

      const res = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        })
      })

      if (!res.ok) throw new Error('Failed to fetch from Ollama')
      const data = await res.json()
      setAiExplanation(data.message.content)
    } catch (err: any) {
      setAiExplanation(`Could not explain error using AI: ${err.message}`)
    } finally {
      setIsExplaining(false)
    }
  }

  return (
    <div className="flex h-full animate-in fade-in duration-500">
      <div className="w-1/3 border-r border-border bg-card flex flex-col h-full">
        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
          <h2 className="font-bold flex items-center gap-2">
            <AlertTriangle className="text-destructive" size={18} /> Error Logs
          </h2>
          <div className="flex gap-2">
            <button onClick={exportLogs} className="p-1.5 hover:bg-accent rounded text-muted-foreground" title="Export Logs">
              <Download size={16} />
            </button>
            <button onClick={clearLogs} className="p-1.5 hover:bg-destructive/10 text-destructive rounded" title="Clear Logs">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No errors logged. Everything is running smoothly.
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={`${log.id}-${index}`} 
                onClick={() => { setSelectedLog(log); setAiExplanation(null) }}
                className={`p-3 rounded-md cursor-pointer border ${selectedLog?.id === log.id ? 'bg-accent border-accent-foreground/20' : 'bg-background border-transparent hover:border-border'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${log.severity === 'error' ? 'text-destructive' : 'text-amber-500'}`}>
                    {log.severity}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm font-medium line-clamp-1">{log.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{log.source}</p>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto bg-background">
        {selectedLog ? (
          <div className="max-w-3xl space-y-6">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-bold text-destructive break-words">{selectedLog.message}</h1>
              <button onClick={() => copyLog(selectedLog)} className="p-2 hover:bg-accent rounded-md text-muted-foreground flex items-center gap-2 text-sm">
                <Copy size={16} /> Copy
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm bg-card p-4 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground block mb-1">Timestamp</span>
                <span className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Source</span>
                <span className="font-medium">{selectedLog.source}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bot size={20} className="text-primary" /> AI Troubleshooting
                </h3>
                <button 
                  onClick={() => explainWithAI(selectedLog)}
                  disabled={isExplaining}
                  className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium text-sm transition-colors"
                >
                  {isExplaining ? 'Analyzing...' : 'Explain with AI'}
                </button>
              </div>
              
              {aiExplanation && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                  {aiExplanation}
                </div>
              )}
            </div>

            {selectedLog.stack && (
              <div>
                <h3 className="font-medium mb-2">Stack Trace</h3>
                <pre className="p-4 bg-card border border-border rounded-lg text-xs overflow-x-auto font-mono text-muted-foreground whitespace-pre-wrap">
                  {selectedLog.stack}
                </pre>
              </div>
            )}
            
            {selectedLog.componentStack && (
              <div>
                <h3 className="font-medium mb-2">Component Stack</h3>
                <pre className="p-4 bg-card border border-border rounded-lg text-xs overflow-x-auto font-mono text-muted-foreground whitespace-pre-wrap">
                  {selectedLog.componentStack}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle size={48} className="mb-4 opacity-20" />
            <p>Select a log entry to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
