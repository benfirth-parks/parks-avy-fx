// Per-person accounts for the Parks Avy FX Tool, stored in Netlify Blobs.
// Passwords: scrypt with a per-user salt. Sessions: HMAC-signed cookie (30 days);
// the signing secret is generated on first use and kept in Blobs (or AUTH_SECRET).
// Changing a password, resetting it or removing the user bumps `v`, which ends
// every session that user has open.
import { getStore } from "@netlify/blobs";
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE = "avyfx_session";
const USERS = "auth/users";
const SECRET = "auth/secret";
const MAX_AGE = 30 * 24 * 3600;

export const openStore = () => getStore({ name: "parks-avy-fx", consistency: "strong" });

export async function loadUsers(store) {
  return (await store.get(USERS, { type: "json" })) || {};
}
export const saveUsers = (store, users) => store.setJSON(USERS, users);

async function secret(store) {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  let s = await store.get(SECRET, { type: "text" });
  if (!s) { s = randomBytes(32).toString("hex"); await store.set(SECRET, s); }
  return s;
}

export function hashPassword(pw, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(String(pw), salt, 64).toString("hex") };
}
export function checkPassword(pw, user) {
  if (!user?.hash || !user?.salt) return false;
  const a = Buffer.from(scryptSync(String(pw), user.salt, 64).toString("hex"));
  const b = Buffer.from(user.hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const validPassword = (pw) => typeof pw === "string" && pw.length >= 8 && pw.length <= 200;
export const normUsername = (u) => String(u || "").trim().toLowerCase();
export const validUsername = (u) => /^[a-z0-9][a-z0-9._-]{1,39}$/.test(u);

const b64 = (s) => Buffer.from(s).toString("base64url");
const unb64 = (s) => Buffer.from(s, "base64url").toString();

export async function sessionCookie(store, username, user) {
  const payload = b64(JSON.stringify({ u: username, v: user.v || 0, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  const sig = createHmac("sha256", await secret(store)).update(payload).digest("base64url");
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

function readCookie(req) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === COOKIE) return part.slice(i + 1);
  }
  return "";
}

// The signed-in user for this request, or null. Checks the signature, expiry,
// that the account still exists and that its session version hasn't moved on.
export async function currentUser(req, store, users) {
  const token = readCookie(req);
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot), sig = token.slice(dot + 1);
  const want = createHmac("sha256", await secret(store)).update(payload).digest("base64url");
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let p;
  try { p = JSON.parse(unb64(payload)); } catch { return null; }
  if (!p || typeof p.exp !== "number" || p.exp * 1000 < Date.now()) return null;
  users = users || (await loadUsers(store));
  const user = users[p.u];
  if (!user || (user.v || 0) !== p.v) return null;
  return { username: p.u, name: user.name, admin: !!user.admin };
}

export const json = (o, status = 200, headers = {}) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
export const unauthorized = () => json({ error: "Sign in required" }, 401);
