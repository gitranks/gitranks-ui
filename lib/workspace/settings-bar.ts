import type { Audience } from './audience';

/*
 * Which product's bar a page both products share shows, Settings first (page 23): the link that opened it says
 * (`?from=learn`); else the bar the person saw last, which every Learn page and every Contribute page records in a
 * cookie; else the product they use, Learn's bar for someone who only learns. The same answer orders Settings' groups,
 * the product's own first.
 */

/** A product's bar: Learn's, or the workspace's tabs, which are Contribute's. */
export type ProductBar = 'learn' | 'contribute';

/** The cookie that keeps the bar seen last. Not personal: a visitor's browser keeps it too. */
export const LAST_BAR_COOKIE = 'gr_last_bar';

/** A year, in seconds: the cookie's life, renewed on every page with a bar. */
const LAST_BAR_MAX_AGE = 60 * 60 * 24 * 365;

/** The cookie's value as a bar; null for none or anything else. */
export const lastBarOf = (value: string | null | undefined): ProductBar | null =>
  value === 'learn' || value === 'contribute' ? value : null;

/** The bar a `document.cookie` string keeps; null for none. */
export function lastBarInCookies(cookies: string): ProductBar | null {
  for (const part of cookies.split(';')) {
    const [name, value] = part.trim().split('=', 2);
    if (name === LAST_BAR_COOKIE) return lastBarOf(value);
  }
  return null;
}

/** `; Secure` over HTTPS, as the site's other cookies set in the browser; none in local development. */
const secure = () => (globalThis.location?.protocol === 'https:' ? '; Secure' : '');

/** The cookie as `rememberBar` writes it: written again on every page with a bar, so its year starts again there. */
export const lastBarCookieOf = (bar: ProductBar): string =>
  `${LAST_BAR_COOKIE}=${bar}; Path=/; Max-Age=${LAST_BAR_MAX_AGE}; SameSite=Lax${secure()}`;

/** Records the bar this page shows, in the browser, and renews the cookie's year. */
export function rememberBar(bar: ProductBar): void {
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: one plain preference, read by the server on the next request too.
    document.cookie = lastBarCookieOf(bar);
  } catch {
    // Cookies blocked: Settings falls back to the product the person uses.
  }
}

/** Settings and its own pages: the shared pages whose bar is chosen here. */
export const isSharedSettingsPath = (pathname: string): boolean => /^\/my\/settings(?:\/|$)/.test(pathname);

/** The bar Settings shows and the product whose groups come first; `from` is the page's `?from=`. */
export function settingsBarOf({
  from,
  lastBar,
  audience,
}: {
  from: string | string[] | null | undefined;
  lastBar: ProductBar | null;
  audience: Audience;
}): ProductBar {
  if ((Array.isArray(from) ? from[0] : from) === 'learn') return 'learn';
  if (lastBar) return lastBar;
  return audience === 'learner' ? 'learn' : 'contribute';
}
