import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";
import { sanitizeHtml, stripHtml } from "./_lib/sanitize.mjs";

const KEY = "posts.json";
const MAX_ATTACHMENTS = 4;

function store() {
  return getStore({ name: "afim-posts", consistency: "strong" });
}

async function readAll(originForSeed) {
  const result = await store().getWithMetadata(KEY, { type: "json" });
  if (result && result.data) {
    return { posts: result.data.posts || [], updatedAt: result.metadata?.updatedAt || "" };
  }

  // Primeira execução: semeia com o informativo inicial publicado no site
  if (originForSeed) {
    try {
      const seedResponse = await fetch(`${originForSeed}/data/seed-posts.json`);
      if (seedResponse.ok) {
        const seedPosts = await seedResponse.json();
        const updatedAt = String(Date.now());
        await store().setJSON(KEY, { posts: seedPosts }, { metadata: { updatedAt } });
        return { posts: seedPosts, updatedAt };
      }
    } catch (err) {
      console.error("Falha ao semear posts iniciais.", err);
    }
  }
  return { posts: [], updatedAt: "" };
}

async function writeAll(posts) {
  const updatedAt = String(Date.now());
  await store().setJSON(KEY, { posts }, { metadata: { updatedAt } });
  return { updatedAt };
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function excerptFrom(body, provided) {
  if (provided && provided.trim()) return provided.trim().slice(0, 280);
  return stripHtml(body).slice(0, 220);
}

// Datas vêm como "YYYY-MM-DD" (input type=date); normaliza ou descarta valores inválidos.
function normalizeDate(value) {
  if (!value) return null;
  const d = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function isWithinSchedule(post) {
  const now = Date.now();
  if (post.publishAt) {
    const start = new Date(`${post.publishAt}T00:00:00`).getTime();
    if (now < start) return false;
  }
  if (post.unpublishAt) {
    const end = new Date(`${post.unpublishAt}T23:59:59`).getTime();
    if (now > end) return false;
  }
  return true;
}

export default async (req) => {
  const url = new URL(req.url);
  const admin = isAuthorized(req);

  if (req.method === "GET") {
    const { posts } = await readAll(url.origin);
    const visible = admin ? posts : posts.filter((p) => p.status === "published" && isWithinSchedule(p));
    visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return jsonResponse({ posts: visible });
  }

  if (req.method === "POST") {
    if (!admin) return unauthorized();
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, { status: 400 });
    }
    const title = (body.title || "").trim();
    const html = sanitizeHtml(body.body || "");
    if (!title || !html) {
      return jsonResponse({ error: "missing_fields" }, { status: 400 });
    }
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : [];

    const now = new Date().toISOString();
    const post = {
      id: makeId(),
      title,
      excerpt: excerptFrom(html, body.excerpt),
      body: html,
      coverImage: body.coverImage || null,
      attachments,
      status: body.status === "draft" ? "draft" : "published",
      author: (body.author || "").trim() || "AFIM",
      publishAt: normalizeDate(body.publishAt),
      unpublishAt: normalizeDate(body.unpublishAt),
      createdAt: now,
      updatedAt: now,
    };

    const { posts } = await readAll();
    posts.unshift(post);
    const result = await writeAll(posts);
    return jsonResponse({ ok: true, post, updatedAt: result.updatedAt });
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

    const { posts } = await readAll();
    const idx = posts.findIndex((p) => p.id === body.id);
    if (idx === -1) return jsonResponse({ error: "not_found" }, { status: 404 });

    const existing = posts[idx];
    const html = body.body !== undefined ? sanitizeHtml(body.body) : existing.body;
    const updated = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() : existing.title,
      body: html,
      excerpt: excerptFrom(html, body.excerpt !== undefined ? body.excerpt : existing.excerpt),
      coverImage: body.coverImage !== undefined ? body.coverImage : existing.coverImage,
      attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, MAX_ATTACHMENTS) : existing.attachments,
      status: body.status === "draft" || body.status === "published" ? body.status : existing.status,
      publishAt: body.publishAt !== undefined ? normalizeDate(body.publishAt) : existing.publishAt,
      unpublishAt: body.unpublishAt !== undefined ? normalizeDate(body.unpublishAt) : existing.unpublishAt,
      updatedAt: new Date().toISOString(),
    };
    posts[idx] = updated;

    const result = await writeAll(posts);
    return jsonResponse({ ok: true, post: updated, updatedAt: result.updatedAt });
  }

  if (req.method === "DELETE") {
    if (!admin) return unauthorized();
    const id = url.searchParams.get("id");
    if (!id) return jsonResponse({ error: "missing_id" }, { status: 400 });

    const { posts } = await readAll();
    const next = posts.filter((p) => p.id !== id);
    await writeAll(next);
    return jsonResponse({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/posts" };
