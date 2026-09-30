import React, { useEffect, useState } from "react";
import { useStore, getUser, setUser, initials, FORECASTERS } from "./store.js";
import { useSyncStatus, syncInfo } from "./sync.js";
import { ask } from "./dialog.jsx";
import { relTime } from "./store.js";
import { ForecastsPage } from "./ForecastsPage.jsx";
import { Editor } from "./Editor.jsx";
import { Preview } from "./Preview.jsx";
import { WeakLayers, Documentation, Archive } from "./OtherPages.jsx";
import { Dialogs } from "./dialog.jsx";
import { useAuth, boot, logout } from "./auth.js";
import { Login } from "./Login.jsx";
import { Account, Users, PolygonsAdmin } from "./AdminPages.jsx";

// State-based router mirrored to the URL hash (hash deep-links may be stripped by some hosts).
let current = (location.hash || "").replace(/^#/, "") || "/forecasts";
const routeListeners = new Set();
export const go = (path) => {
  current = path;
  try { if (location.hash !== "#" + path) history.pushState(null, "", "#" + path); } catch {}
  routeListeners.forEach((l) => l());
};
addEventListener("hashchange", () => { current = (location.hash || "").replace(/^#/, "") || "/forecasts"; routeListeners.forEach((l) => l()); });
export function useRoute() {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((t) => t + 1); routeListeners.add(l); return () => routeListeners.delete(l); }, []);
  const [path, qs = ""] = current.split("?");
  const parts = path.split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { path, parts, query };
}

export function Nav({ active, hideAvatar }) {
  const links = [["Weak Layers", "/weak-layers"], ["Avalanche Forecasts", "/forecasts"], ["Documentation", "/documentation"], ["Archive", "/archive"]];
  const status = useSyncStatus();
  const [open, setOpen] = useState(false);
  useStore(); // re-render on identity change
  const user = getUser();
  const info = syncInfo();
  const auth = useAuth();
  const label = { local: "Local only", saving: "Saving…", saved: "Saved", offline: "Offline · saved locally", conflict: "Sync conflict", auth: "Sign in to sync" }[status];
  const title = status === "saved" && info.lastSyncedAt ? `Shared document v${info.version} · last change ${relTime(info.lastSyncedAt)}${info.lastBy ? " by " + info.lastBy : ""}` : info.lastError ? `${label} — ${info.lastError}` : label;
  const signOut = async () => {
    setOpen(false);
    if (["saving", "offline", "conflict", "auth"].includes(status) && !(await ask({ title: "Sign out", message: "Some changes haven't reached the shared document yet and will be lost from this browser if you sign out now. Sign out anyway?", okLabel: "Sign out", danger: true }))) return;
    logout();
  };
  const nav = (p) => { setOpen(false); go(p); };
  const pick = async (name) => {
    if (name === "__other") {
      const n = await ask({ title: "Sign in as", message: "Your name as it should appear on forecasts", input: "", okLabel: "Continue" });
      if (n && n.trim()) setUser(n.trim());
    } else setUser(name);
    setOpen(false);
  };
  return (
    <div className="nav">
      {links.map(([t, p]) => <a key={t} href={"#" + p} onClick={(e) => { e.preventDefault(); go(p); }} className={"navlink" + (active === t ? " on" : "")}>{t}</a>)}
      {!hideAvatar && (
        <div className="navright">
          <span className={"syncdot " + status} title={title}>{label}</span>
          <button className="avatar" title={user} onClick={() => setOpen(!open)} onBlur={() => setTimeout(() => setOpen(false), 150)}>{initials(user)}</button>
          {open && (
            <div className="menu usermenu">
              <div className="mi muted" style={{ cursor: "default" }}>Signed in as <b style={{ color: "#1f1f1f" }}>{user}</b></div>
              {auth.phase === "signedIn" ? (<>
                <div className="mi" onMouseDown={() => nav("/account")}>Account</div>
                {auth.user?.admin && <div className="mi" onMouseDown={() => nav("/users")}>Users</div>}
                {auth.user?.admin && <div className="mi" onMouseDown={() => nav("/polygons")}>Forecast polygons</div>}
                <div className="mi" onMouseDown={signOut}>Sign out</div>
              </>) : (<>
                {[...new Set([...FORECASTERS, user])].map((n) => <div key={n} className={"mi" + (n === user ? " cur" : "")} onMouseDown={() => pick(n)}>{n}</div>)}
                <div className="mi" onMouseDown={() => pick("__other")}>Someone else…</div>
                <div className="mi" onMouseDown={() => nav("/polygons")}>Forecast polygons</div>
              </>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Screens() {
  const state = useStore();
  const r = useRoute();
  const [root, id, sub, section] = r.parts;
  if (root === "weak-layers") return <><Nav active="Weak Layers" /><WeakLayers /></>;
  if (root === "documentation") return <><Nav active="Documentation" /><Documentation /></>;
  if (root === "archive") return <><Nav active="Archive" /><Archive /></>;
  if (root === "account") return <><Nav active="" /><Account /></>;
  if (root === "users") return <><Nav active="" /><Users /></>;
  if (root === "polygons") return <><Nav active="" /><PolygonsAdmin /></>;
  if (root === "forecasts" && id && sub === "content") {
    const f = state.forecasts.find((x) => x.id === id);
    if (f) return <><Nav active="" /><Editor forecast={f} section={section || "weather"} /></>;
  }
  if (root === "forecasts" && id && sub === "preview") {
    const f = state.forecasts.find((x) => x.id === id);
    if (f) return <Preview forecast={f} />;
  }
  return <><Nav active="Avalanche Forecasts" /><ForecastsPage route={r} /></>;
}

boot();

export default function App() {
  const auth = useAuth();
  if (auth.phase === "checking") return <div className="loginwrap"><div className="muted">Loading…</div></div>;
  if (auth.phase === "signedOut") return <><Login /><Dialogs /></>;
  return <><Screens /><Dialogs /></>;
}
