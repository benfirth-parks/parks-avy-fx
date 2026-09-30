import React, { useEffect, useState } from "react";
import { MapView } from "./MapView.jsx";
import { go } from "./App.jsx";
import { useStore, addForecast, blankForecast, updateForecast, deleteForecast, deleteDraftsStartNewDay, cloneToDraft, publishForecast, progress, colourOf, unassignedCount, COLOURS, FORECASTERS, TIMEZONES } from "./store.js";
import { Icons, Hint } from "./icons.jsx";
import { ask, notify } from "./dialog.jsx";
import { POLYGON_IDS } from "./polygons.js";

const FILTERS = [["draft", "Draft"], ["completed", "Completed"], ["live", "Live"]];

export function ForecastsPage({ route }) {
  const state = useStore();
  const [, id, sub] = route.parts;
  const filter = route.query.filter || (id && state.forecasts.find((f) => f.id === id)?.status) || "draft";
  const list = state.forecasts.filter((f) => f.status === filter);
  const selected = id && id !== "new" ? state.forecasts.find((f) => f.id === id) : null;
  const editing = sub === "setup" && selected;

  useEffect(() => {
    if (id === "new") {
      const nid = addForecast(blankForecast({ name: "", forecaster: "Ben Firth", colour: COLOURS[1].name }));
      go(`/forecasts/${nid}/setup`);
    }
  }, [id]);

  const banner = selected && (sub === "setup" || sub === undefined) && (id ? { ...colourOf(selected), name: selected.name || "Untitled", expiry: selected.expiry, issued: selected.issued, modified: selected.modified } : null);
  const mapForecasts = editing ? state.forecasts.filter((f) => f.status === filter || f.id === selected.id) : list;

  return (
    <div className="split">
      <MapView
        forecasts={mapForecasts}
        selectedId={selected?.id}
        editingId={editing ? selected.id : null}
        onTogglePolygon={(pid) => updateForecast(selected.id, (f) => { f.polygons = f.polygons.includes(pid) ? f.polygons.filter((p) => p !== pid) : [...f.polygons, pid]; return f; })}
        banner={banner}
        unassigned={unassignedCount(mapForecasts, editing ? selected.status : filter)}
      />
      <div className="panel">
        <h1>Avalanche Forecasts</h1>
        <div className="radios">
          {FILTERS.map(([k, t]) => (
            <label key={k} className={"radio" + (filter === k ? " on" : "")}><input type="radio" name="filter" checked={filter === k} onChange={() => go(`/forecasts?filter=${k}`)} /><i />{t}</label>
          ))}
        </div>
        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          <button className={"btn " + (filter === "draft" ? "primary" : "dis")} disabled={filter !== "draft"} onClick={() => go("/forecasts/new")}>Set Up New Forecast</button>
          <button className={"btn " + (filter === "draft" ? "dis" : "primary")} disabled={filter === "draft"} onClick={async () => { if (await ask({ title: "Start new day", message: "Delete all draft forecasts and start a new day?", okLabel: "Delete drafts", danger: true })) deleteDraftsStartNewDay(); }}>Delete Drafts and Start New Day</button>
        </div>
        {list.length === 0 ? (
          <div className="empty">No avalanche forecasts found matching this filter.</div>
        ) : (
          list.map((f) => <ForecastRow key={f.id} f={f} />)
        )}
      </div>
      {selected && !editing && <DetailDrawer f={selected} />}
      {editing && <SetupDrawer f={selected} />}
    </div>
  );
}

function ForecastRow({ f }) {
  const p = progress(f);
  return (
    <a className="frow" href={`#/forecasts/${f.id}`} onClick={(e) => { e.preventDefault(); go(`/forecasts/${f.id}`); }} style={{ borderLeftColor: colourOf(f).hex }}>
      <div className="row between"><div className="fname">{f.name || "Untitled"}</div><div className="who">{f.forecaster}</div></div>
      <div className="row between" style={{ marginTop: 8 }}>
        <div><b>Issued:</b> {f.issued} &nbsp;<span className="tag">{f.reviewStatus}</span></div>
        <div className="row" style={{ gap: 8, width: 110 }}><div className="prog" style={{ flex: 1 }}><b style={{ width: p + "%" }} /></div><span>{p}%</span></div>
      </div>
    </a>
  );
}

function Scrim({ onClose }) {
  return <div className="scrim" onClick={onClose} />;
}

function DetailDrawer({ f }) {
  const close = () => go(`/forecasts?filter=${f.status}`);
  const p = progress(f);
  const live = f.status === "live";
  return (
    <>
      <Scrim onClose={close} />
      <div className="drawer">
        <div className="dtitle">{f.name || "Untitled"}</div>
        <div className="row between" style={{ marginTop: 10 }}><span>{f.forecaster}</span><span><b>Last modified:</b> {f.modified}</span></div>
        <div className="divider"><span>Details</span></div>
        <div className="grid2" style={{ marginTop: 20, rowGap: 22 }}>
          <Field k="Issued Date/Time" v={<>{f.issued},<br />{f.issuedTime}</>} />
          <Field k="Expiry Date/Time" v={<>{f.expiry},<br />{f.expiryTime}</>} />
          <Field k="Forecast Day 1" v={f.dayOne} />
          <div><div className="k">Review Status</div><div style={{ marginTop: 10 }}><span className="tag">{f.reviewStatus}</span></div></div>
          <Field k={<>Multi-Day Forecast <Hint /></>} v={f.multiDay ? "Yes" : "No"} />
          <Field k="Time Zone" v={f.timezone.replace(" (", "\n(")} pre />
        </div>
        <div className="k" style={{ marginTop: 22 }}>Progress</div>
        <div className="row" style={{ gap: 10, marginTop: 8 }}><div className="prog" style={{ width: 160 }}><b style={{ width: p + "%" }} /></div><span>{p}%</span></div>
        <button className="polybar" style={{ background: tint(colourOf(f).hex) }} onClick={() => go(`/forecasts/${f.id}/setup`)}><span>{f.polygons.length} Polygons</span><span className="chev">›</span></button>
        {live && <div className="notebar">{f.reviewNote || "Review Note"}</div>}
        {live ? (
          <div className="row" style={{ gap: 16, marginTop: 18 }}>
            <button className="btn" onClick={() => go(`/forecasts/${cloneToDraft(f.id)}`)}>Clone to Draft</button>
            <button className="btn" onClick={() => go(`/forecasts/${f.id}/preview`)}>Preview</button>
          </div>
        ) : (
          <>
            <div className="row" style={{ gap: 16, marginTop: 18 }}>
              <button className="btn" onClick={() => go(`/forecasts/${f.id}/setup`)}>Edit Setup</button>
              <button className="btn" onClick={() => go(`/forecasts/${f.id}/content/weather`)}>Edit Content</button>
              <button className="btn" onClick={() => go(`/forecasts/${cloneToDraft(f.id)}`)}>Clone to Draft</button>
            </div>
            <div className="row" style={{ gap: 16, marginTop: 14 }}>
              <button className="btn dis" disabled title="Machine translation not connected in the demo">Translate</button>
              <button className="btn" onClick={() => go(`/forecasts/${f.id}/preview`)}>Preview</button>
              {f.status === "draft" && <button className="btn primary" onClick={async () => { if (f.polygons.length === 0) return notify("Assign at least one polygon (Edit Setup) before publishing.", "Cannot publish"); if (await ask({ title: "Publish forecast", message: `Publish "${f.name}" to Live? Any live forecast covering the same polygons will move to Completed.`, okLabel: "Publish" })) { publishForecast(f.id); go(`/forecasts?filter=live`); } }}>Publish</button>}
            </div>
          </>
        )}
        <div className="dfoot"><button className="btn danger" onClick={async () => { if (await ask({ title: "Delete forecast", message: `Delete "${f.name}"? This cannot be undone.`, okLabel: "Delete", danger: true })) { deleteForecast(f.id); close(); } }}>Delete Avalanche Forecast</button></div>
      </div>
    </>
  );
}

function Field({ k, v, pre }) {
  return <div><div className="k">{k}</div><div className="v" style={pre ? { whiteSpace: "pre-line" } : undefined}>{v}</div></div>;
}
function tint(hex) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * 0.58);
  return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

function SetupDrawer({ f }) {
  const set = (patch) => updateForecast(f.id, (x) => ({ ...x, ...patch }));
  const [pick, setPick] = useState(false);
  const c = colourOf(f);
  return (
    <>
      <Scrim onClose={() => go(`/forecasts/${f.id}`)} />
      <div className="drawer setup">
        <div style={{ fontSize: 14 }}>Edit Forecast Setup</div>
        <div className="infobox">Toggle polygons by clicking on them, or use the lasso tool to select a batch (hold <code>Shift</code> while lassoing to remove).</div>
        <label className="lbl req" style={{ marginTop: 22 }}>Forecast Name</label>
        <input className="inp" value={f.name} placeholder="e.g. May 1" onChange={(e) => set({ name: e.target.value })} autoFocus />
        <div className="grid2" style={{ marginTop: 22 }}>
          <div><label className="lbl req">Forecaster</label><select className="sel" value={f.forecaster} onChange={(e) => set({ forecaster: e.target.value })}>{FORECASTERS.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div style={{ position: "relative" }}>
            <label className="lbl">Colour</label>
            <button className="btn" style={{ width: "100%", background: c.hex, borderColor: c.hex, color: c.text }} onClick={() => setPick(!pick)}>{c.name}</button>
            {pick && <div className="menu">{COLOURS.map((k) => <div key={k.name} className="mi row" onClick={() => { set({ colour: k.name }); setPick(false); }}><i style={{ background: k.hex }} />{k.name}</div>)}</div>}
          </div>
        </div>
        <label className="lbl req" style={{ marginTop: 22 }}>Issued &amp; Expiry Date/Time</label>
        <div className="grid2">
          <DateTime d={f.issued} t={f.issuedTime} onChange={(d, t) => set({ issued: d, issuedTime: t })} />
          <DateTime d={f.expiry} t={f.expiryTime} onChange={(d, t) => set({ expiry: d, expiryTime: t })} />
        </div>
        <div className="grid2" style={{ marginTop: 22 }}>
          <div><label className="lbl req">Time Zone</label><select className="sel" value={f.timezone} onChange={(e) => set({ timezone: e.target.value })}>{TIMEZONES.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className="lbl req row" style={{ gap: 6 }}>Multi-Day Forecast <Hint /></label><button className={"toggle" + (f.multiDay ? " on" : "")} aria-pressed={f.multiDay} onClick={() => set({ multiDay: !f.multiDay })}><span /></button></div>
        </div>
        <label className="lbl req" style={{ marginTop: 22 }}>Day One</label>
        <div style={{ width: "50%" }}><select className="sel" value={f.dayOne} onChange={(e) => set({ dayOne: e.target.value })}><option>Issue Date</option><option>Day After Issue</option></select></div>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 26 }}>
          <button className="btn" onClick={() => set({ polygons: f.polygons.length === POLYGON_IDS.length ? [] : [...POLYGON_IDS] })}>{f.polygons.length === POLYGON_IDS.length ? "Clear all polygons" : "Select all polygons"}</button>
          <button className="btn primary" onClick={() => go(`/forecasts/${f.id}`)}>Close Editing</button>
        </div>
      </div>
    </>
  );
}

function DateTime({ d, t, onChange }) {
  return (
    <div className="dt">
      <input type="date" value={d} onChange={(e) => onChange(e.target.value, t)} />
      <input type="time" value={t} onChange={(e) => onChange(d, e.target.value)} />
      {Icons.calendar}
    </div>
  );
}
