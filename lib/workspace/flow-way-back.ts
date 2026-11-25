import { maskIdOf } from './masked-issue';

/**
 * The way back through Contribute's onboarding: a person sent into it from the page of one issue carries that issue's
 * mask id on every address of the flow (`?issue=<mask id>`), and comes back to the issue at the end. The address
 * names no project: the mask id is the issue page's own public id, checked with its pattern.
 */
export const FLOW_WAY_BACK_PARAM = 'issue';

type Query = URLSearchParams | Record<string, string | string[] | undefined> | string | null | undefined;

/** The way back an address's query carries: a well-formed mask id, else null. */
export function flowWayBackOf(query: Query): string | null {
  if (!query) return null;
  if (typeof query === 'string' || query instanceof URLSearchParams) {
    return maskIdOf(new URLSearchParams(query).get(FLOW_WAY_BACK_PARAM));
  }
  const value = query[FLOW_WAY_BACK_PARAM];
  return maskIdOf(Array.isArray(value) ? value[0] : value);
}

/** Any origin: only the path, query and hash of a same-site address are read and written back. */
const HERE = 'https://flow.invalid';

/** `href` (a same-site path) with the way back on it, any older one replaced; `href` itself when there is none. */
export function withFlowWayBack<T extends string>(href: T, issue: string | null | undefined): T {
  const id = maskIdOf(issue);
  if (!id) return href;
  const url = new URL(href, HERE);
  url.searchParams.set(FLOW_WAY_BACK_PARAM, id);
  return `${url.pathname}${url.search}${url.hash}` as T;
}

/** The way back the browser's address carries now; null on the server or without one. */
export const flowWayBackHereOf = (): string | null =>
  typeof window === 'undefined' ? null : flowWayBackOf(window.location.search);
