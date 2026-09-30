import React, { useEffect, useState } from "react";
import { useStore, getState } from "./store.js";
import { ForecastsPage } from "./ForecastsPage.jsx";
import { Editor } from "./Editor.jsx";
import { Preview } from "./Preview.jsx";
import { WeakLayers, Documentation, Archive } from "./OtherPages.jsx";
import { Dialogs } from "./dialog.jsx";

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
  return (
    <div className="nav">
      {links.map(([t, p]) => <a key={t} href={"#" + p} onClick={(e) => { e.preventDefault(); go(p); }} className={"navlink" + (active === t ? " on" : "")}>{t}</a>)}
      {!hideAvatar && <div className="avatar" title="Ben Firth">BE</div>}
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

export default function App() {
  return <><Screens /><Dialogs /></>;
}
