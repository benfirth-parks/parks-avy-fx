// Shared team document for the Parks Avy FX Tool, stored in Netlify Blobs.
// GET  /api/state            → { version, state, updatedAt, updatedBy }
// PUT  /api/state {version, state} → { version, updatedAt } or 409 with the current document
// Both need a signed-in account (netlify/functions/auth.mjs); the editor's name comes from the session.
import { openStore, currentUser, unauthorized } from "../lib/auth.mjs";


const KEY = "state";
const MAX_BYTES = 5 * 1024 * 1024;

export default async (req) => {
  try {
    return await handle(req);
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
};

async function handle(req) {
  const store = openStore();
  const me = await currentUser(req, store);
  if (!me) return unauthorized();
  if (req.method === "GET") {
    const doc = await store.get(KEY, { type: "json" });
    return json(doc || { version: 0, state: null });
  }
  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body !== "object" || !body.state) return json({ error: "Missing state" }, 400);
    if (JSON.stringify(body.state).length > MAX_BYTES) return json({ error: "Document too large" }, 413);
    const cur = (await store.get(KEY, { type: "json" })) || { version: 0 };
    if ((body.version ?? 0) !== (cur.version ?? 0)) return json(cur, 409);
    const doc = { version: (cur.version ?? 0) + 1, state: body.state, updatedAt: new Date().toISOString(), updatedBy: me.name };
    await store.setJSON(KEY, doc);
    // Keep a short history for recovery.
    try { await store.setJSON(`history/${doc.version}`, doc); } catch {}
    return json({ version: doc.version, updatedAt: doc.updatedAt });
  }
  return new Response("Method not allowed", { status: 405 });
}

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
