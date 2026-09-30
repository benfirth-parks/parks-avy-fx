// Client side of per-person accounts (netlify/functions/auth.mjs).
// phase: checking → signedIn | signedOut | local
//   local     = no API on this host (opened from a file / sandboxed preview): old per-browser identity picker
//   signedOut = show the sign-in (or first-admin setup) screen
//   signedIn  = app + shared sync; `offline` is set when we are running on the cached session
import { useSyncExternalStore } from "react";
import { setUser, setTeam, startSync, clearLocalData } from "./store.js";

const API = "/.netlify/functions/auth";
const CACHE = "parks-avy-fx:session";

let s = { phase: "checking", user: null, needsSetup: false, setupAvailable: false, team: [], users: [], offline: false, error: "" };
const listeners = new Set();
const set = (patch) => { s = { ...s, ...patch }; listeners.forEach((l) => l()); };
export const useAuth = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => s);
export const authState = () => s;

const cached = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "null"); } catch { return null; } };
const cache = (u) => { try { u ? localStorage.setItem(CACHE, JSON.stringify(u)) : localStorage.removeItem(CACHE); } catch {} };

function signedIn(user, extra = {}) {
  cache(user);
  setUser(user.name);
  if (extra.team) setTeam(extra.team);
  set({ phase: "signedIn", user, error: "", ...extra });
  startSync({ onUnauthorized: expired }); // first call starts sync; later calls resume it after a 401
}

async function call(method, body) {
  const r = await fetch(API, { method, cache: "no-store", credentials: "same-origin", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch { throw Object.assign(new Error("no api"), { noApi: true }); }
  if (!r.ok) throw Object.assign(new Error(data?.error || `Error ${r.status}`), { status: r.status });
  return data;
}

export async function boot() {
  if (!/^https?:/.test(location.protocol)) return goLocal();
  try {
    const d = await call("GET");
    if (!d || !("needsSetup" in d)) return goLocal();
    if (d.user) signedIn(d.user, { needsSetup: false, team: d.team || [], users: d.users || [], offline: false });
    else { cache(null); set({ phase: "signedOut", needsSetup: d.needsSetup, setupAvailable: !!d.setupAvailable, user: null }); }
  } catch (e) {
    if (e.noApi || e.status === 404) return goLocal();
    // Server unreachable: carry on with the last session on this device (changes are kept locally).
    const u = cached();
    if (u) signedIn(u, { offline: true });
    else set({ phase: "signedOut", error: "Can't reach the server. Check the connection and try again." });
  }
}
function goLocal() {
  set({ phase: "local" });
  startSync({});
}

// A request came back 401 (session ended elsewhere or expired).
function expired() {
  cache(null);
  set({ phase: "signedOut", user: null, needsSetup: false, error: "Your session ended. Sign in again." });
}

export async function login(username, password) {
  const d = await call("POST", { action: "login", username, password });
  await boot(); // pick up team / admin listing with the new cookie
  return d;
}
export async function setupFirstAdmin(code, name, username, password) {
  await call("POST", { action: "setup", code, name, username, password });
  await boot();
}
export async function logout() {
  try { await call("POST", { action: "logout" }); } catch {}
  cache(null);
  clearLocalData();
  location.hash = "#/forecasts";
  location.reload();
}
export const changePassword = (current, password) => call("POST", { action: "change-password", current, password });
export async function admin(action, fields) {
  const d = await call("POST", { action, ...fields });
  if (d.team) setTeam(d.team);
  set({ users: d.users || s.users, team: d.team || s.team });
  return d;
}
