import { useEffect, useState, useRef } from 'react'
import ForceGraph from 'force-graph'

interface Step {
  key: string
  description?: string
  type: string
  data?: Record<string, unknown>
  http?: {
    method: string
    url: string
    body?: unknown
    expectedStatusCodes?: number[]
  }
  inputs?: Record<string, unknown>
  condition?: string
  delay?: number
}

interface FlowData {
  title: string
  steps: Step[]
}

interface GraphNode {
  id: string
  name: string
  type: string
  description?: string
}

interface GraphLink {
  source: string
  target: string
  isPrimary: boolean
}

function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [flowData, setFlowData] = useState<FlowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jsonInput, setJsonInput] = useState('')
  const [showDialog, setShowDialog] = useState(true)

  const handleLoadJson = () => {
    try {
      const parsed = JSON.parse(jsonInput) as FlowData
      if (!parsed.title || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid format: must have "title" and "steps" array')
      }
      setFlowData(parsed)
      setShowDialog(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const handleLoadSample = () => {
    fetch('/data/sample01.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load sample data')
        return res.json()
      })
      .then(data => {
        setFlowData(data)
        setJsonInput(JSON.stringify(data, null, 2))
        setShowDialog(false)
        setError(null)
      })
      .catch(err => setError(err.message))
  }

  const handleReset = () => {
    setShowDialog(true)
    setFlowData(null)
    if (graphRef.current) {
      graphRef.current._d3Graph = null
    }
  }

  useEffect(() => {
    if (!flowData || !containerRef.current || graphRef.current) return

    const nodes: GraphNode[] = flowData.steps.map(step => ({
      id: step.key,
      name: step.key,
      type: step.type,
      description: step.description
    }))

    const links: GraphLink[] = []

    // Primary links (sequential - black)
    for (let i = 0; i < flowData.steps.length - 1; i++) {
      links.push({
        source: flowData.steps[i].key,
        target: flowData.steps[i + 1].key,
        isPrimary: true
      })
    }

    // Secondary links (dependencies - red)
    const stepKeys = new Set(flowData.steps.map(s => s.key))
    flowData.steps.forEach(step => {
      const allFields = [
        step.http?.url,
        JSON.stringify(step.http?.body),
        step.condition,
        ...Object.values(step.inputs || {}).map(v => JSON.stringify(v))
      ]

      allFields.forEach(field => {
        if (typeof field !== 'string') return

        const matches = field.match(/\{\{(\w+)\./g)
        if (matches) {
          matches.forEach(match => {
            const depKey = match.slice(2, -1) // remove {{ and .
            if (stepKeys.has(depKey) && depKey !== step.key) {
              // Avoid duplicate links
              const exists = links.some(
                l => l.source === depKey && l.target === step.key && !l.isPrimary
              )
              if (!exists) {
                links.push({
                  source: depKey,
                  target: step.key,
                  isPrimary: false
                })
              }
            }
          })
        }
      })
    })

    const graph = new ForceGraph(containerRef.current)
    graphRef.current = graph

    graph
      .graphData({ nodes, links })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .nodeLabel((node: any) => `${node.name} (${node.type})`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .nodeColor((node: any) => node.type === 'http' ? '#4a90d9' : '#6b7280')
      .nodeRelSize(6)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .linkColor((link: any) => link.isPrimary ? '#000000' : '#dc2626')
      .linkWidth(2)
      .d3AlphaDecay(0.02)
      .d3VelocityDecay(0.6)

    return () => {
      graphRef.current = null
    }
  }, [flowData])

  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  if (showDialog || !flowData) {
    return (
      <div className="dialog-overlay">
        <div className="dialog">
          <h2>Carica Flow JSON</h2>
          <p>Incolla il contenuto del file JSON per visualizzare il grafo:</p>
          <textarea
            className="json-input"
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder='{"title": "My Flow", "steps": [...]}'
          />
          <div className="dialog-buttons">
            <button onClick={handleLoadJson} className="btn-primary">
              Carica
            </button>
            <button onClick={handleLoadSample} className="btn-secondary">
              Carica Sample
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>{flowData.title}</h1>
        <button onClick={handleReset} className="btn-small">
          Nuovo
        </button>
      </header>
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  )
}

export default App