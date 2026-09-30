import React, { useState } from "react";
import { useAuth, admin, changePassword } from "./auth.js";
import { useStore, setGeo, fmtStamp } from "./store.js";
import { POLYGONS, PLACEHOLDER, importGeoJSON, NAME_PROPS } from "./polygons.js";
import { ask, notify } from "./dialog.jsx";

export function Account() {
  const a = useAuth();
  const [f, setF] = useState({ current: "", password: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg("");
    if (f.password !== f.confirm) return setMsg("New passwords don't match.");
    setBusy(true);
    try { await changePassword(f.current, f.password); setF({ current: "", password: "", confirm: "" }); setMsg("Password changed. Other devices have been signed out."); }
    catch (e2) { setMsg(e2.message); }
    setBusy(false);
  };
  return (
    <div className="page">
      <h1>Account</h1>
      <p>Signed in as <b>{a.user?.name}</b> ({a.user?.username}){a.user?.admin ? " · admin" : ""}.</p>
      <form className="addbox" style={{ maxWidth: 420 }} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Change password</h2>
        <label className="lbl req">Current password</label><input className="inp" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        <label className="lbl req" style={{ marginTop: 12 }}>New password (8+ characters)</label><input className="inp" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <label className="lbl req" style={{ marginTop: 12 }}>Confirm new password</label><input className="inp" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        {msg && <p className="muted">{msg}</p>}
        <button className="btn primary" style={{ marginTop: 14 }} disabled={busy || !f.current || !f.password}>Change password</button>
      </form>
    </div>
  );
}

export function Users() {
  const a = useAuth();
  const blank = { name: "", username: "", password: "", admin: false };
  const [d, setD] = useState(blank);
  const [err, setErr] = useState("");
  if (!a.user?.admin) return <div className="page"><h1>Users</h1><p>Only an admin can manage accounts.</p></div>;
  const run = async (action, fields, done) => {
    setErr("");
    try { await admin(action, fields); done?.(); } catch (e) { setErr(e.message); notify(e.message, "Couldn't update account"); }
  };
  return (
    <div className="page">
      <h1>Users</h1>
      <p className="muted" style={{ marginTop: -8 }}>Everyone who edits forecasts signs in with their own account. Names here fill the Forecaster list and the "last change by" records.</p>
      <table className="table">
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th></th></tr></thead>
        <tbody>{a.users.map((u) => (
          <tr key={u.username}>
            <td>{u.name}</td><td>{u.username}</td>
            <td><label className="row" style={{ gap: 6 }}><input type="checkbox" checked={u.admin} onChange={(e) => run("set-admin", { username: u.username, admin: e.target.checked })} /> Admin</label></td>
            <td className="muted">{u.created ? fmtStamp(u.created) : ""}</td>
            <td className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={async () => { const pw = await ask({ title: `Reset password for ${u.name}`, message: "New temporary password (8+ characters). Tell them to change it under Account. Their other sessions are signed out.", input: "", okLabel: "Reset" }); if (pw) run("reset-password", { username: u.username, password: pw }, () => notify(`Password reset for ${u.name}.`, "Done")); }}>Reset password</button>
              {u.username !== a.user.username && <button className="btn danger" onClick={async () => { if (await ask({ title: "Remove account", message: `Remove ${u.name}'s account? Their forecasts stay.`, okLabel: "Remove", danger: true })) run("remove-user", { username: u.username }); }}>Remove</button>}
            </td>
          </tr>
        ))}</tbody>
      </table>
      <form className="addbox" onSubmit={(e) => { e.preventDefault(); run("add-user", d, () => setD(blank)); }}>
        <div className="row" style={{ gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label className="lbl req">Name</label><input className="inp" style={{ width: 200 }} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Lisa Paulson" /></div>
          <div><label className="lbl req">Username</label><input className="inp" style={{ width: 160 }} autoCapitalize="none" value={d.username} onChange={(e) => setD({ ...d, username: e.target.value })} placeholder="lisa.paulson" /></div>
          <div><label className="lbl req">Temporary password</label><input className="inp" style={{ width: 180 }} value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} placeholder="8+ characters" /></div>
          <label className="row" style={{ gap: 6, height: 34 }}><input type="checkbox" checked={d.admin} onChange={(e) => setD({ ...d, admin: e.target.checked })} /> Admin</label>
          <button className="btn primary" disabled={!d.name || !d.username || !d.password}>Add User</button>
        </div>
        {err && <p className="loginerr">{err}</p>}
      </form>
    </div>
  );
}

export function PolygonsAdmin() {
  const a = useAuth();
  const state = useStore();
  const [pending, setPending] = useState(null); // { raw, fc, file }
  const [err, setErr] = useState("");
  const canEdit = a.phase === "local" || a.user?.admin;
  const imported = POLYGONS !== PLACEHOLDER;
  const used = new Set(state.forecasts.flatMap((f) => f.polygons));

  const read = async (file) => {
    setErr(""); setPending(null);
    try {
      const raw = JSON.parse(await file.text());
      setPending({ raw, file: file.name, fc: importGeoJSON(raw, { existing: POLYGONS }) });
    } catch (e) { setErr(e.message || String(e)); }
  };
  const reparse = (nameProp) => { try { setPending({ ...pending, fc: importGeoJSON(pending.raw, { nameProp, existing: POLYGONS }) }); setErr(""); } catch (e) { setErr(e.message); } };
  const props = pending ? Object.keys(pending.raw.features?.[0]?.properties || {}) : [];
  const newIds = pending ? new Set(pending.fc.features.map((f) => f.id)) : null;
  const orphaned = pending ? [...used].filter((id) => !newIds.has(id)) : [];
  const size = pending ? JSON.stringify(pending.fc).length : 0;

  return (
    <div className="page doc">
      <h1>Forecast polygons</h1>
      <p>{imported ? <>Using <b>{POLYGONS.features.length}</b> imported polygons{state.geo?.by ? <> (imported by {state.geo.by}, {fmtStamp(state.geo.modified)})</> : null}.</> : <>Using the <b>hand-drafted placeholder</b> polygons. Import the real BYK forecast polygons below.</>}</p>
      <ul>{POLYGONS.features.map((f) => <li key={f.id}>{f.properties.name} <span className="muted">· {f.id}</span></li>)}</ul>
      {!canEdit ? <p className="muted">Only an admin can change the polygons.</p> : (
        <>
          <h2>Import GeoJSON</h2>
          <p>A GeoJSON <code>FeatureCollection</code> of Polygon / MultiPolygon features in longitude/latitude (WGS84), each with a name. Polygons whose name matches an existing one keep its id, so forecasts that already use them are unaffected. The import is shared with everyone.</p>
          <label className="btn">Choose file…<input type="file" accept=".geojson,.json,application/geo+json,application/json" hidden onChange={(e) => e.target.files[0] && read(e.target.files[0])} /></label>
          {err && <p className="loginerr">{err}</p>}
          {pending && (
            <div className="addbox" style={{ marginTop: 16 }}>
              <p><b>{pending.file}</b>: {pending.fc.features.length} polygons, {(size / 1024).toFixed(0)} KB.</p>
              {props.length > 1 && <p>Name property: <select className="sel" style={{ width: 200, display: "inline-block" }} value={pending.fc.nameProp} onChange={(e) => reparse(e.target.value)}>{[...new Set([...NAME_PROPS.filter((k) => props.includes(k)), ...props])].map((k) => <option key={k}>{k}</option>)}</select></p>}
              <ul>{pending.fc.features.map((f) => <li key={f.id}>{f.properties.name} <span className="muted">· {f.id}{POLYGONS.features.some((x) => x.id === f.id) ? " (matches existing)" : " (new)"}</span></li>)}</ul>
              {orphaned.length > 0 && <p className="loginerr">Forecasts currently use {orphaned.length} polygon{orphaned.length === 1 ? "" : "s"} not in this file ({orphaned.join(", ")}). Those forecasts will lose them; reassign in Edit Setup.</p>}
              {size > 3_000_000 && <p className="loginerr">This file is large; simplify the geometry (e.g. mapshaper.org) to keep the app fast.</p>}
              <div className="row" style={{ gap: 10 }}>
                <button className="btn primary" onClick={async () => { if (await ask({ title: "Import polygons", message: `Replace the forecast polygons for everyone with the ${pending.fc.features.length} polygons from ${pending.file}?`, okLabel: "Import" })) { const { nameProp, ...fc } = pending.fc; setGeo(fc); setPending(null); } }}>Import for everyone</button>
                <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              </div>
            </div>
          )}
          {imported && <p style={{ marginTop: 24 }}><button className="btn danger" onClick={async () => { if (await ask({ title: "Use placeholder polygons", message: "Go back to the hand-drafted placeholder polygons for everyone?", okLabel: "Revert", danger: true })) setGeo(null); }}>Revert to placeholders</button></p>}
        </>
      )}
    </div>
  );
}
