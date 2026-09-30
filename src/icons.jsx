import React from "react";

// Same order as AVID's danger rating dropdown.
export const DANGER_LEVELS = [
  "Extreme", "High", "Considerable", "Moderate", "Low", "No Rating",
  "Spring", "Early Season", "Summer Conditions", "No Forecast", "No Elevation",
];

// AVID-style danger icon: diamond with a white upper half holding a black mountain,
// and a lower half in the danger colour carrying the level's symbol.
const DIAMOND = "M13 1 L25 13 L13 25 L1 13 Z";
const MOUNTAIN = "M4.2 12.4 L9.6 6.4 L11.4 8.2 L14.6 4.4 L21.8 12.4 Z";
const SNOW = "M14.6 4.4 L12.9 6.5 L13.9 7.3 L14.8 6.4 L16 7.2 L16.9 6.9 Z";
const CLOUD = (fill = "#fff") => <path d="M17.6 7.8 a1.7 1.7 0 0 1 1.4 -2.6 a2.2 2.2 0 0 1 4.1 .7 a1.5 1.5 0 0 1 .2 3 h-5.5 a1.1 1.1 0 0 1 -.2 -1.1 Z" fill={fill} stroke="#222" strokeWidth=".7" />;
const LOWER = "M1 13 L25 13 L13 25 Z";
export function DangerIcon({ level, size = 26 }) {
  const top = (<><path d={MOUNTAIN} fill="#1f1f1f" /><path d={SNOW} fill="#fff" /></>);
  const frame = <path d={DIAMOND} fill="none" stroke="#1f1f1f" strokeWidth="1.1" strokeLinejoin="round" />;
  const X = (c) => <path d="M10.4 14.9 L15.6 20.1 M15.6 14.9 L10.4 20.1" stroke={c} strokeWidth="1.9" strokeLinecap="round" />;
  let inner;
  switch (level) {
    case "Extreme": inner = (<><path d={DIAMOND} fill="#fff" /><path d={LOWER} fill="#1f1f1f" />{top}{CLOUD()}{X("#e5231b")}</>); break;
    case "High": inner = (<><path d={DIAMOND} fill="#fff" /><path d={LOWER} fill="#e5231b" />{top}{CLOUD()}{X("#1f1f1f")}</>); break;
    case "Considerable": inner = (<><path d={DIAMOND} fill="#fff" /><path d={LOWER} fill="#f79a1e" />{top}{CLOUD()}<path d="M11.3 14.6v3.6M14.7 14.6v3.6" stroke="#1f1f1f" strokeWidth="1.6" strokeLinecap="round" /><circle cx="11.3" cy="20.4" r=".95" fill="#1f1f1f" /><circle cx="14.7" cy="20.4" r=".95" fill="#1f1f1f" /></>); break;
    case "Moderate": inner = (<><path d={DIAMOND} fill="#fff" /><path d={LOWER} fill="#fff200" />{top}<path d="M13 14.6v3.8" stroke="#1f1f1f" strokeWidth="1.8" strokeLinecap="round" /><circle cx="13" cy="20.7" r="1" fill="#1f1f1f" /></>); break;
    case "Low": inner = (<><path d={DIAMOND} fill="#fff" /><path d={LOWER} fill="#52b043" />{top}<path d="M9.6 17.2 L12.2 19.8 L16.6 14.9" fill="none" stroke="#1f1f1f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>); break;
    case "Spring": inner = (<><path d={DIAMOND} fill="#fff" /><path d="M1 13 L13 13 L13 25 Z" fill="#e5231b" /><path d="M13 13 L25 13 L13 25 Z" fill="#52b043" />{top}<circle cx="19.5" cy="6.2" r="2" fill="#fff" stroke="#e5231b" strokeWidth=".8" /><path d="M13 15.2v4.5" stroke="#1f1f1f" strokeWidth="1.5" strokeLinecap="round" /></>); break;
    case "Early Season": inner = (<><path d={DIAMOND} fill="#fff" />{top}<circle cx="13" cy="17.6" r="2.2" fill="#1f1f1f" /></>); break;
    case "Summer Conditions": case "No Rating": inner = (<><path d={DIAMOND} fill="#fff" />{top}</>); break;
    case "No Forecast": return (<svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="11" fill="#fff" stroke="#e5231b" strokeWidth="2.4" /><path d="M5.5 16.5 L10 11 L12.2 13.2 L14.6 10.3 L20.5 16.5 Z" fill="#1f1f1f" /><path d="M5.2 5.2 L20.8 20.8" stroke="#e5231b" strokeWidth="2.4" /></svg>);
    case "No Elevation": return (<svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"><path d="M5 15.5 L10 10 L12.4 12.4 L15 9.4 L21 15.5 Z" fill="#9a9a9a" /><path d="M5 5 L21 21 M21 5 L5 21" stroke="#e5231b" strokeWidth="2.4" strokeLinecap="round" /></svg>);
    default: inner = (<><path d={DIAMOND} fill="#fff" /><path d={MOUNTAIN} fill="#bbb" /></>);
  }
  return <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">{inner}{frame}</svg>;
}

// 8 aspect sectors × 3 elevation rings. `selected` = Set of "aspect:ring" keys.
export const ASPECTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const RINGS = ["alp", "tl", "btl"];
export function Rose({ size = 160, selected = new Set(), onToggle }) {
  const c = size / 2, r = size / 2 - 8;
  const radii = [r * 0.36, r * 0.68, r];
  const cells = [];
  for (let i = 0; i < 8; i++) {
    const a0 = ((-112.5 + i * 45) * Math.PI) / 180, a1 = ((-67.5 + i * 45) * Math.PI) / 180;
    for (let k = 0; k < 3; k++) {
      const ri = k === 0 ? 0 : radii[k - 1], ro = radii[k];
      const p = (rr, a) => `${(c + rr * Math.cos(a)).toFixed(1)} ${(c + rr * Math.sin(a)).toFixed(1)}`;
      const d = `M${p(ri, a0)} L${p(ro, a0)} A${ro} ${ro} 0 0 1 ${p(ro, a1)} L${p(ri, a1)} A${ri} ${ri} 0 0 0 ${p(ri, a0)} Z`;
      const key = `${ASPECTS[i]}:${RINGS[2 - k]}`;
      cells.push(<path key={key} d={d} fill={selected.has(key) ? "#3a5bff" : "#ececec"} stroke="#777" strokeWidth=".7" strokeDasharray="3 3" style={{ cursor: onToggle ? "pointer" : "default" }} onClick={onToggle ? () => onToggle(key) : undefined} />);
    }
  }
  const fs = Math.max(10, size * 0.075);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Aspect and elevation rose">
      {cells}
      <text x={c} y={fs * 0.95} textAnchor="middle" fontSize={fs} fill="#8a8a8a">N</text>
      <text x={c} y={size - 1} textAnchor="middle" fontSize={fs} fill="#8a8a8a">S</text>
      <text x={size - fs * 0.6} y={c + fs * 0.35} textAnchor="middle" fontSize={fs} fill="#8a8a8a">E</text>
      <text x={fs * 0.6} y={c + fs * 0.35} textAnchor="middle" fontSize={fs} fill="#8a8a8a">W</text>
    </svg>
  );
}

const LIKE = ["Almost Certain", "Very Likely", "Likely", "Possible", "Unlikely"];
// box: [sizeMin, likMin, sizeMax, likMax] (size 1–5, likelihood 0–4 with 0 = Unlikely); dot: [size, lik]
export function Likelihood({ w = 230, h = 180, box, dot, big = false, onPick }) {
  const ml = big ? 150 : 62, mb = big ? 60 : 26, mt = 8;
  const px = w - ml - 8, py = h - mb - mt;
  const fs = big ? 20 : 6.5;
  const X = (s) => ml + (px * (s - 1)) / 4, Y = (l) => mt + py * (1 - l / 4);
  const grid = [];
  for (let i = 0; i <= 5; i++) grid.push(<line key={"v" + i} x1={ml + (px * i) / 5} y1={mt} x2={ml + (px * i) / 5} y2={mt + py} stroke="#e6e6e6" />);
  for (let i = 0; i <= 8; i++) grid.push(<line key={"h" + i} x1={ml} y1={mt + (py * i) / 8} x2={ml + px} y2={mt + (py * i) / 8} stroke="#e6e6e6" />);
  const pick = onPick ? (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - r.left) * w) / r.width, sy = ((e.clientY - r.top) * h) / r.height;
    const s = Math.min(5, Math.max(1, 1 + ((sx - ml) / px) * 4)), l = Math.min(4, Math.max(0, (1 - (sy - mt) / py) * 4));
    onPick(Math.round(s * 2) / 2, Math.round(l * 2) / 2);
  } : undefined;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="Likelihood versus destructive size" onClick={pick} style={{ cursor: onPick ? "crosshair" : "default" }}>
      {grid}
      {box && <rect x={X(box[0])} y={Y(box[3])} width={X(box[2]) - X(box[0])} height={Y(box[1]) - Y(box[3])} fill="#bdbdbd" fillOpacity=".75" />}
      {box && <rect x={X(box[0]) - 3} y={Y(box[1]) - 3} width="6" height="6" fill="none" stroke="#5b64f2" />}
      {dot && <rect x={X(dot[0]) - 2.5} y={Y(dot[1]) - 2.5} width="5" height="5" fill="#e02424" />}
      <line x1={ml} y1={mt} x2={ml} y2={mt + py} stroke="#222" strokeWidth={big ? 1.6 : 1} />
      <line x1={ml} y1={mt + py} x2={ml + px} y2={mt + py} stroke="#222" strokeWidth={big ? 1.6 : 1} />
      {LIKE.map((t, i) => (<g key={t}><line x1={ml - 6} y1={mt + (py * i) / 4} x2={ml} y2={mt + (py * i) / 4} stroke="#222" /><text x={ml - 9} y={mt + (py * i) / 4 + fs * 0.35} textAnchor="end" fontSize={fs} fill="#222">{t}</text></g>))}
      {[1, 2, 3, 4, 5].map((n) => (<g key={n}><line x1={X(n)} y1={mt + py} x2={X(n)} y2={mt + py + 6} stroke="#222" /><text x={X(n)} y={mt + py + 8 + fs * 1.3} textAnchor="middle" fontSize={big ? fs : fs * 1.3} fill="#222">{n}</text></g>))}
      <text x={ml + px / 2} y={h - (big ? 6 : 2)} textAnchor="middle" fontSize={big ? fs : fs * 1.1} fill="#222">Destructive Avalanche Size</text>
      <text transform={`translate(${big ? 22 : fs * 1.1} ${mt + py / 2}) rotate(-90)`} textAnchor="middle" fontSize={big ? fs : fs * 1.1} fill="#222">Likelihood of Avalanches</text>
    </svg>
  );
}

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round" };
export const Icons = {
  trash: <svg width="13" height="14" viewBox="0 0 12 13" {...S}><path d="M1 3h10M4 3V1h4v2M2 3l1 9h6l1-9" /></svg>,
  edit: <svg width="13" height="13" viewBox="0 0 12 12" {...S}><path d="M8 1l3 3-6 6H2V7z" /></svg>,
  ul: <svg width="14" height="12" viewBox="0 0 13 11" {...S}><path d="M4 1.5h8M4 5.5h8M4 9.5h8" /><circle cx="1.5" cy="1.5" r=".9" fill="currentColor" stroke="none" /><circle cx="1.5" cy="5.5" r=".9" fill="currentColor" stroke="none" /><circle cx="1.5" cy="9.5" r=".9" fill="currentColor" stroke="none" /></svg>,
  ol: <svg width="14" height="12" viewBox="0 0 13 11" {...S}><path d="M5 1.5h7M5 5.5h7M5 9.5h7" /><text x="0" y="3.6" fontSize="4.2" fill="currentColor" stroke="none">1</text><text x="0" y="7.6" fontSize="4.2" fill="currentColor" stroke="none">2</text><text x="0" y="11.2" fontSize="4.2" fill="currentColor" stroke="none">3</text></svg>,
  undo: <svg width="13" height="13" viewBox="0 0 12 12" {...S}><path d="M2 6a4 4 0 1 1 1.2 2.8M2 9V6h3" /></svg>,
  link: <svg width="14" height="14" viewBox="0 0 13 13" {...S}><path d="M5 8l3-3M4 9a2 2 0 0 1 0-3l1-1M9 4a2 2 0 0 1 0 3l-1 1" /></svg>,
  unlink: <svg width="14" height="14" viewBox="0 0 13 13" {...S}><path d="M5 8l3-3M4 9a2 2 0 0 1 0-3l1-1M9 4a2 2 0 0 1 0 3l-1 1M2 2l9 9" /></svg>,
  expand: <svg width="13" height="13" viewBox="0 0 12 12" {...S}><path d="M7 1h4v4M11 1L7 5M5 11H1V7M1 11l4-4" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>,
  chevronDown: <svg width="12" height="12" viewBox="0 0 12 12" {...S}><path d="M2 4l4 4 4-4" /></svg>,
  chevronRight: <svg width="12" height="12" viewBox="0 0 12 12" {...S}><path d="M4 2l4 4-4 4" /></svg>,
  lasso: <svg width="16" height="16" viewBox="0 0 16 16" {...S}><rect x="3" y="3" width="10" height="10" /><circle cx="3" cy="3" r="1.4" fill="currentColor" /><circle cx="13" cy="3" r="1.4" fill="currentColor" /><circle cx="3" cy="13" r="1.4" fill="currentColor" /><circle cx="13" cy="13" r="1.4" fill="currentColor" /></svg>,
  pencil: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3z" /></svg>,
  info: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b4fd2" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 11v6M12 7.5v.5" strokeLinecap="round" /></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#bfbfbf" strokeWidth="1.1"><rect x="1" y="2" width="10" height="9" rx="1" /><path d="M1 5h10M4 1v2M8 1v2" /></svg>,
};

export const Hint = () => <span className="hint" title="Help">?</span>;

// Map marker for a forecast (AVID style): white disc with a mountain whose three bands
// show the day-one alpine / treeline / below-treeline ratings.
export const DANGER_COLOUR = { Low: "#52b043", Moderate: "#fff200", Considerable: "#f79a1e", High: "#e5231b", Extreme: "#1f1f1f" };
export function forecastMarkerSvg(danger = {}, size = 44) {
  const c = (k) => DANGER_COLOUR[danger[k]] || "#fff";
  const rated = ["alpine", "treeline", "btl"].some((k) => DANGER_COLOUR[danger[k]]);
  const line = rated ? "#333" : "#9a9a9a";
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true">
<circle cx="22" cy="22" r="20" fill="rgba(255,255,255,.92)" stroke="#8c8c8c" stroke-width="1.5"/>
<path d="M22 9 L17.5 17 H26.5 Z" fill="${c("alpine")}"/>
<path d="M17.5 17 L13.2 24.6 H30.8 L26.5 17 Z" fill="${c("treeline")}"/>
<path d="M13.2 24.6 L9 32 H35 L30.8 24.6 Z" fill="${c("btl")}"/>
<path d="M22 9 L9 32 H35 Z M17.5 17 H26.5 M13.2 24.6 H30.8" fill="none" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>
</svg>`;
}
