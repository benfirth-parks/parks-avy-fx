# Parks Avy FX Tool

Avalanche forecast workbench for Banff / Yoho / Kootenay Visitor Safety — a like-for-like replacement for AVID.

**Stack:** React 18, esbuild, MapLibre GL (OpenTopoMap raster tiles, no API key), plain CSS styled to match AVID's Ant Design look. Shared team storage is a Netlify Function (`netlify/functions/state.mjs`) backed by Netlify Blobs — no external account or keys. Everyone signs in with their own account (also in Blobs). The client (`src/sync.js`) saves a moment after each change, polls every 15 s, merges newest-edit-wins per forecast, and keeps a `localStorage` copy for offline use.

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
| `netlify/lib/auth.mjs` | Accounts, scrypt password hashes, HMAC-signed session cookie (secret auto-generated in Blobs, or `AUTH_SECRET`) |
| `netlify/functions/auth.mjs` | Sign in / out, first-admin setup, change password, admin user management |
| `netlify/functions/translate.mjs` | EN→FR machine translation via MyMemory (free, keyless; cached in Blobs) |
| `netlify/functions/sms.mjs` | Texts a Live forecast's SMS message via Twilio — off until the env vars below are set |
| `netlify/functions/feed.mjs` | Public read-only feed of unexpired Live forecasts: `/.netlify/functions/feed?format=json\|rss\|sms&lang=en\|fr` |
| `src/content.js` | Standard statement libraries (confidence, danger scale) and French UI strings |
| `src/polygons.js` | Placeholder polygons, the active set, and the GeoJSON importer (the real BYK polygons are imported in the app and stored in the shared document) |
| `src/auth.js`, `src/Login.jsx`, `src/AdminPages.jsx` | Session state, sign-in / first-admin screen, Account, Users and Forecast polygons pages |
| `src/translate.js`, `src/sms.js` | Client side of Translate and Send SMS |
| `src/MapView.jsx` | MapLibre map: polygon fills by forecast colour, click-to-toggle and lasso select in setup mode |
| `src/ForecastsPage.jsx` | Draft / Completed / Live list, detail drawer, Edit Forecast Setup |
| `src/Editor.jsx` | Content editor: sidebar sections, four cards, danger ratings, confidence, media, communications, review |
| `src/ProblemModal.jsx` | New / edit avalanche problem, rose, likelihood chart, terrain & travel advice |
| `src/RichText.jsx` | Bilingual rich-text fields with character counts and Translation Required flags |
| `src/Preview.jsx` | Public forecast page |
| `src/OtherPages.jsx` | Weak Layers, Documentation, Archive |

## First run after deploying
1. Open the site: with no accounts yet it asks for the **first admin account**. Create it straight away (until then anyone who opens the site could claim it).
2. Initials menu → **Users**: add the team with temporary passwords; they change them under **Account**.
3. Initials menu → **Forecast polygons**: import the real BYK polygons (GeoJSON, WGS84, a name per polygon). Names matching the placeholders keep their ids.

## Optional Netlify environment variables
| Variable | Effect |
|---|---|
| `MYMEMORY_EMAIL` | Raises the free translation quota from ~5,000 to ~50,000 words/day |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Turn on **Send SMS** (`TWILIO_FROM` = sending number, or a messaging service id `MG…`) |
| `SMS_RECIPIENTS` | Comma-separated numbers, `:fr` suffix for French, e.g. `+14035550101,+14035550102:fr` |
| `AUTH_SECRET` | Session signing secret (otherwise generated and stored in Blobs). Changing it signs everyone out |

## Still manual
- The real BYK polygon file has to be imported once (see above); the repo only ships placeholders.
- Machine translation is a first draft: French stays tagged "Machine translated — review" until edited.
