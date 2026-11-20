// The Email row's sign-in brings the visitor back to the page they followed from, with the Follow dialog open again:
// the page's address with `?follow=email`, which the Follow slot reads once and takes out of the address.

export const FOLLOW_RETURN_PARAM = 'follow';
const FOLLOW_RETURN_VALUE = 'email';

/** Where the sign-in returns: this page's path and query (ours, never another site's) with `follow=email`. */
export function followReturnPathOf(href: string): string {
  const url = new URL(href);
  url.searchParams.set(FOLLOW_RETURN_PARAM, FOLLOW_RETURN_VALUE);
  return `${url.pathname}${url.search}`;
}

/**
 * Whether the address is a return from that sign-in, and the address without the mark (null when there is none), to
 * put in its place so a reload or a shared link does not open the dialog again.
 */
export function followReturnOf(href: string): { returned: boolean; cleaned: string | null } {
  const url = new URL(href);
  if (!url.searchParams.has(FOLLOW_RETURN_PARAM)) return { returned: false, cleaned: null };
  const returned = url.searchParams.get(FOLLOW_RETURN_PARAM) === FOLLOW_RETURN_VALUE;
  url.searchParams.delete(FOLLOW_RETURN_PARAM);
  return { returned, cleaned: `${url.pathname}${url.search}${url.hash}` };
}
