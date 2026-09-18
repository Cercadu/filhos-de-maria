// Sanitização simples de HTML vindo do editor do admin.
// Remove scripts/estilos embutidos, atributos de evento e links "javascript:".
// Não é um sanitizador completo (não há DOM no runtime da function), mas cobre
// o vetor de risco real aqui: colar HTML de fontes externas (Word, sites, etc).
export function sanitizeHtml(html) {
  if (typeof html !== "string") return "";
  let out = html;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/ on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
  out = out.replace(/<(iframe|object|embed|form)[\s\S]*?>[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(iframe|object|embed|form)[^>]*>/gi, "");
  return out.trim();
}

export function stripHtml(html) {
  return sanitizeHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
