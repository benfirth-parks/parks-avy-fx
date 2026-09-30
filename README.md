# Parks Avy FX Tool

Avalanche forecast workbench for Banff / Yoho / Kootenay Visitor Safety — a like-for-like replacement for AVID.

**Stack:** React 18, esbuild, MapLibre GL (OpenTopoMap raster tiles, no API key), plain CSS styled to match AVID's Ant Design look. No backend yet: state lives in `localStorage` behind `src/store.js`, which is the one file to swap for Supabase.

## Run locally
```
npm install
npm run dev        # serves http://localhost:8000 with rebuild on save
npm run build      # writes dist/
```

## Deploy
`netlify.toml` is set up for a Netlify site building from this repo (`npm run build`, publish `dist`). Connect the repo to the `parks-avy-fx` site in the PCVS team, or deploy `dist/` by hand.

## Where things are
| File | What |
|---|---|
| `src/store.js` | Data model, seed forecast, localStorage persistence, publish / clone / progress logic |
| `src/polygons.js` | **Placeholder** forecast polygons (hand-drafted). Replace with the real BYK GeoJSON |
| `src/MapView.jsx` | MapLibre map: polygon fills by forecast colour, click-to-toggle in setup mode |
| `src/ForecastsPage.jsx` | Draft / Completed / Live list, detail drawer, Edit Forecast Setup |
| `src/Editor.jsx` | Content editor: sidebar sections, four cards, danger ratings, confidence, media, communications, review |
| `src/ProblemModal.jsx` | New / edit avalanche problem, rose, likelihood chart, terrain & travel advice |
| `src/RichText.jsx` | Bilingual rich-text fields with character counts and Translation Required flags |
| `src/Preview.jsx` | Public forecast page |
| `src/OtherPages.jsx` | Weak Layers, Documentation, Archive |

## Not yet wired
- Persistence to a shared database (Supabase) and per-forecaster login
- Machine translation (the Translate button is a stub)
- Lasso polygon selection (single-click toggling works)
- SMS / feed publishing endpoints
