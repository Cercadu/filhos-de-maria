import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";
import { stripHtml } from "./_lib/sanitize.mjs";

const KEY = "testimonials.json";
const MAX_MESSAGE_LEN = 1200;
const MAX_NAME_LEN = 80;

function store() {
  return getStore({ name: "afim-testimonials", consistency: "strong" });
}

async function readAll() {
  const data = await store().get(KEY, { type: "json" });
  return (data && data.testimonials) || [];
}

async function writeAll(testimonials) {
  await store().setJSON(KEY, { testimonials });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicView(t) {
  return {
    id: t.id,
    name: t.name || "Um irmão(ã) da comunidade",
    message: t.message,
    createdAt: t.createdAt,
  };
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = isAuthorized(req);

  if (req.method === "GET") {
    const testimonials = await readAll();
    if (admin) {
      const sorted = [...testimonials].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return jsonResponse({ testimonials: sorted });
    }
    const approved = testimonials
      .filter((t) => t.status === "approved")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicView);
    return jsonResponse({ testimonials: approved });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }

    const message = stripHtml(body.message || "").slice(0, MAX_MESSAGE_LEN);
    if (!message) return jsonResponse({ error: "missing_message" }, { status: 400 });

    const testimonial = {
      id: makeId(),
      name: stripHtml(body.name || "").slice(0, MAX_NAME_LEN) || null,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const testimonials = await readAll();
    testimonials.unshift(testimonial);
    await writeAll(testimonials);
    return jsonResponse({ ok: true, id: testimonial.id });
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

    const testimonials = await readAll();
    const idx = testimonials.findIndex((t) => t.id === body.id);
    if (idx === -1) return jsonResponse({ error: "not_found" }, { status: 404 });
    testimonials[idx].status = body.status;
    await writeAll(testimonials);
    return jsonResponse({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!admin) return unauthorized();
    const id = url.searchParams.get("id");
    if (!id) return jsonResponse({ error: "missing_id" }, { status: 400 });
    const testimonials = await readAll();
    await writeAll(testimonials.filter((t) => t.id !== id));
    return jsonResponse({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/testimonials" };
