import React, { useState } from "react";
import { useStore, resetDemo, addWeakLayer, updateWeakLayer, deleteWeakLayer, fmtStamp } from "./store.js";
import { syncInfo, useSyncStatus } from "./sync.js";
import { ask } from "./dialog.jsx";
import { go } from "./App.jsx";
import { Icons } from "./icons.jsx";
import { webglAvailable } from "./SvgMap.jsx";

const STATUSES = ["active", "developing", "dormant"];
const GRAINS = ["Surface Hoar", "Facets", "Depth Hoar", "Crust", "Crust/Facet", "Decomposing & Fragmented", "Rounded Grains", "Precipitation Particles", "Melt-Freeze Crust", "Mixed Forms"];

export function WeakLayers() {
  const { weakLayers } = useStore();
  const [draft, setDraft] = useState({ name: "", grain: "", buried: "", status: "developing", notes: "" });
  const [editing, setEditing] = useState(null);
  const add = () => {
    if (!draft.name.trim()) return;
    addWeakLayer({ ...draft, name: draft.name.trim() });
    setDraft({ name: "", grain: "", buried: "", status: "developing", notes: "" });
  };
  const sorted = [...weakLayers].sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (b.buried || "").localeCompare(a.buried || ""));
  return (
    <div className="page">
      <h1>Weak Layers</h1>
      <p className="muted" style={{ marginTop: -8 }}>Layers listed here appear in the Weak Layers dropdown of every avalanche problem, grouped by status.</p>
      <table className="table">
        <thead><tr><th>Name</th><th>Grain type</th><th>Buried</th><th>Status</th><th>Notes</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {sorted.map((w) => editing === w.id ? (
            <tr key={w.id} className="editrow">
              <td><input className="inp" value={w.name} onChange={(e) => updateWeakLayer(w.id, { name: e.target.value })} /></td>
              <td><input className="inp" list="grains" value={w.grain} onChange={(e) => updateWeakLayer(w.id, { grain: e.target.value })} /></td>
              <td><input className="inp" type="date" value={w.buried || ""} onChange={(e) => updateWeakLayer(w.id, { buried: e.target.value })} /></td>
              <td><select className="sel" value={w.status} onChange={(e) => updateWeakLayer(w.id, { status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><input className="inp" value={w.notes || ""} onChange={(e) => updateWeakLayer(w.id, { notes: e.target.value })} /></td>
              <td className="muted">{fmtStamp(w.modified)}</td>
              <td><button className="btn primary" onClick={() => setEditing(null)}>Done</button></td>
            </tr>
          ) : (
            <tr key={w.id}>
              <td>{w.name}</td><td>{w.grain}</td><td>{w.buried || "—"}</td>
              <td><span className={"tag " + w.status}>{w.status}</span></td>
              <td className="muted">{w.notes}</td>
              <td className="muted">{fmtStamp(w.modified)}</td>
              <td className="row" style={{ gap: 6 }}>
                <button className="btn" onClick={() => setEditing(w.id)}>Edit</button>
                <button className="tb" title="Delete" onClick={async () => { if (await ask({ title: "Delete weak layer", message: `Delete "${w.name}"? Problems that reference it keep their text but lose the link.`, okLabel: "Delete", danger: true })) deleteWeakLayer(w.id); }}>{Icons.trash}</button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && <tr><td colSpan="7" className="muted">No weak layers yet.</td></tr>}
        </tbody>
      </table>
      <datalist id="grains">{GRAINS.map((g) => <option key={g} value={g} />)}</datalist>
      <div className="addbox">
        <div className="row" style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label className="lbl req">Name</label><input className="inp" style={{ width: 220 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Feb 14 surface hoar" /></div>
          <div><label className="lbl">Grain type</label><input className="inp" list="grains" style={{ width: 200 }} value={draft.grain} onChange={(e) => setDraft({ ...draft, grain: e.target.value })} placeholder="Surface Hoar" /></div>
          <div><label className="lbl">Buried</label><input className="inp" type="date" style={{ width: 160 }} value={draft.buried} onChange={(e) => setDraft({ ...draft, buried: e.target.value })} /></div>
          <div><label className="lbl">Status</label><select className="sel" style={{ width: 150 }} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div style={{ flex: 1, minWidth: 200 }}><label className="lbl">Notes</label><input className="inp" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
          <button className="btn primary" onClick={add} disabled={!draft.name.trim()}>Add Weak Layer</button>
        </div>
      </div>
    </div>
  );
}

export function Documentation() {
  const status = useSyncStatus();
  const info = syncInfo();
  return (
    <div className="page doc">
      <h1>Documentation</h1>
      <h2>Daily workflow</h2>
      <ol>
        <li><b>Avalanche Forecasts → Draft → Set Up New Forecast.</b> Name it, pick forecaster and colour, set issue and expiry date/time, time zone and day one. Assign polygons by clicking them on the map, or turn on the lasso (top right of the map) and drag around a group; hold <kbd>Shift</kbd> while lassoing to remove. The red chip shows how many polygons are still unassigned. <b>Close Editing</b> when done.</li>
        <li><b>Edit Content.</b> Work through the sidebar sections. Each has four cards: the Nowcast (today, orange) and three forecast days. Toggle cards with the Visible Cards buttons. Tick a section when it is complete; progress is the tick count.</li>
        <li><b>Avalanche Problems.</b> New Avalanche Problem opens the problem form: type, weak layer, distribution, sensitivity, typical size, depth, aspect/elevation rose (click sectors), likelihood chart (click to place), bilingual description and terrain &amp; travel advice statements (tag search). Problems also show under Danger Ratings.</li>
        <li><b>Communications.</b> The headline (280 characters) leads the public page; the SMS message (140) can be copied from it.</li>
        <li><b>Preview</b> renders the public forecast page in English or French.</li>
        <li><b>Publish</b> moves the draft to Live. Any live forecast covering the same polygons moves to Completed (Archive). Live forecasts also move to Completed automatically when they pass their expiry.</li>
        <li><b>Clone to Draft</b> copies a live or completed forecast. Copied text is flagged <span className="tag red">Translation Required</span> until the French side is saved again.</li>
        <li><b>Delete Drafts and Start New Day</b> (Completed or Live view) clears every draft.</li>
      </ol>
      <h2>Translation Required</h2>
      <p>Saving an English field flags its French counterpart; saving the French field clears the flag. The badge is a reminder, not a block on publishing.</p>
      <h2>Who is signed in</h2>
      <p>Click the initials at the top right to pick who you are. New forecasts and edits are recorded under that name. It is remembered per browser.</p>
      <h2>Shared storage</h2>
      <p>Forecasts and weak layers are saved to a shared team document a moment after every change and picked up by everyone else within about fifteen seconds. If two people change the same forecast at once, the later edit wins for that forecast; other forecasts are unaffected. The dot beside the initials shows the state: green saved, amber saving, red offline (changes are kept in this browser and sent when the connection returns).</p>
      <p className="muted">Status now: {status}{info.version ? ` · shared document v${info.version}` : ""}{info.lastBy ? ` · last change by ${info.lastBy}` : ""}</p>
      {info.lastError && <p className="muted" style={{ fontFamily: "monospace", fontSize: 12 }}>Last sync error — {info.lastError}</p>}
      <p className="muted" style={{ fontFamily: "monospace", fontSize: 12 }}>Map library: {typeof window.maplibregl === "object" ? "loaded" : "NOT loaded"} · WebGL: {webglAvailable() ? "yes (MapLibre map)" : "no (basic tile map)"}</p>
      <h2>Known gaps</h2>
      <ul>
        <li>Map polygons are hand-drafted placeholders until the real BYK forecast polygons (GeoJSON) are loaded into <code>src/polygons.js</code>.</li>
        <li>Translate is a stub; a translation service still needs to be chosen.</li>
        <li>No per-person login yet; the site relies on Netlify team access.</li>
      </ul>
      <h2>Demo data</h2>
      <button className="btn danger" onClick={async () => { if (await ask({ title: "Reset demo data", message: "Replace everything with the seed forecast? This also overwrites the shared document for the whole team.", okLabel: "Reset", danger: true })) resetDemo(); }}>Reset demo data</button>
    </div>
  );
}

export function Archive() {
  const { forecasts } = useStore();
  const done = forecasts.filter((f) => f.status === "completed").sort((a, b) => (b.completedAt || b.modified || "").localeCompare(a.completedAt || a.modified || ""));
  return (
    <div className="page">
      <h1>Archive</h1>
      {done.length === 0 ? <div className="empty">No completed forecasts yet. Publishing a new forecast over a live one, or a live forecast passing its expiry, moves it here.</div> : (
        <table className="table"><thead><tr><th>Name</th><th>Forecaster</th><th>Issued</th><th>Expired</th><th>Completed</th><th></th></tr></thead>
          <tbody>{done.map((f) => <tr key={f.id}><td>{f.name}</td><td>{f.forecaster}</td><td>{f.issued} {f.issuedTime}</td><td>{f.expiry} {f.expiryTime}</td><td className="muted">{fmtStamp(f.completedAt || f.modified)}</td><td className="row" style={{ gap: 12 }}><a href={`#/forecasts/${f.id}/preview`} onClick={(e) => { e.preventDefault(); go(`/forecasts/${f.id}/preview`); }}>View</a><a href={`#/forecasts/${f.id}`} onClick={(e) => { e.preventDefault(); go(`/forecasts/${f.id}`); }}>Details</a></td></tr>)}</tbody></table>
      )}
    </div>
  );
}
