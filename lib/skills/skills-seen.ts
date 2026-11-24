/*
 * The Skills tab's "New" mark. The API keeps the first visit for someone who has a GitRanks Contribute or Learn row;
 * someone who uses neither product often has none, and opening a tab never makes one, so the browser keeps theirs in a
 * first-party cookie, set when the tab is opened.
 */

/** The cookie that says the owner has opened their Skills tab. */
export const SKILLS_SEEN_COOKIE = 'skills_seen';

/** A year: the mark goes once, and a browser that lost the cookie only shows it once more. */
export const SKILLS_SEEN_MAX_AGE = 60 * 60 * 24 * 365;

/** Whether the tab still carries "New": the API says so and this browser has not opened the tab yet. */
export const tabNewOf = (apiTabNew: boolean, cookie: string | undefined) => apiTabNew && cookie !== '1';

/** The cookie's options: the whole site, kept a year, never read by a script; `Secure` outside a local server. */
export const skillsSeenCookieOptions = (secure: boolean) =>
  ({ path: '/', maxAge: SKILLS_SEEN_MAX_AGE, sameSite: 'lax', httpOnly: true, secure }) as const;
