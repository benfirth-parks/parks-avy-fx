// Shared team document for the Parks Avy FX Tool, stored in Netlify Blobs.
// GET  /api/state            → { version, state, updatedAt, updatedBy }
// PUT  /api/state {version, state, by} → { version, updatedAt } or 409 with the current document
import { getStore } from "@netlify/blobs";

export const config = { path: "/api/state" };

const KEY = "state";
const MAX_BYTES = 5 * 1024 * 1024;

export default async (req) => {
  const store = getStore({ name: "parks-avy-fx", consistency: "strong" });
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
    const doc = { version: (cur.version ?? 0) + 1, state: body.state, updatedAt: new Date().toISOString(), updatedBy: String(body.by || "").slice(0, 80) };
    await store.setJSON(KEY, doc);
    // Keep a short history for recovery.
    await store.setJSON(`history/${doc.version}`, doc).catch(() => {});
    return json({ version: doc.version, updatedAt: doc.updatedAt });
  }
  return new Response("Method not allowed", { status: 405 });
};

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
