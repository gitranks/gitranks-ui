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

/** Auth.js's session cookie, in any of its names: secure or not, whole or in chunks. */
export const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

/**
 * The `Set-Cookie` values that drop a session the server can no longer read (expired, or its refresh failed): the
 * browser then holds no session, and the proxy shows the sign-in. A `__Secure-` name is only set or cleared `Secure`.
 */
export const sessionClearsOf = (names: readonly string[]): string[] =>
  names
    .filter((name) => SESSION_COOKIE.test(name))
    .map(
      (name) => `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${name.startsWith('__Secure-') ? '; Secure' : ''}`,
    );

/** Whether a `document.cookie` string holds the hint. */
export const hasSessionHint = (cookie: string) =>
  cookie.split(';').some((part) => part.trim().startsWith(`${SESSION_HINT_COOKIE}=`));
