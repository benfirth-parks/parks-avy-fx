import React, { useState } from "react";
import { useAuth, login, setupFirstAdmin, boot } from "./auth.js";

// Sign-in screen, or first-admin setup when no accounts exist yet.
export function Login() {
  const a = useAuth();
  const setup = a.needsSetup;
  const [f, setF] = useState({ name: "", username: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (setup && f.password !== f.confirm) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      if (setup) await setupFirstAdmin(f.name, f.username, f.password);
      else await login(f.username, f.password);
    } catch (e2) { setErr(e2.message || String(e2)); }
    setBusy(false);
  };

  return (
    <div className="loginwrap">
      <form className="loginbox" onSubmit={submit}>
        <div className="logintitle">Parks Avy FX Tool</div>
        <div className="muted" style={{ marginBottom: 18 }}>{setup ? "Create the first admin account. You can add the rest of the team after signing in." : "Banff · Yoho · Kootenay Visitor Safety"}</div>
        {setup && <><label className="lbl req">Your name</label><input className="inp" autoFocus value={f.name} onChange={set("name")} placeholder="As it should appear on forecasts" /></>}
        <label className="lbl req" style={setup ? { marginTop: 14 } : undefined}>Username</label>
        <input className="inp" autoFocus={!setup} autoComplete="username" autoCapitalize="none" value={f.username} onChange={set("username")} />
        <label className="lbl req" style={{ marginTop: 14 }}>Password</label>
        <input className="inp" type="password" autoComplete={setup ? "new-password" : "current-password"} value={f.password} onChange={set("password")} />
        {setup && <><label className="lbl req" style={{ marginTop: 14 }}>Confirm password</label><input className="inp" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></>}
        {(err || a.error) && <div className="loginerr">{err || a.error}</div>}
        <button className="btn primary" style={{ width: "100%", marginTop: 20, height: 38 }} disabled={busy || !f.username || !f.password || (setup && !f.name)}>{busy ? "…" : setup ? "Create admin account" : "Sign in"}</button>
        {a.error && a.error.startsWith("Can't reach") && <button type="button" className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => boot()}>Try again</button>}
        {!setup && <div className="muted" style={{ marginTop: 16, fontSize: 13 }}>Forgot your password? Ask an admin to reset it.</div>}
      </form>
    </div>
  );
}
