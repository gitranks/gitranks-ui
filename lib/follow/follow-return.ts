// The Email row's sign-in brings the visitor back to the page they followed from, with the Follow dialog open again:
// the page's address with `?follow=email:<label>`, which the Follow slot of that label reads once and takes out of the
// address. The label names what the slot follows (one package, or a repository's packages), so a page whose slot
// changed in between (a Used by filter that was not kept) does not open a dialog for something else.

export const FOLLOW_RETURN_PARAM = 'follow';
const markOf = (label: string) => `email:${label}`;

/** Where the sign-in returns: this page's path and query (ours, never another site's) with the mark. */
export function followReturnPathOf(href: string, label: string): string {
  const url = new URL(href);
  url.searchParams.set(FOLLOW_RETURN_PARAM, markOf(label));
  return `${url.pathname}${url.search}`;
}

/**
 * Whether the address is a return from that sign-in for the slot of this label, and the address without the mark (null
 * when there is none), to put in its place so a reload or a shared link does not open the dialog again.
 */
export function followReturnOf(href: string, label: string): { returned: boolean; cleaned: string | null } {
  const url = new URL(href);
  if (!url.searchParams.has(FOLLOW_RETURN_PARAM)) return { returned: false, cleaned: null };
  const returned = url.searchParams.get(FOLLOW_RETURN_PARAM) === markOf(label);
  url.searchParams.delete(FOLLOW_RETURN_PARAM);
  return { returned, cleaned: `${url.pathname}${url.search}${url.hash}` };
}
