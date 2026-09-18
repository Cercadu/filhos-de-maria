import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";
import { stripHtml } from "./_lib/sanitize.mjs";

const KEY = "forms.json";

function store() {
  return getStore({ name: "afim-forms", consistency: "strong" });
}

async function readAll() {
  const data = await store().get(KEY, { type: "json" });
  return (data && data.forms) || [];
}

async function writeAll(forms) {
  await store().setJSON(KEY, { forms });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = isAuthorized(req);

  if (req.method === "GET") {
    const forms = await readAll();
    const visible = admin ? forms : forms.filter((f) => f.active);
    return jsonResponse({ forms: visible });
  }

  if (req.method === "POST") {
    if (!admin) return unauthorized();
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    const title = stripHtml(body.title || "").slice(0, 120);
    const formUrl = (body.url || "").trim();
    if (!title || !isValidUrl(formUrl)) {
      return jsonResponse({ error: "missing_fields" }, { status: 400 });
    }

    const form = {
      id: makeId(),
      title,
      description: stripHtml(body.description || "").slice(0, 300),
      url: formUrl,
      active: body.active !== false,
      createdAt: new Date().toISOString(),
    };

    const forms = await readAll();
    forms.unshift(form);
    await writeAll(forms);
    return jsonResponse({ ok: true, form });
  }

  if (req.method === "PUT") {
    if (!admin) return unauthorized();
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    if (!body.id) return jsonResponse({ error: "missing_id" }, { status: 400 });

    const forms = await readAll();
    const idx = forms.findIndex((f) => f.id === body.id);
    if (idx === -1) return jsonResponse({ error: "not_found" }, { status: 404 });

    const existing = forms[idx];
    const formUrl = body.url !== undefined ? body.url.trim() : existing.url;
    if (body.url !== undefined && !isValidUrl(formUrl)) {
      return jsonResponse({ error: "invalid_url" }, { status: 400 });
    }

    forms[idx] = {
      ...existing,
      title: body.title !== undefined ? stripHtml(body.title).slice(0, 120) : existing.title,
      description: body.description !== undefined ? stripHtml(body.description).slice(0, 300) : existing.description,
      url: formUrl,
      active: body.active !== undefined ? !!body.active : existing.active,
    };

    await writeAll(forms);
    return jsonResponse({ ok: true, form: forms[idx] });
  }

  if (req.method === "DELETE") {
    if (!admin) return unauthorized();
    const id = url.searchParams.get("id");
    if (!id) return jsonResponse({ error: "missing_id" }, { status: 400 });
    const forms = await readAll();
    await writeAll(forms.filter((f) => f.id !== id));
    return jsonResponse({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/forms" };
