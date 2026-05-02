# Gremlins Flow Graph

Visualizzatore di grafi usando un file JSON come input.

## Stack Tecnologico

- **Vite** + **React 19** + **TypeScript**
- **force-graph** per la visualizzazione del grafo

## Struttura del Progetto

```
├── public/data/         # File JSON pubblici (es. sample01.json)
├── src/
│   ├── App.tsx          # Componente principale con logica grafo
│   ├── main.tsx         # Entry point React
│   └── index.css        # Stili base
├── index.html           # HTML entry
├── package.json         # Dipendenze
├── tsconfig.json        # Config TypeScript
└── vite.config.ts       # Config Vite
```

## Comandi

- `npm install` - Installa dipendenze
- `npm run dev` - Avvia server di sviluppo (http://localhost:5173)
- `npm run build` - Build produzione

## Formato JSON in Input

```json
{
  "title": "Nome Flow",
  "steps": [
    {
      "key": "stepKey",
      "description": "Descrizione opzionale",
      "type": "http|delay|...",
      "data": {},
      "http": { "method": "GET", "url": "..." },
      "inputs": { "key": "{{prevStep.property}}" }
    }
  ]
}
```

## Logica di Visualizzazione

- **Nodi**: Ogni step del flow diventa un nodo nel grafo
- **Link Primari (neri)**: Connessione sequenziale tra step consecutivi (ordine nell'array)
- **Link Secondari (rossi)**: Dipendenze da interpolazioni `{{stepKey.property}}` - tracciano quali step consumano dati da step precedenti
- **Colori nodi**: Blu per `type: http`, grigio per gli altri tipi

## Note Importanti

- **Dipendenza critica**: `@vitejs/plugin-react` deve essere presente in `devDependencies`
- Il file consigliato per test è `sample01.json` (presente in `public/data/`)
- Il grafo usa fisica force-directed con decay configurato (`d3AlphaDecay: 0.02`, `d3VelocityDecay: 0.6`)
- I file JSON vanno messi in `public/data/` per essere serviti come statici