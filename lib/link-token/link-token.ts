/**
 * Links in our emails carry a token: the only key to what the link reaches. A token never stays in a page's address,
 * where analytics would report it and a link out would pass it on in `Referer`. A link points at `/l/<kind>?t=<token>`,
 * which changes nothing: it keeps the token in a cookie named for its kind and sends the browser on to the kind's page
 * at a clean address. The page reads the cookie; its buttons' actions renew it.
 */

/** Each kind of link, and the page it opens. */
export const LINK_PAGES = {
  /** A follow's confirmation email: the packages and one Confirm button. */
  confirm: '/follow/confirm',
  /** An email's "Unfollow <package>": that follow alone. */
  unfollow: '/follow/unfollow',
  /** An email's "Email settings": every follow of the address. */
  settings: '/following',
  /** An Unsung hero heads-up's "Preview the block": the home card and the archive block as they will look. */
  'hero-preview': '/hero-link/preview',
  /** An Unsung hero heads-up's "No thanks, opt me out": one Opt out button, then Undo. */
  'hero-opt-out': '/hero-link/opt-out',
} as const;

export type LinkKind = keyof typeof LINK_PAGES;

/** A link's kind, from the path; null for one we do not have. */
export function linkKindOf(value: unknown): LinkKind | null {
  return typeof value === 'string' && Object.hasOwn(LINK_PAGES, value) ? (value as LinkKind) : null;
}

/** A stored token's shape: a token of another shape is one nobody holds. */
const TOKEN = /^[A-Za-z0-9_-]{32,256}$/;

export const isLinkToken = (value: unknown): value is string => typeof value === 'string' && TOKEN.test(value);

/** How long a link's cookie lasts: long enough to read the page and press its button; each press renews it. */
export const LINK_COOKIE_MAX_AGE_SEC = 15 * 60;

/**
 * A kind's cookie: `__Host-` in production (Secure, the whole site, no domain), plain in local development. The path is
 * the whole site so the page's own actions receive it. `Lax`, so the link opened from a mail client brings it along.
 */
export function linkCookie(kind: LinkKind, secure = process.env.NODE_ENV === 'production') {
  const base = `gitranks-link-${kind}`;
  return {
    name: secure ? `__Host-${base}` : base,
    options: { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' },
  };
}

/**
 * Sent with `/l/<kind>` and with every page a link opens: no address is passed on to another site, no search engine
 * keeps the page, and no shared cache keeps the answer.
 */
export const LINK_PAGE_HEADERS = {
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'private, no-store',
} as const;

/** `/l/<kind>` and the pages it opens: their answers are never kept, by a shared cache or by the browser. */
const LINK_PATH = /^\/(?:l|follow|hero-link)(?:\/|$)|^\/following\/?$/;

export const isLinkPagePath = (pathname: string) => LINK_PATH.test(pathname);

/** The pages a link opens, as `next.config.ts` matches them to send `LINK_PAGE_HEADERS`. */
export const LINK_PAGE_SOURCES = ['/follow/:path*', '/following', '/following/', '/hero-link/:path*'] as const;

/**
 * The query a link's page is sent to when its link held no usable token: `?e=invalid`. It says only that, never
 * anything of the token, so the page can tell a link that does not work from one whose cookie ran out.
 */
export const LINK_ERROR_PARAM = 'e';
export const LINK_INVALID = 'invalid';

/** Whether a page's `e` query says its link held no usable token. */
export const isInvalidLinkQuery = (value: unknown) =>
  value === LINK_INVALID || (Array.isArray(value) && value.includes(LINK_INVALID));

/**
 * Where `/l/<kind>?t=<token>` sends the browser, and what it keeps: the token when it can be one, and the clean page;
 * or nothing (the kind's cookie cleared, so an older link's token is not shown in its place) and the page with
 * `?e=invalid`. Null for a kind we do not have.
 */
export function linkLandingOf(
  kindParam: unknown,
  tokenParam: unknown,
): { location: string; kind: LinkKind; token: string | null } | null {
  const kind = linkKindOf(kindParam);
  if (!kind) return null;
  const page = LINK_PAGES[kind];
  if (!isLinkToken(tokenParam)) return { location: `${page}?${LINK_ERROR_PARAM}=${LINK_INVALID}`, kind, token: null };
  return { location: page, kind, token: tokenParam };
}
