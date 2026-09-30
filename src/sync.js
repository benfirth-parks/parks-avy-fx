// Sync with the shared team document at /api/state (netlify/functions/state.mjs).
// Offline or unavailable (local file, sandboxed preview) → local-only mode, silently.
import { useSyncExternalStore } from "react";

const API = "/api/state";
let deps = null;
let version = 0;
let status = "local"; // local | saving | saved | offline | conflict
let lastSyncedAt = null;
let lastBy = "";
let timer = null;
let inflight = null;
let dirty = false;
let server = null; // null = unknown, true = reachable, false = no API here (local file, preview host)
const listeners = new Set();
const setStatus = (s) => { status = s; listeners.forEach((l) => l()); };

export function useSyncStatus() {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => status);
}
export const syncInfo = () => ({ status, version, lastSyncedAt, lastBy });

const canSync = () => typeof fetch === "function" && /^https?:/.test(location.protocol);

async function get() {
  const r = await fetch(API, { cache: "no-store" });
  if (!r.ok) throw new Error("GET " + r.status);
  return r.json();
}
async function put(state) {
  const r = await fetch(API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ version, state, by: deps.getUser() }) });
  if (r.status === 409) return { conflict: await r.json() };
  if (!r.ok) throw new Error("PUT " + r.status);
  return r.json();
}

export function start(d) {
  deps = d;
  if (!canSync()) return;
  const tryBoot = () => boot().catch(() => { if (server === null) { server = false; setStatus("local"); } else setStatus("offline"); });
  tryBoot();
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    if (server === false) return tryBoot();
    if (server && !inflight && !dirty) poll().catch(() => setStatus("offline"));
  }, 15_000);
  addEventListener("online", tryBoot);
}

async function boot() {
  const doc = await get();
  if (!doc || typeof doc !== "object" || !("version" in doc)) throw new Error("no api");
  server = true;
  version = doc.version || 0;
  lastSyncedAt = doc.updatedAt || null; lastBy = doc.updatedBy || "";
  const local = deps.getState();
  if (!doc.state) {
    // First run for this site: publish the local (seed) document.
    await save();
    return;
  }
  const merged = deps.merge(local, doc.state);
  deps.replaceState(merged);
  setStatus("saved");
  if (JSON.stringify(merged) !== JSON.stringify(doc.state)) await save();
}

async function poll() {
  const doc = await get();
  if ((doc.version || 0) === version) return;
  version = doc.version; lastSyncedAt = doc.updatedAt; lastBy = doc.updatedBy || "";
  if (doc.state) deps.replaceState(deps.merge(deps.getState(), doc.state));
  setStatus("saved");
}

export function scheduleSave() {
  if (!canSync() || !deps || server !== true) return;
  dirty = true;
  setStatus("saving");
  clearTimeout(timer);
  timer = setTimeout(() => save().catch(() => setStatus("offline")), 700);
}

async function save() {
  if (inflight) { dirty = true; return inflight; }
  dirty = false;
  inflight = (async () => {
    setStatus("saving");
    let res = await put(deps.getState());
    if (res.conflict) {
      // Someone else saved first: merge their document with ours and retry once.
      version = res.conflict.version || 0;
      if (res.conflict.state) deps.replaceState(deps.merge(deps.getState(), res.conflict.state));
      res = await put(deps.getState());
      if (res.conflict) { setStatus("conflict"); return; }
    }
    version = res.version; lastSyncedAt = res.updatedAt; lastBy = deps.getUser();
    setStatus("saved");
  })().finally(() => { inflight = null; if (dirty) scheduleSave(); });
  return inflight;
}
