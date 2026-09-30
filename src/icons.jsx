import React from "react";

export const DANGER_LEVELS = [
  "No Rating", "Low", "Moderate", "Considerable", "High", "Extreme",
  "Spring", "Early Season", "Summer Conditions", "No Forecast", "No Elevation",
];

export function DangerIcon({ level, size = 26 }) {
  const D = "M13 1 L25 13 L13 25 L1 13 Z";
  const fill = { Low: "#52b043", Moderate: "#fff200", Considerable: "#f79a1e", High: "#e5231b", Extreme: "#1f1f1f" }[level];
  let inner = null;
  if (fill) {
    inner = (
      <>
        <path d={D} fill={fill} stroke="#111" strokeWidth="1.2" />
        <path d="M13 3 L19 13 H7 Z" fill="#111" />
        {level === "Low" && <path d="M3.5 13 L13 22.5 L22.5 13 Z" fill="#52b043" />}
        {level === "Moderate" && (<><path d="M9 13 L13 21 L17 13 Z" fill="#fff200" /><path d="M12.2 14.5h1.6v3.2h-1.6zM12.2 18.8h1.6v1.5h-1.6z" fill="#111" /></>)}
        {level === "Considerable" && <path d="M8 13 L13 20 L18 13 Z" fill="#f79a1e" />}
        {level === "High" && (<><path d="M10 4 L13 1 L16 4 Z" fill="#e5231b" /><circle cx="18" cy="4.5" r="2" fill="#e5231b" /></>)}
        {level === "Extreme" && (<><path d="M6 7 L13 1 L20 7 Z" fill="#e5231b" /><path d="M13 13 L19 13 L13 19 L7 13 Z" fill="#111" /></>)}
      </>
    );
  } else if (level === "Spring") {
    inner = (<><path d={D} fill="#fff" stroke="#111" strokeWidth="1.2" /><path d="M13 3 L20 14 H6 Z" fill="#e5231b" /><path d="M6 14 L20 14 L13 23 Z" fill="#52b043" /><path d="M11 10h4v6h-4z" fill="#fff" /></>);
  } else if (level === "Early Season") {
    inner = (<><path d={D} fill="#fff" stroke="#111" strokeWidth="1.2" /><path d="M13 5 L20 15 H6 Z" fill="#111" /><path d="M8 15 L18 15 L13 21 Z" fill="#111" /><circle cx="13" cy="9" r="1.5" fill="#fff" /></>);
  } else if (level === "Summer Conditions") {
    inner = (<><path d={D} fill="#fff" stroke="#111" strokeWidth="1.2" /><path d="M6 17 L11 8 L14 13 L16 10 L20 17 Z" fill="#111" /></>);
  } else if (level === "No Forecast") {
    inner = (<><circle cx="13" cy="13" r="11" fill="#fff" stroke="#e5231b" strokeWidth="2" /><path d="M5 5 L21 21" stroke="#e5231b" strokeWidth="2" /><path d="M7 16 L11 10 L13 13 L15 11 L19 16 Z" fill="#111" /></>);
  } else if (level === "No Elevation") {
    inner = <path d="M4 4 L22 22 M22 4 L4 22" stroke="#e5231b" strokeWidth="2.2" />;
  } else {
    inner = <path d={D} fill="#fff" stroke="#bbb" strokeWidth="1.2" />;
  }
  return <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">{inner}</svg>;
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
