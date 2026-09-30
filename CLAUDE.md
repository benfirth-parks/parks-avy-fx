# Parks Avy FX Tool

Avalanche forecast workbench for Parks Canada Visitor Safety (Banff / Yoho / Kootenay). It replaces AVID and must keep AVID's look and feel exactly — the reference screenshots live in the Claude project "Parks Avy FX Tool".

## Stack
- React 18 + esbuild, no framework. Plain CSS in `src/styles.css` styled to match AVID (Ant Design look). No UI libraries.
- Map: MapLibre GL (`src/MapView.jsx`) with a WebGL-free fallback (`src/SvgMap.jsx`). Basemap OpenTopoMap (keyless).
- Public feed: `netlify/functions/feed.mjs` (JSON / RSS / SMS text of unexpired Live forecasts, EN/FR). Functions are called at their default `/.netlify/functions/<name>` path — a custom `config.path` returned 404 here.
- Storage: Netlify Function `netlify/functions/state.mjs` + Netlify Blobs; client sync in `src/sync.js`; localStorage cache. Data model, mutations and merge rules in `src/store.js`.
- Deploy: Netlify site `parks-avy-fx` (PCVS team) builds from `main` via `netlify.toml`. Every push to main deploys.

## Conventions
- Commit directly to `main`; keep commits small and descriptive.
- Preserve existing UI and behaviour unless a change is asked for.
- Prefer free, keyless data sources. No API keys in the repo.
- `npm run build` must pass before pushing. `npm run dev` serves on :8000 with rebuild on save.
- In-page dialogs (`src/dialog.jsx`) instead of confirm/prompt/alert.
- `src/polygons.js` is placeholder geometry until the real BYK forecast GeoJSON is dropped in (same feature ids/names).
