import React, { useState } from "react";
import { UI_FR, DANGER_SCALE, DISCLAIMER } from "./content.js";
import { DangerIcon } from "./icons.jsx";
import { cardTitles } from "./store.js";
import { go } from "./App.jsx";
import { notify } from "./dialog.jsx";

// Public forecast page, laid out like AVID's published forecast (avalanche.ca style).

const fmt = (d, t, tz, lang) => {
  const dt = new Date(`${d}T${t}:00`);
  const s = dt.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { weekday: "short", month: "long", day: "numeric", year: "numeric" }).replace(/\./g, "");
  return `${s.toUpperCase()} ${lang === "fr" ? "À" : "AT"} ${t} ${tz.startsWith("Mountain") ? (lang === "fr" ? "HR" : "MT") : (lang === "fr" ? "HP" : "PT")}`;
};

// Rating colours and numbers (North American Public Avalanche Danger Scale).
const LEVEL = {
  Low: { n: 1, bg: "#52b52f", fg: "#1f1f1f" },
  Moderate: { n: 2, bg: "#f2f200", fg: "#1f1f1f" },
  Considerable: { n: 3, bg: "#e0930f", fg: "#1f1f1f" },
  High: { n: 4, bg: "#d42a26", fg: "#1f1f1f" },
  Extreme: { n: 5, bg: "#1f1f1f", fg: "#fff" },
  Spring: { bg: "#4355c8", fg: "#fff" },
  "Early Season": { bg: "#4355c8", fg: "#fff" },
};
const ratingStyle = (level) => LEVEL[level] || { bg: "#fff", fg: "#1f1f1f" };
const ELEV = [["alpine", "Alpine", "#fff"], ["treeline", "Treeline", "#b3e000"], ["btl", "Below Treeline", "#6aa05a"]];
const LIKELIHOOD = ["Certain", "Very Likely", "Likely", "Possible", "Unlikely"]; // top → bottom (4 → 0)
const sentence = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

export function Preview({ forecast: f }) {
  const [lang, setLang] = useState("en");
  const [disc, setDisc] = useState(false);
  const T = (k) => (lang === "fr" ? UI_FR[k] || k : k);
  const L = (field) => (field ? (lang === "fr" ? field.fr || field.en : field.en) || "" : "");
  const rating = (level) => { const st = LEVEL[level]; return st?.n ? `${st.n} - ${T(level)}` : T(level); };
  const titles = cardTitles(f);
  const dayName = (i) => T(titles[i].split(" ")[0]);
  const days = [1, 2, 3].filter((i) => f.visibleCards[i] !== false).map((i) => ({ i, day: dayName(i), card: f.cards[i] }));
  // Problems: every card's problems in card order; the day is shown only when they span several days.
  const problems = f.cards.flatMap((c, i) => c.problems.map((p) => ({ ...p, day: dayName(i), cardIdx: i })));
  const multiDay = new Set(problems.map((p) => p.cardIdx)).size > 1;
  const tta = [...new Set(problems.flatMap((p) => p.tta || []))];
  const summary = (k) => { const field = f.cards.map((c) => c[k]).find((x) => x && (x.en || x.fr)); return field ? L(field) : ""; };
  const conf = f.cards[1];

  return (
    <div className="preview">
      <div className="pbar"><button className="btn" onClick={() => go(`/forecasts/${f.id}`)}>← Back to forecast</button><span className="muted">Public preview · {f.name}</span>
        <div className="langtoggle"><button className={"btn" + (lang === "en" ? " primary" : "")} onClick={() => setLang("en")}>EN</button><button className={"btn" + (lang === "fr" ? " primary" : "")} onClick={() => setLang("fr")}>FR</button></div><button className="btn" onClick={() => go(`/forecasts/${f.id}/content/weather`)}>Edit Content</button></div>
      <article className="fx">
        <div className="fxmeta">
          <div><div className="fxk">{T("DATE ISSUED")}</div><div className="fxv">{fmt(f.issued, f.issuedTime, f.timezone, lang)}</div></div>
          <div><div className="fxk">{T("VALID UNTIL")}</div><div className="fxv">{fmt(f.expiry, f.expiryTime, f.timezone, lang)}</div></div>
        </div>
        <div className="fxmeta one"><div className="fxk">{T("PREPARED BY")} <span className="fxv inline">{f.forecaster}</span></div></div>
        {L(f.comms.headline) && <div className="fxhead" dangerouslySetInnerHTML={{ __html: L(f.comms.headline) }} />}

        <Section title={T("DANGER RATINGS")} info={() => notify(DANGER_SCALE, "North American Public Avalanche Danger Scale")} />
        <div className="fxratings">
          {days.map(({ i, day, card }, n) => (
            <React.Fragment key={i}>
              <div className="fxday">{day}</div>
              {n === 0 ? <Hero danger={card.danger} rating={rating} T={T} /> : ELEV.map(([k, label, bg]) => {
                const st = ratingStyle(card.danger[k]);
                return <div key={k} className="fxrow"><div className="fxelev" style={{ background: bg }}>{T(label)}</div><div className="fxrate" style={{ background: st.bg, color: st.fg }}>{rating(card.danger[k])}</div></div>;
              })}
            </React.Fragment>
          ))}
        </div>

        <Section title={T("TERRAIN AND TRAVEL ADVICE")} />
        {tta.length > 0 && <ul className="fxlist">{tta.map((t) => <li key={t}>{t}</li>)}</ul>}

        <Section title={T("AVALANCHE PROBLEMS")} />
        {problems.length === 0 ? <div className="fxnone">{T("No problems identified.")}</div> : problems.map((p, n) => (
          <div key={p.id} className="fxproblem">
            <div className="fxphead"><span>{T("Problem")} {n + 1}: {lang === "fr" ? T(p.type) : sentence(p.type)}</span>{multiDay && <span className="fxpday">{p.day}</span>}</div>
            <div className="fxpbody">
              <div className="fxpgrid">
                <div><div className="fxplbl">{T("LOCATION")}</div><OctRose cells={p.cells || []} T={T} /></div>
                <div>
                  <div className="fxplbl">{T("LIKELIHOOD")}</div><LikelihoodScale p={p} T={T} />
                  <div className="fxplbl" style={{ marginTop: 18 }}>{T("SIZE")}</div><SizeScale p={p} T={T} />
                </div>
              </div>
              {L(p.desc) && <div className="fxtext" dangerouslySetInnerHTML={{ __html: L(p.desc) }} />}
            </div>
          </div>
        ))}

        {["avalanche", "snowpack", "weather"].map((k) => {
          const html = summary(k);
          if (!html && !(f.media[k] || []).length) return null;
          return (
            <div key={k}>
              <Section title={T({ snowpack: "SNOWPACK SUMMARY", avalanche: "AVALANCHE SUMMARY", weather: "WEATHER SUMMARY" }[k])} />
              {html && <div className="fxtext" dangerouslySetInnerHTML={{ __html: html }} />}
              {(f.media[k] || []).map((m, j) => <img key={j} className="fximg" src={m.data} alt={m.name} />)}
            </div>
          );
        })}

        <Section title={T("CONFIDENCE")} />
        <div className="fxconf">{T(conf.confidence)}</div>
        {(conf.confidenceStatements || []).length > 0 && <ul className="fxlist">{conf.confidenceStatements.map((t) => <li key={t}>{t}</li>)}</ul>}

        <button type="button" className="fxdisc" onClick={() => setDisc(!disc)}>{T("Forecast Disclaimer")}<span>{disc ? "−" : "+"}</span></button>
        {disc && <div className="fxtext">{DISCLAIMER[lang]}</div>}
      </article>
    </div>
  );
}

function Section({ title, info }) {
  return <div className="fxsect"><span>{title}</span>{info && <button type="button" className="fxinfo" title="Danger scale" onClick={info}>i</button>}</div>;
}

// Day-one illustration: mountain with the three elevation bands and a rating bar for each.
function Hero({ danger, rating, T }) {
  const bars = [["alpine", 29, 4.4], ["treeline", 33.3, 37.9], ["btl", 37.9, 71.4]];
  return (
    <div className="fxhero">
      <MountainArt T={T} />
      {bars.map(([k, left, top]) => {
        const st = ratingStyle(danger[k]);
        return (
          <div key={k} className="fxbar" style={{ left: left + "%", top: top + "%", background: st.bg, color: st.fg }}>
            <span className="fxbaricon"><DangerIcon level={danger[k]} size={64} /></span>
            <span className="fxbartext">{rating(danger[k])}</span>
          </div>
        );
      })}
    </div>
  );
}

function MountainArt({ T }) {
  return (
    <svg viewBox="0 0 750 250" className="fxart" aria-hidden="true" preserveAspectRatio="none">
      <rect width="750" height="250" fill="#dfe9f6" />
      <path d="M180 118 C260 92 330 84 420 86 C520 88 640 80 750 84 V250 H180 Z" fill="#c6dc9b" />
      <path d="M0 110 C60 100 120 104 180 112 V250 H0 Z" fill="#c6dc9b" />
      <path d="M180 170 C300 150 420 158 520 162 C620 166 690 160 750 162 V250 H180 Z" fill="#b3c2a8" />
      <path d="M0 150 C80 142 150 150 210 162 V250 H0 Z" fill="#a8b9a0" />
      <defs>
        <clipPath id="fxm"><path d="M116 28 L150 88 L193 50 L265 190 L147 246 L0 196 L0 160 Z" /></clipPath>
      </defs>
      <g clipPath="url(#fxm)">
        <rect width="750" height="250" fill="#a7c5f2" />
        <path d="M116 28 L147 246 L300 246 L300 0 Z" fill="#fff" />
        <path d="M193 50 L300 250 L300 0 Z" fill="#dce8fb" />
        <path d="M0 118 C40 104 80 112 116 104 C160 96 220 110 300 100 V250 H0 Z" fill="#7d9c18" />
        <path d="M130 105 C170 98 230 110 300 100 V250 H147 Z" fill="#b3dc00" />
        <path d="M0 162 C50 150 100 170 150 160 C200 150 250 158 300 150 V250 H0 Z" fill="#4c7843" />
        <path d="M140 160 C190 150 250 158 300 150 V250 H147 Z" fill="#6a9e56" />
      </g>
      <path d="M116 28 L150 88 L193 50 L265 190 L147 246 L0 196" fill="none" stroke="#7d93c3" strokeWidth="4" strokeLinejoin="round" />
      <text x="96" y="100" fontSize="15" fill="#1f1f1f">{T("Alpine")}</text>
      <text x="60" y="146" fontSize="15" fill="#1f1f1f">{T("Treeline")}</text>
      <text x="24" y="192" fontSize="15" fill="#1f1f1f">{T("Below Treeline")}</text>
    </svg>
  );
}

// Aspect / elevation rose as an octagon: alpine in the centre, below treeline outside.
const ASP = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function OctRose({ cells, T }) {
  const sel = new Set(cells);
  const c = 110, cy = 96, R = 70, radii = [0, R / 3, (2 * R) / 3, R];
  const ring = ["alp", "tl", "btl"];
  const pt = (r, deg) => { const a = (deg * Math.PI) / 180; return [c + r * Math.sin(a), cy - r * Math.cos(a)]; };
  const polys = [];
  ASP.forEach((asp, i) => {
    const a0 = i * 45 - 22.5, a1 = i * 45 + 22.5;
    ring.forEach((rk, k) => {
      const ri = radii[k], ro = radii[k + 1];
      const pts = [pt(ro, a0), pt(ro, a1), pt(ri, a1), pt(ri, a0)].map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
      polys.push(<polygon key={asp + rk} points={pts} fill={sel.has(`${asp}:${rk}`) ? "#5b69b8" : "#fff"} stroke="#c9c9c9" strokeWidth="0.8" />);
    });
  });
  const outline = Array.from({ length: 8 }, (_, i) => pt(R, i * 45 - 22.5).map((v) => v.toFixed(1)).join(",")).join(" ");
  // Leader lines from each ring (in the SSW sector) down to the elevation labels.
  const leaders = [["alp", R / 6, 0], ["tl", R / 2, 1], ["btl", (5 * R) / 6, 2]].map(([rk, r, k]) => {
    const [x, y] = pt(r, 200);
    const yEnd = cy + R + 34 + k * 16;
    return (
      <g key={rk}>
        <circle cx={x} cy={y} r="1.6" fill="#888" />
        <path d={`M${x} ${y} V${yEnd}`} stroke="#888" strokeWidth="0.9" />
        <text x={x + 4} y={yEnd + 1} fontSize="11" fill="#333">{T({ alp: "Alpine", tl: "Treeline", btl: "Below treeline" }[rk])}</text>
      </g>
    );
  });
  return (
    <svg viewBox="0 0 230 252" className="fxrose" aria-label="Aspect and elevation">
      {polys}
      <polygon points={outline} fill="none" stroke="#9a9a9a" strokeWidth="1.2" />
      <text x={c} y={cy - R - 10} textAnchor="middle" fontSize="12" fill="#333">N</text>
      <text x={c + R + 16} y={cy + 4} textAnchor="middle" fontSize="12" fill="#333">E</text>
      <text x={c - R - 16} y={cy + 4} textAnchor="middle" fontSize="12" fill="#333">{T("W")}</text>
      <text x={c + 14} y={cy + R + 18} textAnchor="middle" fontSize="12" fill="#333">S</text>
      {leaders}
    </svg>
  );
}

// Likelihood (0 Unlikely … 4 Certain) from the chart dot; a half step covers both neighbours.
function likelihoodRange(p) {
  if (!p.dot) return null;
  const l = p.dot[1];
  return [Math.floor(l), Math.ceil(l)];
}
// Size range from the chart dot (same box the editor draws), else the typical size.
function sizeRange(p) {
  if (p.dot) return [Math.max(1, p.dot[0] - 1), Math.min(5, p.dot[0] + 0.5)];
  const s = parseFloat(p.size);
  return isNaN(s) ? null : [Math.max(1, s - 0.5), Math.min(5, s + 0.5)];
}

function Scale({ ticks, range, height }) {
  // ticks: [{ v, label, on, tick }] with v from 0 (bottom) to 1 (top); range: [lo, hi] on the same scale
  const H = height, y = (v) => 8 + (H - 16) * (1 - v);
  return (
    <svg viewBox={`0 0 180 ${H}`} className="fxscale" style={{ height: H }}>
      <path d={`M22 ${y(1)} V${y(0)}`} stroke="#888" strokeWidth="1" />
      {range && <rect x="18.5" y={range[0] === range[1] ? y(range[1]) - 4.5 : y(range[1]) - 1} width="7" height={Math.max(9, y(range[0]) - y(range[1]) + 2)} fill="#5b69b8" />}
      {ticks.map((t) => (
        <g key={t.label + t.v}>
          {t.tick !== false && <path d={`M17 ${y(t.v)} H27`} stroke="#888" strokeWidth="1" />}
          <text x="32" y={y(t.v) + 4} fontSize="11.5" fill="#333" fontWeight={t.on ? 700 : 400}>{t.label}</text>
        </g>
      ))}
    </svg>
  );
}
function LikelihoodScale({ p, T }) {
  const r = likelihoodRange(p);
  const ticks = LIKELIHOOD.map((label, i) => { const v = 4 - i; return { v: v / 4, label: T(label), on: r && v >= r[0] && v <= r[1] }; });
  return <Scale ticks={ticks} range={r && [r[0] / 4, r[1] / 4]} height={104} />;
}
function SizeScale({ p, T }) {
  const r = sizeRange(p);
  const on = (v) => r && v >= r[0] && v <= r[1];
  const ticks = [
    { v: 1, label: "5", on: on(5) }, { v: 0.75, label: "4", on: on(4) },
    { v: 0.625, label: T("Very Large"), tick: false, on: on(3.5) },
    { v: 0.5, label: "3", on: on(3) }, { v: 0.25, label: `2 ${T("Large")}`, on: on(2) }, { v: 0, label: `1 ${T("Small")}`, on: on(1) },
  ];
  return <Scale ticks={ticks} range={r && [(r[0] - 1) / 4, (r[1] - 1) / 4]} height={150} />;
}
