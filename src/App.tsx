import { useState, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Upload, FileJson, RotateCcw, Network } from 'lucide-react'
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
    },
    {
      "key": "createPostUsingInputs",
      "description": "Create a new post using explicit step inputs and expected status codes",
      "type": "http",
      "inputs": {
        "userId": "{{settings.data.firstNewPostUserId|int}}",
        "title": "{{settings.data.firstNewPostTitle}}",
        "content": "Lorem ipsum dolor sit amet"
      },
      "http": {
        "method": "POST",
        "url": "{{environment.data.apiBaseUrl}}/posts",
        "expectedStatusCodes": [200, 201],
        "body": {
          "userId": "{{$inputs.userId}}",
          "title": "{{$inputs.title}}",
          "body": "{{$inputs.content}}"
        }
      },
      "delay": 2000
    },
    {
      "key": "getPostByEnvironmentVariable",
      "description": "Extract a post using the id provided using an environment variable",
      "inputs": {
        "postId": "{{$env.MY_POST_ID}}"
      },
      "type": "http",
      "http": {
        "method": "GET",
        "url": "{{environment.data.apiBaseUrl}}/posts/{{$inputs.postId}}"
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
  const [flowData, setFlowData] = useState<FlowData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jsonInput, setJsonInput] = useState('')
  const [showDialog, setShowDialog] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

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
        throw new Error('Invalid format: must have "title" and "steps" array')
      }
      loadFlowData(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const handleLoadDefault = () => {
    loadFlowData(defaultFlowData)
  }

  const handleReset = () => {
    setShowDialog(true)
    setFlowData(null)
  }

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

    const links: GraphLink[] = []

    for (let i = 0; i < flowData.steps.length - 1; i++) {
      links.push({
        source: flowData.steps[i].key,
        target: flowData.steps[i + 1].key,
        isPrimary: true
      })
    }

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

    return { nodes, links }
  }, [flowData])

  if (error) return (
    <div className="p-5 text-red-500 bg-red-50 m-5 rounded-md">
      {error}
    </div>
  )

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
            <p className="text-sm text-gray-500 mt-1">Incolla il contenuto del file JSON per visualizzare il grafo, oppure trascina un file .json qui</p>
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
              Carica Default
            </Button>
            <Button onClick={handleLoadJson}>
              <Upload className="w-4 h-4 mr-2" />
              Carica
            </Button>
          </div>
        </div>
        {isDragging && <div className="drop-overlay">Rilascia il file JSON</div>}
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="text-lg font-semibold">{flowData.title}</h1>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Nuovo
        </Button>
      </header>
      <div className="graph-container">
        <ForceGraph2D
          graphData={graphData}
          nodeLabel={(node) => `${(node as GraphNode).name} (${(node as GraphNode).type})`}
          nodeColor={(node) => (node as GraphNode).type === 'http' ? '#4a90d9' : '#6b7280'}
          nodeRelSize={6}
          linkColor={(link) => (link as GraphLink).isPrimary ? '#000000' : '#dc2626'}
          linkWidth={2}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.6}
        />
      </div>
    </div>
  )
}

export default App