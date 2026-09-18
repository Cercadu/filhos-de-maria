export function getValidPasswords() {
  return (process.env.ADMIN_PASSWORDS || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function isAuthorized(req) {
  const password = req.headers.get("x-admin-password");
  if (!password) return false;
  const valid = getValidPasswords();
  return valid.length > 0 && valid.includes(password);
}

export const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

export function unauthorized() {
  return jsonResponse({ error: "unauthorized" }, { status: 401 });
}
