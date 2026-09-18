import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado nas variáveis de ambiente");
  return secret;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordAgainstHash(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function signToken(username) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + TOKEN_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expectedSig = createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload.u;
  } catch {
    return null;
  }
}

function bearerToken(req) {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export function isAuthorized(req) {
  return !!verifyToken(bearerToken(req));
}

export function getUsername(req) {
  return verifyToken(bearerToken(req));
}

export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export function unauthorized() {
  return jsonResponse({ error: "unauthorized" }, { status: 401 });
}
