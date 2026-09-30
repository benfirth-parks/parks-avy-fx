import React from "react";
import { DangerIcon } from "./icons.jsx";
import { cardTitles } from "./store.js";
import { go } from "./App.jsx";
import { Rose, Likelihood } from "./icons.jsx";
import { problemSelection, problemBox } from "./ProblemModal.jsx";

const fmt = (d, t, tz) => {
  const dt = new Date(`${d}T${t}:00`);
  const s = dt.toLocaleDateString("en-CA", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  return `${s.toUpperCase()} AT ${t} ${tz.startsWith("Mountain") ? "MT" : "PT"}`;
};
const Sect = ({ t, info }) => <div className="psect">{t}{info && <span className="pinfo">i</span>}</div>;
const ROWS = [["alpine", "Alpine", "#fff", "#1f1f1f"], ["treeline", "Treeline", "#c5e100", "#1f1f1f"], ["btl", "Below Treeline", "#6a9e50", "#1f1f1f"]];

export function Preview({ forecast: f }) {
  const titles = cardTitles(f);
  const days = [1, 2, 3].map((i) => ({ day: titles[i].replace(" Forecast", ""), card: f.cards[i] }));
  const first = days[0];
  const problems = f.cards.flatMap((c, i) => c.problems.map((p) => ({ ...p, when: titles[i] })));
  return (
    <div className="preview">
      <div className="pbar"><button className="btn" onClick={() => go(`/forecasts/${f.id}`)}>← Back to forecast</button><span className="muted">Public preview · {f.name}</span><button className="btn" onClick={() => go(`/forecasts/${f.id}/content/weather`)}>Edit Content</button></div>
      <div className="ppage">
        <div className="grid2 pmeta"><div><div className="pk">DATE ISSUED</div><div className="pv">{fmt(f.issued, f.issuedTime, f.timezone)}</div></div><div><div className="pk">VALID UNTIL</div><div className="pv">{fmt(f.expiry, f.expiryTime, f.timezone)}</div></div></div>
        <div className="pk pmeta2">PREPARED BY <span className="pv" style={{ marginLeft: 8 }}>{f.forecaster}</span></div>
        <div className="phead" dangerouslySetInnerHTML={{ __html: f.comms.headline.en }} />
        <Sect t="DANGER RATINGS" info />
        <div style={{ padding: "14px 14px 0" }}>
          <div className="pday">{first.day}</div>
          <div className="mountain">
            <MountainArt />
            {ROWS.map(([k, label], i) => (
              <div key={k} className="band" style={{ top: 12 + i * 110 }}>
                <span className="bandicon"><DangerIcon level={first.card.danger[k]} size={78} /></span>
                <span>{first.card.danger[k]}</span>
              </div>
            ))}
          </div>
          {days.slice(1).map(({ day, card }) => (
            <div key={day}>
              <div className="pday" style={{ marginTop: 2 }}>{day}</div>
              {ROWS.map(([k, label, bg, fg]) => <div key={k} className="prow"><div className="prow-l" style={{ background: bg, color: fg }}>{label}</div><div className="prow-v"><DangerIcon level={card.danger[k]} size={22} />{card.danger[k]}</div></div>)}
            </div>
          ))}
        </div>
        <Sect t="TERRAIN AND TRAVEL ADVICE" />
        {problems.some((p) => p.tta.length) && <ul className="plist">{[...new Set(problems.flatMap((p) => p.tta))].map((t) => <li key={t}>{t}</li>)}</ul>}
        <Sect t="AVALANCHE PROBLEMS" />
        {problems.length === 0 ? <div className="pnone">No problems identified.</div> : problems.map((p) => (
          <div key={p.id} className="pproblem">
            <div className="row between"><b style={{ fontSize: 18 }}>{p.type}</b><span className="muted">{p.when}</span></div>
            <div className="row" style={{ gap: 24, marginTop: 10 }}><Rose size={170} selected={problemSelection(p)} /><Likelihood w={230} h={170} box={problemBox(p)} dot={p.dot} /></div>
            <div className="ptext" dangerouslySetInnerHTML={{ __html: p.desc.en }} />
          </div>
        ))}
        {["snowpack", "avalanche", "weather"].map((k) => {
          const html = f.cards.map((c) => c[k].en).find(Boolean) || "";
          if (!html) return null;
          return <div key={k}><Sect t={{ snowpack: "SNOWPACK SUMMARY", avalanche: "AVALANCHE SUMMARY", weather: "WEATHER SUMMARY" }[k]} /><div className="ptext" dangerouslySetInnerHTML={{ __html: html }} />{(f.media[k] || []).map((m, i) => <img key={i} className="pimg" src={m.data} alt={m.name} />)}</div>;
        })}
        <Sect t="CONFIDENCE" />
        <div className="pconf">{first.card.confidence}</div>
        <div className="pdisc">Forecast Disclaimer<span>+</span></div>
      </div>
    </div>
  );
}

function MountainArt() {
  return (
    <svg width="1000" height="330" viewBox="0 0 1000 330" className="mtn" aria-hidden="true">
      <path d="M0 250 Q120 200 250 220 T500 190 T760 210 T1000 180 V330 H0 Z" fill="#8bbf5e" />
      <path d="M0 290 Q150 240 300 270 T640 250 T1000 260 V330 H0 Z" fill="#6a9e50" />
      <path d="M330 120 L350 250 L100 240 Z" fill="#b6d64a" /><path d="M330 120 L360 250 L230 300 L350 330 L100 240 Z" fill="#3d7a44" opacity=".8" />
      <path d="M150 40 L250 220 L350 250 Z" fill="#7fa5ff" opacity=".5" /><path d="M150 40 L110 200 L250 220 Z" fill="#fff" stroke="#7a8fc9" /><path d="M150 40 L250 220 L200 250 L110 200 Z" fill="#d9e5ff" stroke="#7a8fc9" />
      <path d="M250 60 L330 200 L200 215 Z" fill="#fff" stroke="#7a8fc9" /><path d="M250 60 L330 200 L290 230 L200 215 Z" fill="#d9e5ff" stroke="#7a8fc9" />
      <text x="95" y="123" fontSize="16" fill="#1f1f1f">Alpine</text><text x="82" y="185" fontSize="16" fill="#1f1f1f">Treeline</text><text x="32" y="245" fontSize="16" fill="#1f1f1f">Below Treeline</text>
    </svg>
  );
}
