import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";
import { stripHtml } from "./_lib/sanitize.mjs";

const KEY = "prayers.json";
const MAX_MESSAGE_LEN = 1000;
const MAX_NAME_LEN = 80;
const WALL_WINDOW_DAYS = 7;
const CLEANUP_AFTER_DAYS = 30;

function store() {
  return getStore({ name: "afim-prayers", consistency: "strong" });
}

async function readAll() {
  const data = await store().get(KEY, { type: "json" });
  return (data && data.prayers) || [];
}

async function writeAll(prayers) {
  await store().setJSON(KEY, { prayers });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicView(p) {
  return {
    id: p.id,
    name: p.isPublic ? p.name || "Um irmão(ã) em oração" : null,
    message: p.message,
    createdAt: p.createdAt,
    prayCount: p.prayCount || 0,
    isPublic: p.isPublic,
  };
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = isAuthorized(req);

  if (req.method === "GET") {
    const prayers = await readAll();
    if (admin) {
      const sorted = [...prayers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return jsonResponse({ prayers: sorted });
    }
    const cutoff = Date.now() - WALL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const approved = prayers
      .filter((p) => p.status === "approved" && p.isPublic && new Date(p.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicView);
    return jsonResponse({ prayers: approved });
  }

  if (req.method === "POST") {
    const action = url.searchParams.get("action");
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }

    if (action === "pray") {
      if (!body.id) return jsonResponse({ error: "missing_id" }, { status: 400 });
      const prayers = await readAll();
      const idx = prayers.findIndex((p) => p.id === body.id);
      if (idx === -1) return jsonResponse({ error: "not_found" }, { status: 404 });
      prayers[idx].prayCount = (prayers[idx].prayCount || 0) + 1;
      await writeAll(prayers);
      return jsonResponse({ ok: true, prayCount: prayers[idx].prayCount });
    }

    const message = stripHtml(body.message || "").slice(0, MAX_MESSAGE_LEN);
    if (!message) return jsonResponse({ error: "missing_message" }, { status: 400 });

    const prayer = {
      id: makeId(),
      name: stripHtml(body.name || "").slice(0, MAX_NAME_LEN) || null,
      message,
      contact: stripHtml(body.contact || "").slice(0, 120) || null,
      isPublic: body.isPublic !== false,
      status: "pending",
      prayCount: 0,
      createdAt: new Date().toISOString(),
    };

    const prayers = await readAll();
    prayers.unshift(prayer);
    await writeAll(prayers);
    return jsonResponse({ ok: true, id: prayer.id });
  }

  if (req.method === "PATCH") {
    if (!admin) return unauthorized();
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    if (!body.id || !body.status) return jsonResponse({ error: "missing_fields" }, { status: 400 });
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return jsonResponse({ error: "invalid_status" }, { status: 400 });
    }

    const prayers = await readAll();
    const idx = prayers.findIndex((p) => p.id === body.id);
    if (idx === -1) return jsonResponse({ error: "not_found" }, { status: 404 });
    prayers[idx].status = body.status;
    await writeAll(prayers);
    return jsonResponse({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!admin) return unauthorized();

    if (url.searchParams.get("cleanup") === "1") {
      const cutoff = Date.now() - CLEANUP_AFTER_DAYS * 24 * 60 * 60 * 1000;
      const prayers = await readAll();
      const kept = prayers.filter(
        (p) => p.status === "pending" || new Date(p.createdAt).getTime() >= cutoff
      );
      await writeAll(kept);
      return jsonResponse({ ok: true, removed: prayers.length - kept.length });
    }

    const id = url.searchParams.get("id");
    if (!id) return jsonResponse({ error: "missing_id" }, { status: 400 });
    const prayers = await readAll();
    await writeAll(prayers.filter((p) => p.id !== id));
    return jsonResponse({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/prayers" };
