import { useState, useCallback, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Upload, FileJson, RotateCcw, Network, GitBranch, Maximize2 } from 'lucide-react'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'

const defaultFlowData: FlowData = {
  "title": "Sample 01",
  "steps": [
    {
      "key": "environment",
      "description": "Holds settings specific for environment",
      "type": "data",
      "data": {
        "apiBaseUrl": "https://jsonplaceholder.typicode.com/"
      }
    },
    {
      "key": "settings",
      "description": "Holds settings specific for current flow",
      "type": "data",
      "data": {
        "firstNewPostUserId": 1,
        "firstNewPostTitle": "This is a new post title"
      }
    },
    {
      "key": "getAllPosts",
      "description": "Extract all posts using an enviroment setting",
      "type": "http",
      "http": {
        "method": "GET",
        "url": "{{environment.data.apiBaseUrl}}/posts"
      }
    },
    {
      "key": "getFirstPost",
      "description": "Extract first post of the previous step list (if previous is success)",
      "type": "http",
      "http": {
        "method": "GET",
        "url": "{{environment.data.apiBaseUrl}}/posts/{{getAllPosts.http.body[0].id}}"
      },
      "condition": "{{getAllPosts.http.statusCode}} == 200"
    },
    {
      "key": "createPost",
      "description": "Create a new post using data received by flow settings",
      "type": "http",
      "http": {
        "method": "POST",
        "url": "{{environment.data.apiBaseUrl}}/posts",
        "expectedStatusCodes": [200, 201],
        "body": {
          "title": "{{settings.data.firstNewPostTitle}}"
        }
      }
    }
  ]
}

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
  source: string | GraphNode
  target: string | GraphNode
  isPrimary: boolean
}

function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null)
  const [flowData, setFlowData] = useState<FlowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jsonInput, setJsonInput] = useState('')
  const [showDialog, setShowDialog] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [showDeps, setShowDeps] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const loadFlowData = useCallback((data: FlowData) => {
    setFlowData(data)
    setJsonInput(JSON.stringify(data, null, 2))
    setShowDialog(false)
    setError(null)
  }, [])

  const handleLoadJson = () => {
    try {
      const parsed = JSON.parse(jsonInput) as FlowData
      if (!parsed.title || !Array.isArray(parsed.steps)) {
        setError('Invalid format: must have "title" and "steps" array')
        return
      }
      loadFlowData(parsed)
    } catch (err) {
      setError('Invalid JSON: please check the syntax')
    }
  }

  const handleLoadDefault = () => {
    setError(null)
    loadFlowData(defaultFlowData)
  }

  const handleReset = () => {
    setShowDialog(true)
    setFlowData(null)
    setError(null)
  }

  const handleFitToCanvas = useCallback(() => {
    graphRef.current?.zoomToFit(400, 0.1)
  }, [])

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphRef.current?.zoomToFit(400, 0.3, (n: any) => n.id === node.id)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/json') {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as FlowData
          if (!parsed.title || !Array.isArray(parsed.steps)) {
            throw new Error('Invalid format: must have "title" and "steps" array')
          }
          loadFlowData(parsed)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid JSON file')
        }
      }
      reader.readAsText(file)
    } else {
      setError('Please drop a JSON file')
    }
  }

  const graphData = useMemo(() => {
    if (!flowData) return { nodes: [], links: [] }

    const nodes: GraphNode[] = flowData.steps.map(step => ({
      id: step.key,
      name: step.key,
      type: step.type,
      description: step.description
    }))

    // Only sequential links (primary)
    const links: GraphLink[] = []
    for (let i = 0; i < flowData.steps.length - 1; i++) {
      links.push({
        source: flowData.steps[i].key,
        target: flowData.steps[i + 1].key,
        isPrimary: true
      })
    }

    // Add interpolation links if enabled
    if (showDeps) {
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
              const depKey = match.slice(2, -1)
              if (stepKeys.has(depKey) && depKey !== step.key) {
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
    }

    return { nodes, links }
  }, [flowData, showDeps])

  if (error) return (
    <div className="p-5 text-red-500 bg-red-50 m-5 rounded-md">
      {error}
    </div>
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (showDialog || !flowData) {
    return (
      <div
        className={`dialog-overlay ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="dialog">
          <div className="dialog-header">
            <div className="dialog-logo">
              <Network className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">Gremlins Flow Graph</h2>
            <p className="text-sm text-gray-500 mt-1">Paste your JSON content to visualize the flow, or drag and drop a .json file here</p>
          </div>
          <div className="dialog-content">
            <Textarea
              className="json-input font-mono text-sm"
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder='{"title": "My Flow", "steps": [...]}'
            />
          </div>
          <div className="dialog-footer">
            <Button variant="outline" onClick={handleLoadDefault}>
              <FileJson className="w-4 h-4 mr-2" />
              Load Default
            </Button>
            <Button onClick={handleLoadJson}>
              <Upload className="w-4 h-4 mr-2" />
              Load
            </Button>
          </div>
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>
        {isDragging && <div className="drop-overlay">Drop JSON file here</div>}
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="text-lg font-semibold">{flowData.title}</h1>
        <div className="flex gap-2">
          <Button
            variant={showDeps ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDeps(!showDeps)}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            {showDeps ? "Deps" : "Deps"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToCanvas}>
            <Maximize2 className="w-4 h-4 mr-2" />
            Fit
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
      </header>
      <div className="graph-container">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={(node) => `${(node as GraphNode).name} (${(node as GraphNode).type})`}
          nodeAutoColorBy="type"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name
            const fontSize = 12/globalScale
            ctx.font = `${fontSize}px Sans-Serif`
            const textWidth = ctx.measureText(label).width
            const bckgWidth = textWidth + fontSize * 0.2
            const bckgHeight = fontSize + fontSize * 0.2

            const isSelected = node.id === selectedNode
            ctx.fillStyle = isSelected ? '#fef08a' : 'rgba(255, 255, 255, 0.8)'
            ctx.fillRect(node.x - bckgWidth / 2, node.y - bckgHeight / 2, bckgWidth, bckgHeight)

            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = node.color
            ctx.fillText(label, node.x, node.y)

            node.__bckgDimensions = [bckgWidth, bckgHeight]
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const bckgDimensions = node.__bckgDimensions
            if (bckgDimensions) {
              ctx.fillStyle = color
              ctx.fillRect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1]
              )
            }
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkCanvasObject={(link: any, ctx, globalScale) => {
            const start = link.source
            const end = link.target

            ctx.strokeStyle = link.isPrimary ? '#999' : '#f97316'
            ctx.lineWidth = 1 / globalScale

            if (link.isPrimary) {
              ctx.setLineDash([])
            } else {
              ctx.setLineDash([5, 5])
            }

            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkCanvasObjectMode={() => 'replace'}
          linkColor={(link) => (link as GraphLink).isPrimary ? '#999' : '#f97316'}
          linkWidth={1.5}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkLineDash={(link: any) => !link.isPrimary ? [5, 5] : null}
          linkDirectionalParticles={(link: any) => link.isPrimary ? 0 : 2}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleSpeed={0.01}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.6}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onEngineStop={() => graphRef.current?.zoomToFit(400, 0.1)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onNodeClick={(node: any) => handleNodeClick(node)}
        />
      </div>
    </div>
  )
}

export default App