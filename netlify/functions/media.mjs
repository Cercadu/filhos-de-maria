import { getStore } from "@netlify/blobs";

function store() {
  return getStore({ name: "afim-media" });
}

export default async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id) return new Response("Not found", { status: 404 });

  const result = await store().getWithMetadata(id, { type: "arrayBuffer" });
  if (!result || !result.data) return new Response("Not found", { status: 404 });

  const meta = result.metadata || {};
  return new Response(result.data, {
    headers: {
      "content-type": meta.contentType || "application/octet-stream",
      "content-disposition": `inline; filename="${(meta.filename || id).replace(/"/g, "")}"`,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/media/*" };
