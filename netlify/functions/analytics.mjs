import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";

const KEY = "views.json";
const KEEP_DAYS = 35;
const KNOWN_PATHS = ["/", "/liturgia.html", "/oracao.html", "/diocese.html"];
const PATH_LABELS = {
  "/": "Início",
  "/liturgia.html": "Liturgia",
  "/oracao.html": "Orações",
  "/diocese.html": "Diocese",
};

function store() {
  return getStore({ name: "afim-analytics", consistency: "strong" });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizePath(raw) {
  if (!raw) return "/";
  let p = String(raw).split("?")[0].split("#")[0];
  if (p === "" || p === "/index.html") p = "/";
  return KNOWN_PATHS.includes(p) ? p : null;
}

async function readAll() {
  const data = await store().get(KEY, { type: "json" });
  return data || { daily: {}, totals: {} };
}

async function writeAll(data) {
  await store().setJSON(KEY, data);
}

function pruneOldDays(daily) {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  Object.keys(daily).forEach((day) => {
    if (new Date(`${day}T00:00:00`).getTime() < cutoff) delete daily[day];
  });
}

function sumRange(daily, days) {
  const totals = {};
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  Object.entries(daily).forEach(([day, counts]) => {
    if (new Date(`${day}T00:00:00`).getTime() < cutoff) return;
    Object.entries(counts).forEach(([path, n]) => {
      totals[path] = (totals[path] || 0) + n;
    });
  });
  return totals;
}

function grandTotal(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

export default async (req) => {
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    const path = normalizePath(body.path);
    if (!path) return jsonResponse({ ok: true }); // ignora caminhos desconhecidos, sem erro

    const data = await readAll();
    const day = todayKey();
    data.daily[day] = data.daily[day] || {};
    data.daily[day][path] = (data.daily[day][path] || 0) + 1;
    data.totals[path] = (data.totals[path] || 0) + 1;
    pruneOldDays(data.daily);
    await writeAll(data);
    return jsonResponse({ ok: true });
  }

  if (req.method === "GET") {
    if (!isAuthorized(req)) return unauthorized();
    const data = await readAll();
    const today = sumRange(data.daily, 1);
    const last7 = sumRange(data.daily, 7);
    const last30 = sumRange(data.daily, 30);

    const pages = KNOWN_PATHS.map((path) => ({
      path,
      label: PATH_LABELS[path] || path,
      today: today[path] || 0,
      last7: last7[path] || 0,
      last30: last30[path] || 0,
      total: data.totals[path] || 0,
    })).sort((a, b) => b.last30 - a.last30);

    return jsonResponse({
      summary: {
        today: grandTotal(today),
        last7: grandTotal(last7),
        last30: grandTotal(last30),
        total: grandTotal(data.totals),
      },
      pages,
    });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/track" };
