/**
 * A readable cookie that says the browser holds a session. The session cookie itself is HTTP-only, so without this
 * hint a page cannot tell a signed-out visitor from a signed-in one without asking the server. It carries no secret:
 * a wrong hint costs one session request, or skips one that would have answered "no session".
 */
export const SESSION_HINT_COOKIE = 'has-session';

/** Path=/ on both, or the browser keeps a hint set from another path. */
export const SESSION_HINT_SET = `${SESSION_HINT_COOKIE}=1; Path=/; SameSite=Lax`;
export const SESSION_HINT_CLEAR = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;

/** Whether a `document.cookie` string holds the hint. */
export const hasSessionHint = (cookie: string) =>
  cookie.split(';').some((part) => part.trim().startsWith(`${SESSION_HINT_COOKIE}=`));
