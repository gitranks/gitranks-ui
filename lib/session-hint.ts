/**
 * A readable cookie that says the browser holds a session. The session cookie itself is HTTP-only, so without this
 * hint a page cannot tell a signed-out visitor from a signed-in one without asking the server. It carries no secret.
 * A leftover hint costs one session request; a missing one shows a signed-in visitor as signed out, so the hint
 * lives as long as a session can.
 */
export const SESSION_HINT_COOKIE = 'has-session';

/** Auth.js's default session lifetime, which this app keeps; every signed-in response renews the hint. */
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/** Path=/ on both, or the browser keeps a hint set from another path. */
export const SESSION_HINT_SET = `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`;
export const SESSION_HINT_CLEAR = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;

/** Whether a `document.cookie` string holds the hint. */
export const hasSessionHint = (cookie: string) =>
  cookie.split(';').some((part) => part.trim().startsWith(`${SESSION_HINT_COOKIE}=`));
