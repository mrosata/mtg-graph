# mtg-graph

An MTG card interaction graph — a build-time pipeline that ingests one Standard set from Scryfall and emits a JSON artifact, plus a React + Vite web app that browses it, surfaces card interactions, and builds decks. No backend.

## Setup

```bash
git clone <this-repo>
cd mtg-graph
npm install
cd app && npm install && cd ..
```

## Build the card artifact

```bash
npm run build:cards -- --set <SET_CODE>
# e.g. npm run build:cards -- --set tdm
```

This writes `app/public/data/cards-<SET_CODE>.json`. Set the corresponding env var in `app/.env.local`:

```
VITE_SET_CODE=tdm
```

## Run the web app

```bash
cd app
npm run dev
```

Open `http://localhost:5173`.

## Tests

- Pipeline + shared types: `npm test` (from repo root)
- Web app units + components: `cd app && npm test`
- Web app e2e smoke: `cd app && npm run e2e`

## Architecture

- `pipeline/` — Node + TS data pipeline. Fetches Scryfall, normalizes oracle text, applies regex rules, builds the interaction graph, emits a JSON artifact.
- `shared/` — Types shared by pipeline and web app (Card, Edge, TagDef, Artifact).
- `app/` — React + TS + Vite SPA. Loads the artifact, hydrates an in-memory graph, serves browsing, filtering, interactions, and deck building.

## Roadmap

- **v0.2** — Nova Lite verification of regex tags, tag-inspection admin view, deck text import.
- **v0.3** — Multi-card synergy ranking.
- **v0.4** — More sets (Standard → Modern → Pioneer).
- **v0.5+** — Backend with shared decks and community tags.
