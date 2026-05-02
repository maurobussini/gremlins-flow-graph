# Gremlins Flow Graph

Interactive graph visualizer for JSON flows. Transform your JSON files into visual diagrams to better understand your flow structure and dependencies.

![Preview](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)

## Features

- **Interactive Visualization**: Force-directed graph with zoom and pan
- **Drag & Drop**: Drop JSON files directly to load them
- **Dual Input Mode**: Paste JSON or load a file
- **Built-in Default Data**: Example included to get started immediately
- **Professional Design**: Modern interface built with Tailwind CSS

## Demo

View the live application on GitHub Pages:  
https://maurobussini.github.io/gremlins-flow-graph/

## Usage

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### JSON Input

The application accepts JSON files with the following structure:

```json
{
  "title": "Flow Name",
  "steps": [
    {
      "key": "step1",
      "description": "Step description",
      "type": "http",
      "http": {
        "method": "GET",
        "url": "https://api.example.com/data"
      }
    },
    {
      "key": "step2",
      "type": "http",
      "http": {
        "method": "POST",
        "url": "https://api.example.com/process",
        "body": {
          "input": "{{step1.response.data}}"
        }
      }
    }
  ]
}
```

### Supported Fields per Step

| Field | Description |
|-------|-------------|
| `key` | Unique step identifier |
| `description` | Optional description |
| `type` | Step type (http, data, delay, etc.) |
| `data` | Static data |
| `http` | HTTP request configuration |
| `inputs` | Inputs with references to other steps `{{stepKey.property}}` |
| `condition` | Boolean condition |
| `delay` | Delay in milliseconds |

## Graph Legend

- **Blue nodes**: HTTP type steps
- **Gray nodes**: Other step types (data, delay, etc.)
- **Black links**: Sequential flow (array order)
- **Red links**: Dependencies (references to previous steps)

## Tech Stack

- React 19
- TypeScript
- Vite
- react-force-graph-2d
- Tailwind CSS
- Shadcn/UI

## Production Build

```bash
npm run build
```

Built files are in the `dist/` folder.

## License

MIT