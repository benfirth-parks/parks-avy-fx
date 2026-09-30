# Parks Avy FX Tool

Avalanche forecast workbench for Banff / Yoho / Kootenay Visitor Safety — a like-for-like replacement for AVID.

**Stack:** React 18, esbuild, MapLibre GL (OpenTopoMap raster tiles, no API key), plain CSS styled to match AVID's Ant Design look. Shared team storage is a single Netlify Function (`netlify/functions/state.mjs`) backed by Netlify Blobs — no external account or keys. The client (`src/sync.js`) saves a moment after each change, polls every 15 s, merges newest-edit-wins per forecast, and keeps a `localStorage` copy for offline use.

## Run locally
```
npm install
npm run dev        # serves http://localhost:8000 with rebuild on save
npm run build      # writes dist/
```

## Deploy
`netlify.toml` builds with `npm run build`, publishes `dist/`, and serves the function at `/api/state`. Link this repo to the `parks-avy-fx` site in the PCVS Netlify team; every push to `main` then deploys. Netlify Blobs needs no setup.

## Where things are
| File | What |
|---|---|
| `src/store.js` | Data model, seed forecast, mutations, merge rules, publish / clone / expiry / progress logic |
| `src/sync.js` | Shared-document sync with the Netlify function (versioned PUT, conflict merge, polling) |
| `netlify/functions/state.mjs` | GET/PUT of the shared document in Netlify Blobs, with version history |
| `netlify/functions/feed.mjs` | Public read-only feed of unexpired Live forecasts: `/.netlify/functions/feed?format=json\|rss\|sms&lang=en\|fr` |
| `src/content.js` | Standard statement libraries (confidence, danger scale) and French UI strings |
| `src/polygons.js` | **Placeholder** forecast polygons (hand-drafted). Replace with the real BYK GeoJSON |
| `src/MapView.jsx` | MapLibre map: polygon fills by forecast colour, click-to-toggle and lasso select in setup mode |
| `src/ForecastsPage.jsx` | Draft / Completed / Live list, detail drawer, Edit Forecast Setup |
| `src/Editor.jsx` | Content editor: sidebar sections, four cards, danger ratings, confidence, media, communications, review |
| `src/ProblemModal.jsx` | New / edit avalanche problem, rose, likelihood chart, terrain & travel advice |
| `src/RichText.jsx` | Bilingual rich-text fields with character counts and Translation Required flags |
| `src/Preview.jsx` | Public forecast page |
| `src/OtherPages.jsx` | Weak Layers, Documentation, Archive |

## Not yet wired
- Per-person login (site relies on Netlify team access; the avatar menu records who is editing)
- Machine translation (the Translate button is a stub)
- Sending SMS (the text is published by the feed function; a texting service still needs to poll it)
- Real BYK forecast polygons (see `src/polygons.js`)
