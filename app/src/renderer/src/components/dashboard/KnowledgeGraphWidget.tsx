import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Filter, Calendar, Maximize, Target, Book, Clock, MapPin, Heart, Briefcase, GraduationCap, Folder, Award, Star, Activity, ArrowRight, X } from 'lucide-react'
import { buildKnowledgeGraph, GraphNode, GraphLink, CATEGORY_COLORS } from './KnowledgeGraphBuilder'

const ICONS: Record<string, React.FC<any>> = {
  Goal: Target,
  Journal: Book,
  Record: Clock,
  Habit: Activity,
  Relationship: Heart,
  Career: Briefcase,
  Education: GraduationCap,
  Project: Folder,
  Certificate: Award,
  Achievement: Star,
  Skill: Target
}

export const KnowledgeGraphWidget = () => {
  const [rawData, setRawData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<'Today' | 'Month' | 'Year'>('Today')
  
  // Dropdown selections
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)) // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [clickNode, setClickNode] = useState<GraphNode | null>(null)
  const fgRef = useRef<any>()

  // Fetch all data
  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true)
        // @ts-ignore
        const db = window.api.db
        const [
          records, goals, habits, journal, relationships,
          skills, projects, certificates, career, education, achievements
        ] = await Promise.all([
          db.find('records', {}), db.find('goals', {}), db.find('habits', {}),
          db.find('journal', {}), db.find('relationships', {}), db.find('skills', {}),
          db.find('projects', {}), db.find('certificates', {}), db.find('career', {}),
          db.find('education', {}), db.find('achievements', {})
        ])
        
        setRawData({
          records, goals, habits, journal, relationships,
          skills, projects, certificates, career, education, achievements
        })
      } catch (err) {
        console.error('Failed to fetch graph data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // Filter and build graph
  const graphData = useMemo(() => {
    if (!rawData) return { nodes: [], links: [] }

    // First filter raw data by time
    const filteredData: any = {}
    const now = new Date()
    
    let startMs = 0
    let endMs = Infinity

    if (filterMode === 'Today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      startMs = today.getTime()
      endMs = startMs + 86400000
    } else if (filterMode === 'Month') {
      const [y, m] = selectedMonth.split('-')
      startMs = new Date(parseInt(y), parseInt(m) - 1, 1).getTime()
      endMs = new Date(parseInt(y), parseInt(m), 1).getTime()
    } else if (filterMode === 'Year') {
      startMs = new Date(parseInt(selectedYear), 0, 1).getTime()
      endMs = new Date(parseInt(selectedYear) + 1, 0, 1).getTime()
    }

    const isInRange = (createdAt: number, updatedAt: number) => {
      // If it was created or updated in this range
      return (createdAt >= startMs && createdAt < endMs) || (updatedAt >= startMs && updatedAt < endMs)
    }

    // Apply filtering to all collections
    for (const key in rawData) {
      filteredData[key] = rawData[key].filter((item: any) => {
        const c = item.createdAt || 0
        const u = item.updatedAt || Date.now()
        // Special case: Goals and Habits might have active periods overlapping
        if (key === 'goals' && (item.status === 'Active' || item.status === 'Planned')) return true
        if (key === 'habits' && !item.archived) return true
        if (key === 'skills' || key === 'relationships') return true // Static-ish entities always show if linked
        return isInRange(c, u)
      })
    }

    const fullGraph = buildKnowledgeGraph(filteredData)
    
    // Only keep nodes that actually have links (or are extremely important) to avoid clutter,
    // unless we are in Today mode, then show everything that happened today
    if (filterMode !== 'Today') {
      const linkedNodeIds = new Set<string>()
      fullGraph.links.forEach(l => {
        linkedNodeIds.add(l.source)
        linkedNodeIds.add(l.target)
      })
      fullGraph.nodes = fullGraph.nodes.filter(n => linkedNodeIds.has(n.id) || n.category === 'Goal')
    }

    return fullGraph
  }, [rawData, filterMode, selectedMonth, selectedYear])

  // Custom node rendering
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isHovered = hoverNode?.id === node.id
    const isSelected = clickNode?.id === node.id
    const isRelated = clickNode && graphData.links.some(l => (l.source === clickNode.id && l.target === node.id) || (l.target === clickNode.id && l.source === node.id))
    
    const size = node.val * 4
    
    // Dim nodes if something is selected and this isn't it or related
    const dim = clickNode && !isSelected && !isRelated
    
    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
    ctx.fillStyle = dim ? '#475569' : node.color
    ctx.fill()
    
    if (isSelected || isHovered) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }
    
    if (globalScale > 2) {
      ctx.font = `${4}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = dim ? '#94a3b8' : '#ffffff'
      ctx.fillText(node.label.substring(0, 15) + (node.label.length > 15 ? '...' : ''), node.x, node.y + size + 3)
    }
  }, [hoverNode, clickNode, graphData])

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = clickNode && (link.source.id === clickNode.id || link.target.id === clickNode.id)
    const dim = clickNode && !isSelected
    
    ctx.beginPath()
    ctx.moveTo(link.source.x, link.source.y)
    ctx.lineTo(link.target.x, link.target.y)
    ctx.strokeStyle = isSelected ? '#ffffff' : dim ? 'rgba(71, 85, 105, 0.1)' : 'rgba(148, 163, 184, 0.3)'
    ctx.lineWidth = isSelected ? 2 / globalScale : 1 / globalScale
    ctx.stroke()
  }, [clickNode])

  const handleNodeClick = useCallback((node: any) => {
    setClickNode(node)
    // Center node
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(3, 1000)
    }
  }, [])

  const fitGraph = () => {
    if (fgRef.current) fgRef.current.zoomToFit(1000, 50)
    setClickNode(null)
  }

  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Generate dropdown options
  const months = Array.from({length: 12}).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().substring(0, 7)
  })
  
  const years = Array.from({length: 5}).map((_, i) => (new Date().getFullYear() - i).toString())

  if (loading) return <div className="h-[500px] w-full flex items-center justify-center bg-card rounded-2xl border border-border"><div className="animate-spin w-8 h-8 border-b-2 border-primary rounded-full"></div></div>

  return (
    <div className="h-[500px] w-full bg-card rounded-2xl border border-border flex flex-col relative overflow-hidden group">
      {/* Header / Filters */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-card/90 to-transparent pointer-events-none">
        <h3 className="font-bold text-lg flex items-center gap-2 pointer-events-auto">
          <Activity size={18} className="text-primary" /> Knowledge Graph
        </h3>
        
        <div className="flex gap-2 bg-background/80 backdrop-blur border border-border rounded-lg p-1 pointer-events-auto shadow-sm">
          <button 
            onClick={() => { setFilterMode('Today'); fitGraph(); }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${filterMode === 'Today' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'}`}
          >
            Today
          </button>
          
          <div className="relative flex">
            <button 
              onClick={() => { setFilterMode('Month'); fitGraph(); }}
              className={`px-3 py-1 text-sm font-medium rounded-l-md border-r border-border transition-colors ${filterMode === 'Month' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'}`}
            >
              {filterMode === 'Month' ? new Date(selectedMonth + '-01').toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Month'}
            </button>
            <select 
              value={selectedMonth} 
              onChange={e => { setSelectedMonth(e.target.value); setFilterMode('Month'); fitGraph(); }}
              className={`w-6 opacity-0 absolute inset-0 cursor-pointer ${filterMode === 'Month' ? 'z-20' : 'hidden'}`}
            >
              {months.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString([], { month: 'short', year: 'numeric' })}</option>)}
            </select>
            <div className={`flex items-center justify-center px-1 rounded-r-md ${filterMode === 'Month' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
              <Filter size={12} />
            </div>
          </div>
          
          <div className="relative flex">
            <button 
              onClick={() => { setFilterMode('Year'); fitGraph(); }}
              className={`px-3 py-1 text-sm font-medium rounded-l-md border-r border-border transition-colors ${filterMode === 'Year' ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-accent'}`}
            >
              {filterMode === 'Year' ? selectedYear : 'Year'}
            </button>
            <select 
              value={selectedYear} 
              onChange={e => { setSelectedYear(e.target.value); setFilterMode('Year'); fitGraph(); }}
              className={`w-6 opacity-0 absolute inset-0 cursor-pointer ${filterMode === 'Year' ? 'z-20' : 'hidden'}`}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className={`flex items-center justify-center px-1 rounded-r-md ${filterMode === 'Year' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
              <Filter size={12} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={fitGraph} className="absolute bottom-4 left-4 z-10 p-2 bg-background border border-border rounded-lg shadow-sm hover:bg-accent transition-colors" title="Fit Graph">
        <Maximize size={18} />
      </button>

      {/* Graph Area */}
      <div className="flex-1 w-full bg-[#0f172a] dark:bg-[#020817]" ref={containerRef}>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="label"
            nodeRelSize={4}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            linkCanvasObject={paintLink}
            onNodeHover={node => setHoverNode(node as GraphNode | null)}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setClickNode(null)}
            d3AlphaDecay={0.05}
            d3VelocityDecay={0.3}
            cooldownTicks={100}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-card">
            <div className="w-32 h-32 mb-6 opacity-20"><Activity className="w-full h-full" /></div>
            <p className="text-muted-foreground max-w-md text-center mb-6">
              Your Personal Knowledge Graph will grow as you create goals, records, journals, habits, skills, and more.
            </p>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow-sm hover:scale-105 transition-transform">
              + Create First Record
            </button>
          </div>
        )}

        {/* Legend Overlay */}
        {graphData.nodes.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur border border-border p-3 rounded-xl shadow-lg pointer-events-none z-10 flex flex-col gap-1.5 min-w-[120px]">
            <span className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Legend</span>
            {Array.from(new Set(graphData.nodes.map(n => n.category))).sort().map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#ffffff' }} />
                <span className="text-xs font-medium text-foreground">{cat}</span>
              </div>
            ))}
          </div>
        )}

        {/* Help Overlay */}
        {graphData.nodes.length > 0 && (
          <div className="absolute bottom-4 left-16 bg-background/50 backdrop-blur border border-border px-3 py-1.5 rounded-full shadow-sm pointer-events-none z-10">
            <span className="text-xs font-medium text-slate-300">Scroll to zoom • Drag canvas to pan • Click node for details</span>
          </div>
        )}
      </div>

      {/* Hover Tooltip (HTML overlay for rich formatting) */}
      {hoverNode && !clickNode && (
        <div 
          className="absolute z-20 bg-card border border-border p-3 rounded-xl shadow-xl pointer-events-none w-64 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: 80, left: 24 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hoverNode.color }} />
            <span className="text-xs font-bold text-muted-foreground uppercase">{hoverNode.category}</span>
          </div>
          <h4 className="font-bold text-base line-clamp-2 leading-tight">{hoverNode.label}</h4>
          {hoverNode.details && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{hoverNode.details}</p>}
          <div className="text-[10px] text-muted-foreground mt-3 flex justify-between">
            <span>{new Date(hoverNode.createdAt).toLocaleDateString()}</span>
            <span>{graphData.links.filter(l => l.source === hoverNode || l.target === hoverNode || l.source.id === hoverNode.id || l.target.id === hoverNode.id).length} connections</span>
          </div>
        </div>
      )}

      {/* Side Panel (Click) */}
      {clickNode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-30 flex flex-col animate-in slide-in-from-right-8 duration-300">
          <div className="p-4 border-b border-border flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: clickNode.color }} />
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: clickNode.color }}>{clickNode.category}</span>
            </div>
            <button onClick={() => setClickNode(null)} className="p-1 hover:bg-accent rounded-md"><X size={16} /></button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{clickNode.label}</h2>
            {clickNode.details && (
              <p className="text-sm text-muted-foreground mb-6 bg-accent/30 p-3 rounded-lg border border-border">{clickNode.details}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-xs mb-8">
              <div>
                <span className="text-muted-foreground block mb-1">Created</span>
                <span className="font-medium">{new Date(clickNode.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Last Updated</span>
                <span className="font-medium">{new Date(clickNode.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <h3 className="font-bold text-sm mb-3">Connections</h3>
            <div className="space-y-2">
              {graphData.links
                .filter(l => l.source.id === clickNode.id || l.target.id === clickNode.id)
                .map((l, i) => {
                  const relatedNode = l.source.id === clickNode.id ? l.target : l.source
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer border border-transparent hover:border-border transition-colors">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: relatedNode.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground leading-none mb-1">{l.label || 'Related'}</div>
                        <div className="text-sm font-medium truncate">{relatedNode.label}</div>
                      </div>
                    </div>
                  )
              })}
            </div>
          </div>
          
          <div className="p-4 border-t border-border bg-accent/20">
            <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg font-bold hover:opacity-90">
              Open Details <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
