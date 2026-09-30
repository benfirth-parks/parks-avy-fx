import React, { useState } from "react";
import { useStore, resetDemo, addWeakLayer } from "./store.js";
import { ask } from "./dialog.jsx";
import { go } from "./App.jsx";

export function WeakLayers() {
  const { weakLayers } = useStore();
  const [draft, setDraft] = useState({ name: "", grain: "", status: "developing" });
  const add = () => {
    if (!draft.name) return;
    addWeakLayer(draft);
    setDraft({ name: "", grain: "", status: "developing" });
  };
  return (
    <div className="page">
      <h1>Weak Layers</h1>
      <table className="table">
        <thead><tr><th>Name</th><th>Grain type</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>{weakLayers.map((w) => <tr key={w.id}><td>{w.name}</td><td>{w.grain}</td><td><span className={"tag " + w.status}>{w.status}</span></td><td>{w.created}</td></tr>)}</tbody>
      </table>
      <div className="row" style={{ gap: 10, marginTop: 20, alignItems: "flex-end" }}>
        <div><label className="lbl">Name</label><input className="inp" style={{ width: 240 }} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Feb 14 surface hoar" /></div>
        <div><label className="lbl">Grain type</label><input className="inp" style={{ width: 240 }} value={draft.grain} onChange={(e) => setDraft({ ...draft, grain: e.target.value })} placeholder="e.g. Surface Hoar" /></div>
        <div><label className="lbl">Status</label><select className="sel" style={{ width: 160 }} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option>active</option><option>developing</option><option>dormant</option></select></div>
        <button className="btn primary" onClick={add}>Add Weak Layer</button>
      </div>
    </div>
  );
}

export function Documentation() {
  return (
    <div className="page doc">
      <h1>Documentation</h1>
      <h2>Workflow</h2>
      <ol>
        <li><b>Set Up New Forecast</b> (Draft view) — name, forecaster, colour, issue and expiry, time zone, day one. Click polygons on the map to assign them; unassigned count shows bottom-left.</li>
        <li><b>Edit Content</b> — work through the sidebar sections card by card (Nowcast + three forecast days). Tick a section when it is done; progress is the tick count.</li>
        <li><b>Preview</b> renders the public forecast page from the draft.</li>
        <li><b>Publish</b> moves the draft to Live and marks any live forecast covering the same polygons as Completed.</li>
        <li><b>Clone to Draft</b> copies a live or completed forecast; copied text is flagged <span className="tag red">Translation Required</span> until the French side is re-saved.</li>
        <li><b>Delete Drafts and Start New Day</b> clears all drafts.</li>
      </ol>
      <h2>Demo notes</h2>
      <ul>
        <li>Data is stored in this browser only (localStorage). Use <b>Reset demo data</b> below to restore the seed forecast.</li>
        <li>Map polygons are hand-drafted placeholders; replace <code>src/polygons.js</code> with the real BYK GeoJSON.</li>
        <li>Basemap: OpenTopoMap (keyless). Translate is a stub pending a translation service.</li>
      </ul>
      <button className="btn danger" onClick={async () => { if (await ask({ title: "Reset demo data", message: "Reset all demo data to the seed forecast?", okLabel: "Reset", danger: true })) resetDemo(); }}>Reset demo data</button>
    </div>
  );
}

export function Archive() {
  const { forecasts } = useStore();
  const done = forecasts.filter((f) => f.status === "completed");
  return (
    <div className="page">
      <h1>Archive</h1>
      {done.length === 0 ? <div className="empty">No completed forecasts yet. Publishing a new forecast over a live one moves the old one here.</div> : (
        <table className="table"><thead><tr><th>Name</th><th>Forecaster</th><th>Issued</th><th>Expired</th><th></th></tr></thead>
          <tbody>{done.map((f) => <tr key={f.id}><td>{f.name}</td><td>{f.forecaster}</td><td>{f.issued} {f.issuedTime}</td><td>{f.expiry} {f.expiryTime}</td><td><a href={`#/forecasts/${f.id}/preview`} onClick={(e) => { e.preventDefault(); go(`/forecasts/${f.id}/preview`); }}>View</a></td></tr>)}</tbody></table>
      )}
    </div>
  );
}
