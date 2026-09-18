import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized, hashPassword, getUsername } from "./_lib/auth.mjs";

const KEY = "users.json";
const MIN_USERNAME = 3;
const MIN_PASSWORD = 6;

function store() {
  return getStore({ name: "afim-users", consistency: "strong" });
}

async function readAll() {
  const data = await store().get(KEY, { type: "json" });
  return (data && data.users) || [];
}

async function writeAll(users) {
  await store().setJSON(KEY, { users });
}

function normalizeUsername(u) {
  return (u || "").trim().toLowerCase();
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = isAuthorized(req);

  if (req.method === "GET") {
    const users = await readAll();
    if (url.searchParams.get("check") === "1") {
      return jsonResponse({ hasUsers: users.length > 0 });
    }
    if (!admin) return unauthorized();
    return jsonResponse({ users: users.map((u) => ({ username: u.username, createdAt: u.createdAt })) });
  }

  if (req.method === "POST") {
    const users = await readAll();
    const bootstrap = users.length === 0;
    if (!bootstrap && !admin) return unauthorized();

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    const username = normalizeUsername(body.username);
    const password = body.password || "";
    if (username.length < MIN_USERNAME || password.length < MIN_PASSWORD) {
      return jsonResponse({ error: "invalid_fields" }, { status: 400 });
    }
    if (users.some((u) => u.username === username)) {
      return jsonResponse({ error: "username_taken" }, { status: 409 });
    }

    users.push({ username, passwordHash: hashPassword(password), createdAt: new Date().toISOString() });
    await writeAll(users);
    return jsonResponse({ ok: true, bootstrap });
  }

  if (req.method === "PATCH") {
    if (!admin) return unauthorized();
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    const password = body.password || "";
    if (password.length < MIN_PASSWORD) return jsonResponse({ error: "invalid_password" }, { status: 400 });

    // Sem "username" no corpo, a pessoa troca a própria senha; admin pode informar outro username.
    const username = normalizeUsername(body.username) || getUsername(req);

    const users = await readAll();
    const idx = users.findIndex((u) => u.username === username);
    if (idx === -1) return jsonResponse({ error: "not_found" }, { status: 404 });
    users[idx].passwordHash = hashPassword(password);
    await writeAll(users);
    return jsonResponse({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!admin) return unauthorized();
    const username = normalizeUsername(url.searchParams.get("username"));
    const users = await readAll();
    if (users.length <= 1) {
      return jsonResponse({ error: "cannot_delete_last_user" }, { status: 400 });
    }
    await writeAll(users.filter((u) => u.username !== username));
    return jsonResponse({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/users" };
