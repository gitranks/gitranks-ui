/**
 * The browser's note that this account has an open Unsung hero application: `hero_application=<login>`, for 7 days.
 * The apply page writes it from its own answer, and on a send or a cancel; Sign Out clears it. Nothing is asked of the server for it, so
 * cached pages stay as they are; a decision made elsewhere shows on the next visit to the apply page, or after 7 days.
 */
export const HERO_APPLICATION_COOKIE = 'hero_application';

const MAX_AGE_S = 7 * 24 * 60 * 60;

/** A GitHub login: letters, digits and hyphens, up to 39. */
const LOGIN = /^[A-Za-z0-9-]{1,39}$/;

const secure = () => (globalThis.location?.protocol === 'https:' ? '; Secure' : '');

/** Notes the login's open application. */
export function rememberHeroApplication(login: string): void {
  if (typeof document === 'undefined' || !LOGIN.test(login)) return;
  // biome-ignore lint/suspicious/noDocumentCookie: a plain cookie every browser takes; the Cookie Store API is not in all.
  document.cookie = `${HERO_APPLICATION_COOKIE}=${login}; Max-Age=${MAX_AGE_S}; Path=/; SameSite=Lax${secure()}`;
}

/** Forgets it: no open application, or signed out. */
export function forgetHeroApplication(): void {
  if (typeof document === 'undefined') return;
  // biome-ignore lint/suspicious/noDocumentCookie: as above.
  document.cookie = `${HERO_APPLICATION_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure()}`;
}

/** The login a cookie header notes, or null. */
export function heroApplicationLoginOf(cookies: string): string | null {
  for (const part of cookies.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name !== HERO_APPLICATION_COOKIE) continue;
    const value = rest.join('=');
    return LOGIN.test(value) ? value : null;
  }
  return null;
}

/** Whether the browser notes an open application for this login (GitHub logins match in any case). */
export function hasHeroApplication(cookies: string, login: string | null | undefined): boolean {
  const noted = heroApplicationLoginOf(cookies);
  return !!login && !!noted && noted.toLowerCase() === login.toLowerCase();
}
