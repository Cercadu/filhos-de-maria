import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";
import { stripHtml } from "./_lib/sanitize.mjs";

const KEY = "candles.json";
const MAX_NAME_LEN = 60;
const VISIBLE_HOURS = 24;

function store() {
  return getStore({ name: "afim-candles", consistency: "strong" });
}

async function readAll() {
  const data = await store().get(KEY, { type: "json" });
  return (data && data.candles) || [];
}

async function writeAll(candles) {
  await store().setJSON(KEY, { candles });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pruneExpired(candles) {
  const cutoff = Date.now() - VISIBLE_HOURS * 60 * 60 * 1000;
  return candles.filter((c) => new Date(c.createdAt).getTime() >= cutoff);
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = isAuthorized(req);

  if (req.method === "GET") {
    const candles = pruneExpired(await readAll());
    candles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return jsonResponse({ candles });
  }

  if (req.method === "POST") {
    const candle = {
      id: makeId(),
      name: stripHtml((await req.json().catch(() => ({}))).name || "").slice(0, MAX_NAME_LEN) || null,
      createdAt: new Date().toISOString(),
    };

    const candles = pruneExpired(await readAll());
    candles.unshift(candle);
    await writeAll(candles);
    return jsonResponse({ ok: true, candle });
  }

  if (req.method === "DELETE") {
    if (!admin) return unauthorized();
    const id = url.searchParams.get("id");
    if (!id) return jsonResponse({ error: "missing_id" }, { status: 400 });
    const candles = await readAll();
    await writeAll(candles.filter((c) => c.id !== id));
    return jsonResponse({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/candles" };
