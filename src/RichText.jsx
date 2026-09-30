import React, { useEffect, useRef, useState } from "react";
import { Icons } from "./icons.jsx";
import { ask, notify } from "./dialog.jsx";
import { translateOne } from "./translate.js";

// Bilingual rich-text field with the AVID toolbar. contentEditable + execCommand
// keeps the demo dependency-free; swap for Tiptap when the package registry is reachable.
export function RichText({ label, value, onChange, maxLen = 400, translationRequired, minHeight = 120, plain = false, translateFrom, onTranslated }) {
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  const [big, setBig] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== (value || "")) el.innerHTML = value || "";
    setLen(el.textContent.length);
  }, [value]);

  const emit = () => { const el = ref.current; setLen(el.textContent.length); onChange(el.innerHTML === "<br>" ? "" : el.innerHTML); };
  const cmd = (c, arg) => { ref.current.focus(); document.execCommand(c, false, arg); emit(); };
  const link = async () => {
    const sel = window.getSelection(); const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const url = await ask({ title: "Insert link", message: "Link URL", input: "https://", okLabel: "Insert" });
    if (!url || url === "https://") return;
    ref.current.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); }
    if (sel.isCollapsed) document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`); else document.execCommand("createLink", false, url);
    emit();
  };
  const clear = () => { ref.current.innerHTML = ""; emit(); };

  const Btn = ({ title, on, children, style }) => <button type="button" className="tb" title={title} onMouseDown={(e) => e.preventDefault()} onClick={on} style={style}>{children}</button>;

  return (
    <div className="rtefield">
      <div className="rtelbl">{label}{onTranslated && <TranslateFromEnglish en={translateFrom} fr={value} plain={plain} onDone={onTranslated} />}{translationRequired === "machine" ? <span className="tag amber" title="Filled in by machine translation. Edit or re-save the French to confirm it.">Machine translated — review</span> : translationRequired && <span className="tag red">Translation Required</span>}</div>
      <div className={"rte" + (big ? " big" : "")} style={{ minHeight }}>
        <div className="rtebar">
          <Btn title="Clear" on={clear}>{Icons.trash}</Btn>
          {!plain && (<>
            <Btn title="Bold" on={() => cmd("bold")} style={{ fontWeight: 700 }}>B</Btn>
            <Btn title="Italic" on={() => cmd("italic")} style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>I</Btn>
            <Btn title="Strikethrough" on={() => cmd("strikeThrough")} style={{ textDecoration: "line-through" }}>S</Btn>
            <Btn title="Paragraph" on={() => cmd("formatBlock", "p")}>{Icons.edit}</Btn>
            <Btn title="Heading 1" on={() => cmd("formatBlock", "h1")}>H1</Btn>
            <Btn title="Heading 2" on={() => cmd("formatBlock", "h2")}>H2</Btn>
            <Btn title="Heading 3" on={() => cmd("formatBlock", "h3")}>H3</Btn>
            <Btn title="Bullet list" on={() => cmd("insertUnorderedList")}>{Icons.ul}</Btn>
            <Btn title="Numbered list" on={() => cmd("insertOrderedList")}>{Icons.ol}</Btn>
            <Btn title="Horizontal rule" on={() => cmd("insertHorizontalRule")}>—</Btn>
            <Btn title="Undo" on={() => cmd("undo")}>{Icons.undo}</Btn>
            <Btn title="Link" on={link}>{Icons.link}</Btn>
            <Btn title="Unlink" on={() => cmd("unlink")}>{Icons.unlink}</Btn>
          </>)}
          <Btn title="Expand" on={() => setBig(!big)}>{Icons.expand}</Btn>
          {maxLen && <span className={"count" + (len > maxLen ? " over" : "")}>{len} / {maxLen}</span>}
        </div>
        <div ref={ref} className="rtebody" contentEditable suppressContentEditableWarning onInput={emit} onBlur={emit} spellCheck />
      </div>
    </div>
  );
}

// "Translate from English" for a French field: machine-translates the English
// field next to it (keeps formatting and links) and fills in the French.
function TranslateFromEnglish({ en, fr, plain, onDone }) {
  const [busy, setBusy] = useState(false);
  const empty = !String(en || "").replace(/<[^>]*>/g, "").trim();
  const run = async () => {
    if (empty) return;
    const hasFr = String(fr || "").replace(/<[^>]*>/g, "").trim();
    if (hasFr && !(await ask({ title: "Translate from English", message: "Replace the French text with a machine translation of the English?", okLabel: "Replace" }))) return;
    setBusy(true);
    try { onDone(await translateOne(en, !plain)); }
    catch (e) { notify(e.message || String(e), "Translation failed"); }
    setBusy(false);
  };
  return (
    <button type="button" className="btn small translatebtn" disabled={busy || empty} title={empty ? "Write the English first" : "Translate from English: machine-translates the English into this field"} onClick={run}>
      {busy ? "Translating…" : "Translate"}
    </button>
  );
}

export function AddLanguage() {
  return <button className="btn addlang" onClick={() => notify("Additional languages are configured per organization. English and French are enabled.", "Add Language")}>Add Language <span className="caret">{Icons.chevronDown}</span></button>;
}

// English + French pair bound to a {en, fr, tr} object.
export function Bilingual({ field, onChange, maxLen = 400, minHeight, plain }) {
  const latest = useRef(field); latest.current = field; // English may change while a translation is in flight
  return (
    <>
      <RichText label="English" value={field.en} maxLen={maxLen} minHeight={minHeight} plain={plain} translationRequired={field.tr} onChange={(en) => onChange({ ...field, en, tr: true })} />
      <div style={{ height: 16 }} />
      <RichText label="French" value={field.fr} maxLen={maxLen} minHeight={minHeight} plain={plain} translationRequired={field.tr} onChange={(fr) => onChange({ ...field, fr, tr: false })} translateFrom={field.en} onTranslated={(fr) => onChange({ ...latest.current, fr, tr: "machine" })} />
      <AddLanguage />
    </>
  );
}
