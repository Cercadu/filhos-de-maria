import { getStore } from "@netlify/blobs";
import { jsonResponse, verifyPasswordAgainstHash, signToken } from "./_lib/auth.mjs";

function store() {
  return getStore({ name: "afim-users", consistency: "strong" });
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, { status: 400 });
  }

  const username = (body.username || "").trim().toLowerCase();
  const password = body.password || "";
  if (!username || !password) {
    return jsonResponse({ error: "missing_fields" }, { status: 400 });
  }

  const data = await store().get("users.json", { type: "json" });
  const users = (data && data.users) || [];
  const user = users.find((u) => u.username === username);

  if (!user || !verifyPasswordAgainstHash(password, user.passwordHash)) {
    return jsonResponse({ error: "invalid_credentials" }, { status: 401 });
  }

  return jsonResponse({ ok: true, token: signToken(username), username });
};

export const config = { path: "/api/login" };
