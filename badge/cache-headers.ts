/**
 * How a badge answer that is kept long tells its two lifetimes apart:
 *
 * - `off`: one `Cache-Control` for everyone, as written at the answer.
 * - `probe`: as `off`, and as `on` for a request whose query has `probe=1`.
 * - `on`: `Cache-Control` carries the short lifetime, for browsers and image proxies; the long one and the stale
 *   directives go to the edge in its own header.
 * - `on-no-swr`: as `on`, without `stale-while-revalidate`.
 * - `short`: the short lifetime alone; how long the edge keeps the answer is handled outside this repo.
 */
export const BADGE_CACHE_MODES = ['off', 'probe', 'on', 'on-no-swr', 'short'] as const;

export type BadgeCacheMode = (typeof BADGE_CACHE_MODES)[number];

export type BadgeCacheHeaders = { 'Cache-Control': string; 'Cloudflare-CDN-Cache-Control'?: string };

/** The mode `BADGE_CACHE_SPLIT` names; `off` when it is unset or not a mode. */
export function badgeCacheModeOf(env: Record<string, string | undefined>): BadgeCacheMode {
  const value = env.BADGE_CACHE_SPLIT?.trim();
  return BADGE_CACHE_MODES.find((mode) => mode === value) ?? 'off';
}

/** Whether the request asks for the split headers under `probe`. */
export const isCacheProbe = (search: URLSearchParams) => search.get('probe') === '1';

const directiveOf = (directives: string[], name: string) =>
  directives.find((directive) => new RegExp(`^${name}=\\d+$`).test(directive));

/**
 * The cache headers of a long-kept answer. `value` is its `Cache-Control` as one header, with `max-age` for browsers
 * and `s-maxage` for the edge; a value without both is sent as it is in every mode.
 */
export function cacheHeadersOf(value: string, mode: BadgeCacheMode, probe: boolean): BadgeCacheHeaders {
  if (mode === 'off' || (mode === 'probe' && !probe)) {
    return { 'Cache-Control': value };
  }

  const directives = value.split(',').map((directive) => directive.trim());
  const maxAge = directiveOf(directives, 'max-age');
  const sharedMaxAge = directiveOf(directives, 's-maxage');
  if (!maxAge || !sharedMaxAge) {
    return { 'Cache-Control': value };
  }

  const browser = `public, ${maxAge}`;
  if (mode === 'short') {
    return { 'Cache-Control': browser };
  }

  const stale = directives.filter(
    (directive) =>
      directive.startsWith('stale-') && !(mode === 'on-no-swr' && directive.startsWith('stale-while-revalidate')),
  );
  return {
    'Cache-Control': browser,
    'Cloudflare-CDN-Cache-Control': [sharedMaxAge.replace('s-maxage', 'max-age'), ...stale].join(', '),
  };
}

/** `cacheHeadersOf` for a request, under the mode the environment names. */
export function badgeCacheHeaders(value: string, search: URLSearchParams): BadgeCacheHeaders {
  return cacheHeadersOf(value, badgeCacheModeOf(process.env), isCacheProbe(search));
}
