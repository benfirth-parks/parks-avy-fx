import React, { useEffect, useRef, useState } from "react";
import { POLYGONS, outerRings, labelPoint, groupCentre } from "./polygons.js";
import { forecastMarkerSvg } from "./icons.jsx";
import { colourOf } from "./store.js";

// WebGL-free map: OpenTopoMap raster tiles in a slippy grid plus SVG polygons.
// Same props and behaviour as the MapLibre view; used when WebGL is unavailable.
const TILE = 256;
const GREY = { hex: "#8a8a9a", opacity: 0.35, line: "#6d6d80" };

const lon2x = (lon, z) => ((lon + 180) / 360) * Math.pow(2, z) * TILE;
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z) * TILE; };

export function polygonBounds() {
  let w = 180, s = 90, e = -180, n = -90;
  for (const f of POLYGONS.features) for (const r of outerRings(f)) for (const [x, y] of r) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return { w, s, e, n };
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 45), g = Math.max(0, ((n >> 8) & 255) - 45), b = Math.max(0, (n & 255) - 45);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
function pointInPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function SvgMap({ forecasts, selectedId, editingId, onTogglePolygon, onLasso, lasso, onLassoPath }) {
  const wrap = useRef(null);
  const [size, setSize] = useState(null); // measured map area
  const [view, setView] = useState(null); // {z, cx, cy} in world px at zoom z
  const drag = useRef(null);
  const lassoRef = useRef(null);
  const [path, setPath] = useState(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); if (r.width && r.height) setSize({ w: r.width, h: r.height }); });
    ro.observe(el);
    const r = el.getBoundingClientRect(); if (r.width && r.height) setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (view || !size) return;
    const b = polygonBounds();
    let z = 12;
    while (z > 4 && (lon2x(b.e, z) - lon2x(b.w, z) > size.w * 0.95 || lat2y(b.s, z) - lat2y(b.n, z) > size.h * 0.95)) z--;
    setView({ z, cx: (lon2x(b.w, z) + lon2x(b.e, z)) / 2, cy: (lat2y(b.n, z) + lat2y(b.s, z)) / 2 });
  }, [size, view]);
  if (!view || !size) return <div ref={wrap} className="map svgmap" />;

  const { z, cx, cy } = view;
  const left = cx - size.w / 2, top = cy - size.h / 2;
  const project = ([lon, lat]) => [lon2x(lon, z) - left, lat2y(lat, z) - top];
  const tiles = [];
  const n = Math.pow(2, z);
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++)
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n;
      const sub = ["a", "b", "c"][(wx + ty) % 3];
      tiles.push(<img key={`${tx}/${ty}`} src={`https://${sub}.tile.opentopomap.org/${z}/${wx}/${ty}.png`} alt="" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} style={{ position: "absolute", left: tx * TILE - left, top: ty * TILE - top, width: TILE, height: TILE, filter: "saturate(.55) brightness(1.08) contrast(.9)", opacity: 0.85 }} />);
    }

  const byPoly = {};
  for (const f of forecasts) for (const p of f.polygons) byPoly[p] = f;
  const polys = POLYGONS.features.map((f) => {
    const fc = byPoly[f.id];
    let fill = GREY.hex, opacity = GREY.opacity, line = GREY.line;
    if (fc) { const c = colourOf(fc); const focus = !selectedId && !editingId ? true : fc.id === selectedId || fc.id === editingId; fill = c.hex; opacity = focus ? 0.62 : 0.3; line = shade(c.hex); }
    // Rings (outer + holes) as one path with even-odd fill.
    const polysOf = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    const d = polysOf.flatMap((rings) => rings.map((r) => "M" + r.map((c) => project(c).map((v) => v.toFixed(1)).join(" ")).join("L") + "Z")).join("");
    const [lx, ly] = project(labelPoint(f));
    return (
      <g key={f.id}>
        <path d={d} fillRule="evenodd" fill={fill} fillOpacity={opacity} stroke={line} strokeWidth="1.6" style={{ cursor: editingId ? "pointer" : "default" }} onClick={() => { if (editingId && !lasso) onTogglePolygon?.(f.id); }} />
        <text x={lx} y={ly} fontSize="11" textAnchor="middle" fill="#3a3a3a" stroke="rgba(255,255,255,.85)" strokeWidth="2.5" paintOrder="stroke" style={{ pointerEvents: "none" }}>{f.properties.name}</text>
      </g>
    );
  });

  const pt = (e) => { const r = wrap.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onDown = (e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (lasso) { lassoRef.current = { pts: [pt(e)], remove: e.shiftKey }; setPath([pt(e)]); return; }
    drag.current = { x: e.clientX, y: e.clientY, cx, cy, moved: false };
  };
  const onMove = (e) => {
    if (lassoRef.current) { lassoRef.current.pts.push(pt(e)); setPath([...lassoRef.current.pts]); return; }
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView({ z, cx: d.cx - dx, cy: d.cy - dy });
  };
  const onUp = (e) => {
    const l = lassoRef.current; lassoRef.current = null; setPath(null);
    if (l && l.pts.length >= 3) {
      const hit = POLYGONS.features.filter((f) => pointInPoly(project(labelPoint(f)), l.pts) || outerRings(f).some((ring) => ring.some((ll) => pointInPoly(project(ll), l.pts)))).map((f) => f.id);
      if (hit.length) onLasso?.(hit, l.remove || e.shiftKey);
    }
    drag.current = null;
  };
  const zoom = (dz, ax, ay) => {
    const nz = Math.max(4, Math.min(15, z + dz)); if (nz === z) return;
    const k = Math.pow(2, nz - z);
    const px = ax ?? size.w / 2, py = ay ?? size.h / 2;
    const wx = left + px, wy = top + py; // world point under cursor at z
    setView({ z: nz, cx: wx * k - px + size.w / 2, cy: wy * k - py + size.h / 2 });
  };
  const onWheel = (e) => { e.preventDefault(); const [x, y] = pt(e); zoom(e.deltaY < 0 ? 1 : -1, x, y); };

  return (
    <div ref={wrap} className="map svgmap" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} onDoubleClick={(e) => { const [x, y] = pt(e); zoom(1, x, y); }} style={{ cursor: lasso ? "crosshair" : drag.current ? "grabbing" : "grab", touchAction: "none", overflow: "hidden", background: "#e7edca", userSelect: "none" }}>
      {tiles}
      <svg width={size.w} height={size.h} style={{ position: "absolute", left: 0, top: 0 }}>
        {polys}
        {forecasts.filter((f) => f.polygons.length).map((f) => { const at = groupCentre(f.polygons); if (!at) return null; const [x, y] = project(at); return <g key={"m" + f.id} transform={`translate(${x - 22} ${y - 22})`} style={{ pointerEvents: "none" }} dangerouslySetInnerHTML={{ __html: forecastMarkerSvg(f.cards?.[1]?.danger).replace(/^<svg[^>]*>|<\/svg>$/g, "") }} />; })}
        {path && <polygon points={path.map((p) => p.join(",")).join(" ")} fill="rgba(91,100,242,.18)" stroke="#5b64f2" strokeWidth="1.5" strokeDasharray="5 4" />}
      </svg>
      <div className="zoomctl"><button type="button" aria-label="Zoom in" onClick={() => zoom(1)}>+</button><button type="button" aria-label="Zoom out" onClick={() => zoom(-1)}>−</button></div>
      <div className="attrib">© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors</div>
    </div>
  );
}

export function webglAvailable() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")); } catch { return false; }
}
