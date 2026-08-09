import { useState, useRef } from 'react'
import { Download, FileText, Printer, FileJson, FileSpreadsheet, Code } from 'lucide-react'

export default function Export() {
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleExportJSON = async () => {
    setLoading(true)
    try {
      // Fetch everything
      // @ts-ignore
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const journal = await window.api.db.find('journal', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})

      const data = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        data: { records, journal, goals }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kiseki-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
      alert('Export failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    // Basic redirect/instruction since real PDF export is best done from CustomReport or YearlyReport
    alert('To export a beautifully formatted PDF, please go to Custom Reports or Yearly Reports and click the Print button in the top right corner!')
  }

  // Right-click drag scrolling handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsDragging(true)
      setDragStartY(e.clientY)
      setScrollTop(scrollContainerRef.current?.scrollTop || 0)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = e.clientY - dragStartY
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollTop - deltaY
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (scrollContainerRef.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop += 100
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        scrollContainerRef.current.scrollTop -= 100
      }
    }
  }

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full overflow-y-auto p-8 animate-in fade-in duration-500 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Download className="text-primary" /> 
            Export Data
          </h1>
          <p className="text-muted-foreground mt-1">Download your life records in various formats for safekeeping.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* PDF / Visual Export */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-red-500/50 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24}/>
          </div>
          <h3 className="text-xl font-bold mb-2">PDF Report</h3>
          <p className="text-muted-foreground text-sm mb-6 h-10">Export a beautiful, formatted document of your selected timeframe.</p>
          <button onClick={handlePrint} className="w-full py-2 bg-background border border-border rounded-lg hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors font-medium flex items-center justify-center gap-2">
            <Printer size={16}/> Go to Custom Reports
          </button>
        </div>

        {/* JSON Export */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-green-500/50 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileJson size={24}/>
          </div>
          <h3 className="text-xl font-bold mb-2">Raw JSON</h3>
          <p className="text-muted-foreground text-sm mb-6 h-10">Download a complete, machine-readable backup of your entire database.</p>
          <button onClick={handleExportJSON} disabled={loading} className="w-full py-2 bg-background border border-border rounded-lg hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Download size={16}/> {loading ? 'Compiling...' : 'Download JSON'}
          </button>
        </div>

        {/* Markdown Export */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-blue-500/50 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Code size={24}/>
          </div>
          <h3 className="text-xl font-bold mb-2">Markdown Logs</h3>
          <p className="text-muted-foreground text-sm mb-6 h-10">Export your journal entries and notes as standard Markdown files.</p>
          <button onClick={() => alert('Markdown export is coming in the next update!')} className="w-full py-2 bg-background border border-border rounded-lg hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors font-medium flex items-center justify-center gap-2">
            <Download size={16}/> Coming Soon
          </button>
        </div>

        {/* Excel Export */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-emerald-500/50 transition-colors group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={24}/>
          </div>
          <h3 className="text-xl font-bold mb-2">CSV / Excel</h3>
          <p className="text-muted-foreground text-sm mb-6 h-10">Export habits and finances into a spreadsheet format.</p>
          <button onClick={() => alert('CSV export is coming in the next update!')} className="w-full py-2 bg-background border border-border rounded-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors font-medium flex items-center justify-center gap-2">
            <Download size={16}/> Coming Soon
          </button>
        </div>

      </div>
    </div>
  )
}
