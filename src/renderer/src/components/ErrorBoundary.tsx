import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    
    // Save to local storage for the Logs viewer
    const logEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      source: 'React Error Boundary',
      severity: 'error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    }

    try {
      const logs = JSON.parse(localStorage.getItem('appLogs') || '[]')
      logs.unshift(logEntry)
      localStorage.setItem('appLogs', JSON.stringify(logs))
    } catch (e) {
      console.error('Failed to save log', e)
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-8">
          <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl max-w-xl w-full text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. The application state has been preserved in your logs.
            </p>
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium"
              onClick={() => {
                this.setState({ hasError: false })
                window.location.reload()
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
