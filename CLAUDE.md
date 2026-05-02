# Gremlins Flow Graph

Visualizzatore di grafi per flow JSON interattivo.

## Stack Tecnologico

- **Vite 6** + **React 19** + **TypeScript**
- **react-force-graph-2d** per la visualizzazione del grafo
- **Tailwind CSS v4** per lo styling
- **Shadcn/UI** per i componenti (Button, Textarea)
- **Lucide React** per le icone

## Struttura del Progetto

```
├── .github/workflows/     # GitHub Actions per CI/CD
├── public/data/           # File JSON statici (es. sample01.json)
├── src/
│   ├── components/ui/     # Componenti Shadcn (Button, Textarea)
│   ├── lib/               # Utility (utils.ts per cn())
│   ├── App.tsx            # Componente principale con logica grafo
│   ├── main.tsx           # Entry point React
│   └── index.css          # Stili Tailwind
├── index.html             # HTML entry
├── package.json            # Dipendenze
├── tsconfig.json          # Config TypeScript
└── vite.config.ts         # Config Vite (include Tailwind e base path per GitHub Pages)
```

## Comandi

- `npm install` - Installa dipendenze
- `npm run dev` - Avvia server di sviluppo (http://localhost:5173)
- `npm run build` - Build produzione (in `dist/`)
- `npm run preview` - Preview build locale

## Funzionalità Attuali

1. **Dialog di caricamento** - All'avvio appare una dialog per:
   - Incollare JSON manualmente
   - Trascinare file .json (drag & drop)
   - Caricare i dati di default (embedded nel codice)

2. **Visualizzazione grafo** - Force-directed graph con:
   - Nodi blu per type: http, grigio per gli altri
   - Link neri (primari/sequenziali)
   - Link rossi (secondari/dependencies)

3. **Header** - Contiene titolo flow e pulsante "Nuovo" per ricaricare

## Formato JSON in Input

```json
{
  "title": "Nome Flow",
  "steps": [
    {
      "key": "stepKey",
      "description": "Descrizione opzionale",
      "type": "http|data|...",
      "data": {},
      "http": { "method": "GET", "url": "..." },
      "inputs": { "key": "{{prevStep.property}}" }
    }
  ]
}
```

## GitHub Pages

- URL: https://maurobussini.github.io/gremlins-flow-graph/
- Workflow: `.github/workflows/static.yml`
- Build: `npm run build` con `GITHUB_PAGES=true`
- Base path in vite.config.ts: `/gremlins-flow-graph/`

## Note Importanti

- **Dipendenza critica**: `@vitejs/plugin-react` deve essere presente in `devDependencies`
- Il grafo usa fisica force-directed con decay configurato (`d3AlphaDecay: 0.02`, `d3VelocityDecay: 0.6`)
- Il file JSON di default è embedded in `App.tsx` come `defaultFlowData`
- I file JSON statici vanno in `public/data/` per essere serviti come statici