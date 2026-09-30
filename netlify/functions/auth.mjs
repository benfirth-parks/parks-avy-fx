// Accounts and sessions.
// GET  → { user, needsSetup, team, users? }   (users only for admins)
// POST { action, ... } with action one of:
//   setup            { code, name, username, password }  first admin; needs ADMIN_SETUP_CODE.
//                    Once accounts exist, the same code recovers admin access: it creates
//                    or resets that username as an admin (e.g. if a password is lost).
//   login            { username, password }
//   logout
//   change-password  { current, password }
//   add-user         { name, username, password, admin }   admin
//   reset-password   { username, password }                admin
//   set-admin        { username, admin }                   admin
//   remove-user      { username }                          admin
import { timingSafeEqual } from "node:crypto";
import { openStore, loadUsers, saveUsers, currentUser, hashPassword, checkPassword, validPassword, validUsername, normUsername, sessionCookie, clearCookie, json, unauthorized } from "../lib/auth.mjs";

const LOCK_AFTER = 10, LOCK_MS = 15 * 60 * 1000;
// Secret set in the Netlify environment (never in the repo). Without it, setup is closed.
const setupCode = () => (process.env.ADMIN_SETUP_CODE || "").trim();
const codeOk = (given) => {
  const want = setupCode(), got = String(given || "").trim();
  if (!want || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
};

export default async (req) => {
  try {
    return await handle(req, openStore());
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
};

const cleanName = (n) => String(n || "").trim().replace(/\s+/g, " ").slice(0, 60);
const team = (users) => Object.values(users).map((u) => u.name).sort((a, b) => a.localeCompare(b));
const listing = (users) => Object.entries(users).map(([username, u]) => ({ username, name: u.name, admin: !!u.admin, created: u.created || null })).sort((a, b) => a.name.localeCompare(b.name));

export async function handle(req, store) {
  const users = await loadUsers(store);
  const me = await currentUser(req, store, users);
  const needsSetup = Object.keys(users).length === 0;

  if (req.method === "GET") {
    return json({ user: me, needsSetup, setupAvailable: !!setupCode(), team: me ? team(users) : [], ...(me?.admin ? { users: listing(users) } : {}) });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = body?.action;

  if (action === "setup") {
    if (!setupCode()) return json({ error: "Admin setup is closed. Set ADMIN_SETUP_CODE in the Netlify environment to open it." }, 403);
    // Shares the login lockout so the code can't be guessed.
    const failKey = "auth/fails/__setup";
    const fails = (await store.get(failKey, { type: "json" })) || { n: 0, until: 0 };
    if (fails.until > Date.now()) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    if (!codeOk(body.code)) {
      const n = fails.n + 1;
      await store.setJSON(failKey, n >= LOCK_AFTER ? { n: 0, until: Date.now() + LOCK_MS } : { n, until: 0 });
      return json({ error: "Wrong setup code." }, 401);
    }
    if (fails.n) await store.delete(failKey);
    const username = normUsername(body.username), name = cleanName(body.name);
    if (!name) return json({ error: "Enter your name." }, 400);
    if (!validUsername(username)) return json({ error: "Username: 2–40 letters, numbers, dots, dashes or underscores." }, 400);
    if (!validPassword(body.password)) return json({ error: "Password must be at least 8 characters." }, 400);
    const prev = users[username];
    users[username] = { ...(prev || { created: new Date().toISOString() }), name, admin: true, v: (prev?.v || 0) + (prev ? 1 : 0), ...hashPassword(body.password) };
    await saveUsers(store, users);
    return json({ user: { username, name, admin: true } }, 200, { "set-cookie": await sessionCookie(store, username, users[username]) });
  }

  if (action === "login") {
    const username = normUsername(body.username);
    const failKey = `auth/fails/${username.replace(/[^a-z0-9._-]/g, "_")}`;
    const fails = (await store.get(failKey, { type: "json" })) || { n: 0, until: 0 };
    if (fails.until > Date.now()) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    const user = users[username];
    if (!user || !checkPassword(body.password, user)) {
      const n = fails.n + 1;
      await store.setJSON(failKey, n >= LOCK_AFTER ? { n: 0, until: Date.now() + LOCK_MS } : { n, until: 0 });
      return json({ error: "Wrong username or password." }, 401);
    }
    if (fails.n) await store.delete(failKey);
    return json({ user: { username, name: user.name, admin: !!user.admin } }, 200, { "set-cookie": await sessionCookie(store, username, user) });
  }

  if (action === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookie() });

  if (!me) return unauthorized();

  if (action === "change-password") {
    const user = users[me.username];
    if (!checkPassword(body.current, user)) return json({ error: "Current password is wrong." }, 400);
    if (!validPassword(body.password)) return json({ error: "New password must be at least 8 characters." }, 400);
    Object.assign(user, hashPassword(body.password), { v: (user.v || 0) + 1 });
    await saveUsers(store, users);
    // Other devices are signed out; this one gets a fresh session.
    return json({ ok: true }, 200, { "set-cookie": await sessionCookie(store, me.username, user) });
  }

  if (!me.admin) return json({ error: "Only an admin can manage accounts." }, 403);
  const username = normUsername(body.username);
  const target = users[username];
  const admins = Object.values(users).filter((u) => u.admin).length;

  if (action === "add-user") {
    const name = cleanName(body.name);
    if (!name) return json({ error: "Enter a name." }, 400);
    if (!validUsername(username)) return json({ error: "Username: 2–40 letters, numbers, dots, dashes or underscores." }, 400);
    if (target) return json({ error: "That username is taken." }, 409);
    if (!validPassword(body.password)) return json({ error: "Password must be at least 8 characters." }, 400);
    users[username] = { name, admin: !!body.admin, v: 0, created: new Date().toISOString(), ...hashPassword(body.password) };
    await saveUsers(store, users);
    return json({ users: listing(users), team: team(users) });
  }
  if (!target) return json({ error: "No such user." }, 404);
  if (action === "reset-password") {
    if (!validPassword(body.password)) return json({ error: "Password must be at least 8 characters." }, 400);
    Object.assign(target, hashPassword(body.password), { v: (target.v || 0) + 1 });
  } else if (action === "set-admin") {
    if (!body.admin && target.admin && admins <= 1) return json({ error: "Keep at least one admin." }, 400);
    target.admin = !!body.admin;
  } else if (action === "remove-user") {
    if (username === me.username) return json({ error: "You can't remove your own account." }, 400);
    delete users[username];
  } else return json({ error: "Unknown action" }, 400);
  await saveUsers(store, users);
  return json({ users: listing(users), team: team(users) });
}
