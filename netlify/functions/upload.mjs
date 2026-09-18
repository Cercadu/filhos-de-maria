import { getStore } from "@netlify/blobs";
import { isAuthorized, jsonResponse, unauthorized } from "./_lib/auth.mjs";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const IMAGE_MAX = 3 * 1024 * 1024; // 3MB
const DOC_MAX = 5 * 1024 * 1024; // 5MB

function store() {
  return getStore({ name: "afim-media" });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!isAuthorized(req)) return unauthorized();

  let form;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return jsonResponse({ error: "missing_file" }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  const kind = IMAGE_TYPES.has(contentType) ? "image" : DOC_TYPES.has(contentType) ? "document" : null;
  if (!kind) {
    return jsonResponse({ error: "unsupported_type", contentType }, { status: 415 });
  }

  const max = kind === "image" ? IMAGE_MAX : DOC_MAX;
  if (file.size > max) {
    return jsonResponse({ error: "file_too_large", max }, { status: 413 });
  }

  const id = makeId();
  const buffer = await file.arrayBuffer();
  await store().set(id, buffer, {
    metadata: { contentType, filename: file.name || id, size: file.size, kind },
  });

  return jsonResponse({
    ok: true,
    id,
    name: file.name || id,
    contentType,
    size: file.size,
    kind,
    url: `/api/media/${id}`,
  });
};

export const config = { path: "/api/upload" };
