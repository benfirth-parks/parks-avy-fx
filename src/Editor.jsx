import React, { useState } from "react";
import { go } from "./App.jsx";
import { updateForecast, SECTIONS, progress, cardTitles, relTime } from "./store.js";
import { Bilingual, RichText, AddLanguage } from "./RichText.jsx";
import { DangerIcon, DANGER_LEVELS, Rose, Likelihood, Icons, Hint } from "./icons.jsx";
import { ProblemModal, problemSelection, problemBox } from "./ProblemModal.jsx";
import { ask, notify } from "./dialog.jsx";
import { CONFIDENCE_STATEMENTS, DANGER_SCALE } from "./content.js";

export function Editor({ forecast: f, section }) {
  const set = (fn) => updateForecast(f.id, fn);
  const setCard = (i, fn) => set((x) => { x.cards[i] = fn(x.cards[i]); return x; });
  const titles = cardTitles(f);
  const p = progress(f);
  const allChecked = SECTIONS.every(([k]) => f.checks[k]);

  return (
    <div className="editor">
      <div className="side">
        <div className="meta">
          <div className="k">Forecaster</div><div className="v">{f.forecaster}</div>
          <div className="k">Issued Date/Time</div><div className="v">{f.issued}, {f.issuedTime}</div>
          <div className="k">Expiry Date/Time</div><div className="v">{f.expiry}, {f.expiryTime}</div>
          <div className="grid2" style={{ columnGap: 20 }}><div><div className="k">Day One</div><div className="v">{f.dayOne}</div></div><div><div className="k">Status</div><div className="v" style={{ textTransform: "capitalize" }}>{f.status}</div></div></div>
          <div className="k">Progress</div>
          <div className="row" style={{ gap: 10, marginTop: 6, marginBottom: 22 }}><div className="prog" style={{ flex: 1, height: 7 }}><b style={{ width: p + "%" }} /></div><span>{p}%</span></div>
        </div>
        <div className="secs">
          {SECTIONS.map(([k, t]) => (
            <div key={k} className={"srow" + (section === k ? " on" : "")} onClick={() => go(`/forecasts/${f.id}/content/${k}`)}>
              <Check on={!!f.checks[k]} onChange={(v) => set((x) => { x.checks[k] = v; return x; })} />
              <span>{t}</span>
              {k === "review" && <span className="tag" style={{ marginLeft: "auto" }}>{f.reviewStatus}</span>}
            </div>
          ))}
          <div className="srow">
            <Check on={allChecked} onChange={(v) => set((x) => { for (const [k] of SECTIONS) x.checks[k] = v; return x; })} />
            <span>Check All</span>
          </div>
          <div className="sidefoot">
            <button className="btn" onClick={() => go(`/forecasts/${f.id}`)}>← Back to forecast</button>
            <button className="btn" onClick={() => go(`/forecasts/${f.id}/preview`)}>Preview</button>
          </div>
        </div>
      </div>

      <div className="main">
        {["media", "communications", "review"].includes(section) ? (
          <div className="wide">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="ptitle">{f.name || "Untitled"}</div>
              <div style={{ textAlign: "right" }}><div className="vc">Last Modified</div><div style={{ fontSize: 20 }}>{relTime(f.modified)}</div></div>
            </div>
            {section === "media" && <Media f={f} set={set} />}
            {section === "communications" && <Communications f={f} set={set} />}
            {section === "review" && <Review f={f} set={set} />}
          </div>
        ) : (
          <>
            <div className="editorhead">
              <div><div className="vc">Visible Cards:</div><div>{[1, 2, 3, 4].map((n) => <button key={n} className={"vcb" + (f.visibleCards[n - 1] ? "" : " off")} onClick={() => set((x) => { x.visibleCards[n - 1] = !x.visibleCards[n - 1]; return x; })}>{n}</button>)}</div></div>
              <div className="ptitle center">{f.name || "Untitled"}</div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}><div className="vc">Last Modified</div><div style={{ fontSize: 20 }}>{relTime(f.modified)}</div></div>
            </div>
            <div className="cards">
              {f.cards.map((card, i) => f.visibleCards[i] && (
                <div key={i} className="card">
                  <div className={"chead" + (i === 0 ? " nowcast" : "")}><div className="num">{i + 1}</div><div className="ttl">{titles[i]}</div><div className="dots">⋮</div></div>
                  <div className="cbody">
                    <CardSection section={section} card={card} idx={i} setCard={(fn) => setCard(i, fn)} forecast={f} />
                  </div>
                </div>
              ))}
            </div>
            <button className="fab" title="Edit setup" onClick={() => go(`/forecasts/${f.id}/setup`)}>{Icons.pencil}</button>
          </>
        )}
      </div>
    </div>
  );
}

function Check({ on, onChange }) {
  return <button type="button" className={"chk" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={(e) => { e.stopPropagation(); onChange(!on); }}>{on && Icons.check}</button>;
}

function CardSection({ section, card, idx, setCard, forecast }) {
  const [modal, setModal] = useState(null); // null | "new" | problem index
  if (["weather", "snowpack", "avalanche"].includes(section)) {
    return <Bilingual field={card[section]} minHeight={section === "weather" ? 150 : 120} onChange={(v) => setCard((c) => { c[section] = v; return c; })} />;
  }
  if (section === "problems") {
    return (
      <>
        {card.problems.map((pr, i) => (
          <div key={pr.id} className="problem">
            <div className="row between">
              <button className="row plink" style={{ gap: 10 }} onClick={() => setModal(i)}><span className="chk on">{Icons.check}</span>{pr.type || "Untitled problem"}</button>
              <button className="tb" title="Delete problem" onClick={async () => { if (await ask({ title: "Delete problem", message: `Delete the ${pr.type} problem from this card?`, okLabel: "Delete", danger: true })) setCard((c) => { c.problems.splice(i, 1); return c; }); }}>{Icons.trash}</button>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14, paddingBottom: 16, borderBottom: "1px solid #e6e6e6" }}><Rose size={180} selected={problemSelection(pr)} /><Likelihood w={205} h={170} box={problemBox(pr)} dot={pr.dot} /></div>
          </div>
        ))}
        <div className="row" style={{ marginTop: "auto", justifyContent: "flex-end" }}><button className="btn primary" onClick={() => setModal("new")}>New Avalanche Problem</button></div>
        {modal !== null && <ProblemModal problem={modal === "new" ? null : card.problems[modal]} onClose={() => setModal(null)} onSave={(pr) => { setCard((c) => { if (modal === "new") c.problems.push(pr); else c.problems[modal] = pr; return c; }); setModal(null); }} />}
      </>
    );
  }
  if (section === "danger") {
    const rows = [["alpine", "ALPINE"], ["treeline", "TREELINE"], ["btl", "BELOW TREE LINE"]];
    return (
      <>
        <div className="dtable">
          {rows.map(([k, t]) => <div key={k} className="dr"><div className="e">{t}</div><DangerSelect value={card.danger[k]} onChange={(v) => setCard((c) => { c.danger[k] = v; return c; })} /></div>)}
          <div className="dhint"><button type="button" className="hint" style={{ border: "1px solid #999", background: "none", cursor: "pointer" }} title="Danger scale" onClick={() => notify(DANGER_SCALE, "North American Public Avalanche Danger Scale")}>?</button></div>
        </div>
        {card.problems.map((pr) => (
          <div key={pr.id} style={{ marginTop: 22 }}>
            <div style={{ fontSize: 14 }}>{pr.type}</div>
            <div className="row" style={{ gap: 6, marginTop: 8, paddingBottom: 14, borderBottom: "1px solid #e6e6e6" }}><Rose size={180} selected={problemSelection(pr)} /><Likelihood w={205} h={170} box={problemBox(pr)} dot={pr.dot} /></div>
          </div>
        ))}
      </>
    );
  }
  if (section === "confidence") {
    const q = card.confidenceFilter || "";
    const list = CONFIDENCE_STATEMENTS.filter((t) => !q || t.toLowerCase().includes(q.toLowerCase()));
    const chosen = card.confidenceStatements || [];
    return (
      <>
        <select className="sel" value={card.confidence} onChange={(e) => setCard((c) => { c.confidence = e.target.value; return c; })}>{["No Rating", "Low", "Moderate", "High"].map((o) => <option key={o}>{o}</option>)}</select>
        <div className="divider" style={{ marginTop: 30 }}><span>Filter</span></div>
        <input className="inp" style={{ marginTop: 16 }} placeholder="Tag Search using keywords or tags" value={q} onChange={(e) => setCard((c) => { c.confidenceFilter = e.target.value; return c; })} />
        <div className="ttalist" style={{ maxHeight: "none" }}>
          {list.map((t) => <button key={t} type="button" className={"ttaitem" + (chosen.includes(t) ? " on" : "")} onClick={() => setCard((c) => { const cur = c.confidenceStatements || []; c.confidenceStatements = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]; return c; })}>{t}</button>)}
        </div>
      </>
    );
  }
  return null;
}

function DangerSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="r" style={{ position: "relative" }}>
      <button type="button" className="dsel" onClick={() => setOpen(!open)} onBlur={() => setTimeout(() => setOpen(false), 150)}><DangerIcon level={value} /><span>{value}</span></button>
      {open && <div className="menu" style={{ left: 0, right: 0, top: 44 }}>{DANGER_LEVELS.map((l) => <div key={l} className={"mi row" + (l === value ? " cur" : "")} onMouseDown={() => { onChange(l); setOpen(false); }}><DangerIcon level={l} size={20} />{l}</div>)}</div>}
    </div>
  );
}

function Acc({ title, open, onToggle, children }) {
  return (
    <>
      <button type="button" className={"acc" + (open ? " open" : "")} onClick={onToggle}>{open ? Icons.chevronDown : Icons.chevronRight}{title}</button>
      {open && <div className="accbody">{children}</div>}
    </>
  );
}
const MEDIA_LEFT = [["avalanche", "Avalanche Summary"], ["snowpack", "Snowpack Summary"], ["weather", "Weather Summary"]];
const MEDIA_RIGHT = [["headline", "Headline"], ["tta", "Terrain and Travel Advice"], ["problems", "Avalanche Problems"]];
function Media({ f, set }) {
  const [open, setOpen] = useState({ avalanche: true, snowpack: true, weather: true });
  const addImage = (k, file) => {
    resizeImage(file, 1600).then((data) => set((x) => { x.media[k] = [...(x.media[k] || []), { name: file.name, data }]; return x; }));
  };
  const Block = ([k, t]) => (
    <Acc key={k} title={t} open={!!open[k]} onToggle={() => setOpen({ ...open, [k]: !open[k] })}>
      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        {(f.media[k] || []).map((m, i) => <div key={i} className="thumb"><img src={m.data} alt={m.name} /><button className="tb" onClick={() => set((x) => { x.media[k].splice(i, 1); return x; })}>{Icons.trash}</button></div>)}
        <label className="btn">Add Image<input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && addImage(k, e.target.files[0])} /></label>
      </div>
    </Acc>
  );
  return (
    <div className="row" style={{ gap: 22, alignItems: "flex-start", marginTop: 20 }}>
      <div className="accgroup">{MEDIA_LEFT.map(Block)}</div>
      <div className="accgroup">{MEDIA_RIGHT.map(Block)}</div>
    </div>
  );
}

function Communications({ f, set }) {
  const comms = f.comms;
  const setC = (k, v) => set((x) => { x.comms[k] = v; return x; });
  const strip = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent.trim().slice(0, 140); };
  return (
    <div className="commsbox">
      <div className="acc open static">Headline</div>
      <div className="accbody pad">
        <RichText label="English" value={comms.headline.en} maxLen={280} minHeight={150} translationRequired={comms.headline.tr} onChange={(en) => setC("headline", { ...comms.headline, en, tr: true })} />
        <div style={{ height: 16 }} />
        <RichText label="French" value={comms.headline.fr} maxLen={280} minHeight={150} translationRequired={comms.headline.tr} onChange={(fr) => setC("headline", { ...comms.headline, fr, tr: false })} />
        <AddLanguage />
      </div>
      <div className="acc open static row between" style={{ paddingRight: 0 }}>SMS Message<button className="btn flat" onClick={() => setC("sms", { en: strip(comms.headline.en), fr: strip(comms.headline.fr), tr: comms.headline.tr })}>Copy from headline</button></div>
      <div className="accbody pad">
        <RichText label="English" plain value={comms.sms.en} maxLen={140} minHeight={130} translationRequired={comms.sms.tr} onChange={(en) => setC("sms", { ...comms.sms, en, tr: true })} />
        <div style={{ height: 16 }} />
        <RichText label="French" plain value={comms.sms.fr} maxLen={140} minHeight={130} translationRequired={comms.sms.tr} onChange={(fr) => setC("sms", { ...comms.sms, fr, tr: false })} />
        <AddLanguage />
      </div>
    </div>
  );
}

function Review({ f, set }) {
  return (
    <div className="commsbox" style={{ width: 800 }}>
      <div className="acc open static">Review</div>
      <div className="accbody pad">
        <label className="lbl">Review Status</label>
        <select className="sel" style={{ width: 300 }} value={f.reviewStatus} onChange={(e) => set((x) => { x.reviewStatus = e.target.value; return x; })}>{["Not Required", "Required", "In Review", "Approved"].map((o) => <option key={o}>{o}</option>)}</select>
        <label className="lbl" style={{ marginTop: 22 }}>Review Note</label>
        <textarea className="inp" style={{ height: 120, padding: 10 }} value={f.reviewNote} onChange={(e) => set((x) => { x.reviewNote = e.target.value; return x; })} />
      </div>
    </div>
  );
}

// Downscale uploads so the shared document stays small (max edge px, JPEG).
function resizeImage(file, max) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); };
    img.src = url;
  });
}
