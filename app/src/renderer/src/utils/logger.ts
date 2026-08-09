interface LogEntry {
  id: string
  timestamp: number
  source: string
  severity: 'error' | 'warning' | 'info'
  message: string
  stack?: string
  componentStack?: string
}

export function logError(source: string, message: string, error?: any) {
  const logs: LogEntry[] = JSON.parse(localStorage.getItem('appLogs') || '[]')
  
  const newLog: LogEntry = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    source,
    severity: 'error',
    message,
    stack: error?.stack,
    componentStack: error?.componentStack
  }
  
  logs.unshift(newLog)
  
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.pop()
  }
  
  localStorage.setItem('appLogs', JSON.stringify(logs))
  console.error(`[${source}] ${message}`, error)
}

export function logWarning(source: string, message: string) {
  const logs: LogEntry[] = JSON.parse(localStorage.getItem('appLogs') || '[]')
  
  const newLog: LogEntry = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    source,
    severity: 'warning',
    message
  }
  
  logs.unshift(newLog)
  
  if (logs.length > 100) {
    logs.pop()
  }
  
  localStorage.setItem('appLogs', JSON.stringify(logs))
  console.warn(`[${source}] ${message}`)
}

export function logInfo(source: string, message: string) {
  const logs: LogEntry[] = JSON.parse(localStorage.getItem('appLogs') || '[]')
  
  const newLog: LogEntry = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    source,
    severity: 'info',
    message
  }
  
  logs.unshift(newLog)
  
  if (logs.length > 100) {
    logs.pop()
  }
  
  localStorage.setItem('appLogs', JSON.stringify(logs))
  console.log(`[${source}] ${message}`)
}
