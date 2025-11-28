export function sanitizeSearchQuery(input: string): string {
  if (!input) return "";
  let s = input.normalize("NFKC");
  // Remove control chars (C0 control codes and DEL)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x1F\x7F]/g, "");
  // Remove characters that can break PostgREST filter syntax (commas split OR clauses)
  s = s.replace(/[',";(),]/g, "");
  // Escape SQL LIKE wildcards and backslash
  s = s.replace(/[%_\\]/g, "\\$&");
  s = s.trim();
  if (s.length > 200) s = s.slice(0, 200);
  return s;
}

export function buildIlikePattern(sanitized: string): string {
  if (!sanitized) return "";
  return `%${sanitized}%`;
}
