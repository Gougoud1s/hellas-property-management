/**
 * Guards against `javascript:`/`data:`/`vbscript:` and other script-bearing URI
 * schemes reaching an anchor `href` (a stored-XSS vector when the value is
 * user-supplied, e.g. a tenant's website). Returns a safe absolute URL or
 * `undefined` — never the raw input.
 */
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function sanitizeExternalUrl(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // Bare domains ("example.gr") have no scheme — default them to https so they
  // parse as absolute URLs rather than relative paths.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
