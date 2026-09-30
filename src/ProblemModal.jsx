import React, { useState } from "react";
import { Rose, Likelihood, Hint } from "./icons.jsx";
import { Bilingual } from "./RichText.jsx";
import { useStore } from "./store.js";
import { notify } from "./dialog.jsx";

export const PROBLEM_TYPES = ["Dry Loose", "Wet Loose", "Storm Slab", "Wind Slab", "Persistent Slab", "Deep Persistent Slab", "Wet Slab", "Cornice"];
export const DISTRIBUTION = ["Isolated", "Specific", "Widespread"];
export const SENSITIVITY = ["Unreactive", "Stubborn", "Reactive", "Touchy"];
export const SIZES = ["1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

// Standard terrain and travel advice statements (Avalanche Canada style). Edit freely.
export const TTA = [
  "Avoid steep, rocky, unsupported terrain where triggering is more likely.",
  "Use extra caution on slopes with cornices.",
  "Be aware of the potential for wide propagation and large avalanches.",
  "Avoid open slopes and convex rolls at and below treeline where buried surface hoar may be preserved.",
  "Make conservative terrain choices and avoid overhead hazard.",
  "Avoid lee and cross-loaded terrain features.",
  "Be alert to conditions that change with elevation, aspect and time of day.",
  "Watch for signs of instability like whumpfing, hollow sounds, shooting cracks or recent avalanches.",
  "Timing is everything. Start early and be off steep sun-exposed slopes before they soften.",
  "Minimize exposure to overhead terrain during periods of warming and rain.",
  "Carefully evaluate steep lines for recent wind loading before committing to them.",
  "Cornices become weak with daytime heating or solar exposure.",
];

const blank = () => ({
  id: Math.random().toString(36).slice(2, 10), type: "", weakLayer: "", distribution: "", sensitivity: "", size: "",
  depthMin: "", depthMax: "", cells: [], dot: null, desc: { en: "", fr: "", tr: false }, tta: [],
});

export const problemSelection = (pr) => new Set(pr.cells || []);
export function problemBox(pr) {
  if (!pr.dot) return null;
  const [s, l] = pr.dot;
  return [Math.max(1, s - 1.5), Math.max(0, l - 1), Math.min(5, s + 0.5), Math.min(4, l + 1)];
}

export function ProblemModal({ problem, onClose, onSave }) {
  const [pr, setPr] = useState(problem ? structuredClone(problem) : blank());
  const [q, setQ] = useState("");
  const { weakLayers } = useStore();
  const set = (patch) => setPr({ ...pr, ...patch });
  const groups = ["active", "developing", "dormant"];
  const missing = ["type", "weakLayer", "distribution", "sensitivity", "size"].filter((k) => !pr[k]);
  const tta = TTA.filter((t) => !q || t.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="modalwrap">
      <div className="scrim" onClick={onClose} />
      <div className="modal">
        <div className="modalbody">
          <div className="modalleft">
            <div className="grid2" style={{ gap: "22px 28px" }}>
              <SelField k="type" label="Avalanche Problem Type" opts={PROBLEM_TYPES} hint pr={pr} set={set} />
              <div>
                <label className="lbl req">Weak Layers</label>
                <select className="sel" value={pr.weakLayer} onChange={(e) => set({ weakLayer: e.target.value })}>
                  <option value="" />
                  {groups.map((g) => <optgroup key={g} label={g}>{weakLayers.filter((w) => w.status === g).map((w) => <option key={w.id} value={w.id}>{w.name} — {w.grain}</option>)}</optgroup>)}
                </select>
              </div>
              <SelField k="distribution" label="Distribution" opts={DISTRIBUTION} hint pr={pr} set={set} />
              <SelField k="sensitivity" label="Sensitivity" opts={SENSITIVITY} hint pr={pr} set={set} />
              <SelField k="size" label="Typical Size" opts={SIZES} pr={pr} set={set} />
              <div><label className="lbl" style={{ visibility: "hidden" }}>Guidance</label><button className={"btn" + (pr.type ? "" : " dis")} disabled={!pr.type} onClick={() => notify(guidance(pr.type), pr.type + " guidance")}>Guidance</button></div>
            </div>
            <label className="lbl" style={{ marginTop: 22 }}>Depth</label>
            <div className="row between">
              <div className="row"><input className="inp" style={{ width: 90, borderRadius: "5px 0 0 5px" }} value={pr.depthMin} onChange={(e) => set({ depthMin: e.target.value })} /><span className="unit">cm</span></div>
              <span>to</span>
              <div className="row"><input className="inp" style={{ width: 90, borderRadius: "5px 0 0 5px" }} value={pr.depthMax} onChange={(e) => set({ depthMax: e.target.value })} /><span className="unit">cm</span></div>
            </div>
            <div className="row" style={{ gap: 40, marginTop: 26 }}>
              <Rose size={240} selected={new Set(pr.cells)} onToggle={(key) => set({ cells: pr.cells.includes(key) ? pr.cells.filter((c) => c !== key) : [...pr.cells, key] })} />
              <Likelihood w={300} h={230} box={problemBox(pr)} dot={pr.dot} onPick={(s, l) => set({ dot: [s, l] })} />
            </div>
            <div style={{ marginTop: 24 }}><Bilingual field={pr.desc} maxLen={250} minHeight={130} onChange={(desc) => set({ desc })} /></div>
          </div>
          <div className="modalright">
            <div style={{ fontSize: 20 }}>Terrain and Travel Advice</div>
            <div className="divider" style={{ marginTop: 30 }}><span>Filter</span></div>
            <input className="inp" style={{ marginTop: 16 }} placeholder="Tag Search using keywords or tags" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="ttalist">
              {tta.map((t) => {
                const on = pr.tta.includes(t);
                return <button key={t} type="button" className={"ttaitem" + (on ? " on" : "")} onClick={() => set({ tta: on ? pr.tta.filter((x) => x !== t) : [...pr.tta, t] })}>{t}</button>;
              })}
            </div>
          </div>
        </div>
        <div className="modalfoot">
          {missing.length > 0 && <span className="muted">Required: {missing.join(", ")}</span>}
          <button className="btn primary" onClick={() => onSave(pr)} disabled={missing.length > 0}>Submit Problem</button>
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SelField({ k, label, opts, hint, pr, set }) {
  return (
    <div>
      <label className="lbl req row" style={{ gap: 6 }}>{label}{hint && <Hint />}</label>
      <select className="sel" value={pr[k]} onChange={(e) => set({ [k]: e.target.value })}><option value="" />{opts.map((o) => <option key={o}>{o}</option>)}</select>
    </div>
  );
}

function guidance(type) {
  return {
    "Dry Loose": "Dry loose avalanches release at a point and entrain dry surface snow. Typically small, but consequential in steep, exposed terrain.",
    "Wet Loose": "Wet loose avalanches occur when surface snow loses cohesion from warming, sun or rain. Timing relative to daytime heating is key.",
    "Storm Slab": "Storm slabs form from new snow bonding poorly to the old surface. Sensitivity usually decreases within days of the storm.",
    "Wind Slab": "Wind slabs form on lee and cross-loaded features. Look for pillowed, chalky snow and cracking.",
    "Persistent Slab": "Persistent slabs overlie a buried weak layer (surface hoar, facets, crust). Can remain triggerable for weeks and surprise with wide propagation.",
    "Deep Persistent Slab": "Deep persistent slabs are large, destructive and hard to forecast. Low probability, high consequence; often triggered from thin spots.",
    "Wet Slab": "Wet slabs occur when liquid water weakens a buried layer. Rapid warming or rain on a cold snowpack is the classic trigger.",
    "Cornice": "Cornice failures can trigger slabs on the slope below. Give cornices a wide berth and avoid travelling under them during warming.",
  }[type] || "";
}
