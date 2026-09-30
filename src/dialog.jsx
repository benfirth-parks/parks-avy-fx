import React, { useEffect, useRef, useState } from "react";

// In-page replacements for confirm()/prompt()/alert(), which sandboxed hosts suppress.
let setQueue = null;
export function ask({ title, message, okLabel = "OK", cancelLabel = "Cancel", danger = false, input = null, placeholder = "" }) {
  return new Promise((resolve) => {
    setQueue?.((q) => [...q, { id: Math.random(), title, message, okLabel, cancelLabel, danger, input, placeholder, resolve }]);
  });
}
export const notify = (message, title = "") => ask({ title, message, cancelLabel: null });

export function Dialogs() {
  const [queue, setQ] = useState([]);
  useEffect(() => { setQueue = setQ; return () => { setQueue = null; }; }, []);
  const d = queue[0];
  if (!d) return null;
  const close = (v) => { d.resolve(v); setQ((q) => q.slice(1)); };
  return <Dialog key={d.id} d={d} close={close} />;
}

function Dialog({ d, close }) {
  const [val, setVal] = useState(d.input || "");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const ok = () => close(d.input !== null ? val : true);
  return (
    <div className="dlgwrap" onKeyDown={(e) => { if (e.key === "Escape") close(d.input !== null ? null : false); if (e.key === "Enter" && d.input !== null) ok(); }}>
      <div className="scrim" onClick={() => close(d.input !== null ? null : false)} />
      <div className="dlg" role="dialog" aria-modal="true">
        {d.title && <div className="dlgtitle">{d.title}</div>}
        <div className="dlgmsg">{d.message}</div>
        {d.input !== null && <input ref={ref} className="inp" style={{ marginTop: 14 }} value={val} placeholder={d.placeholder} onChange={(e) => setVal(e.target.value)} />}
        <div className="row" style={{ justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          {d.cancelLabel && <button className="btn" onClick={() => close(d.input !== null ? null : false)}>{d.cancelLabel}</button>}
          <button ref={d.input === null ? ref : undefined} className={"btn " + (d.danger ? "danger" : "primary")} onClick={ok}>{d.okLabel}</button>
        </div>
      </div>
    </div>
  );
}
