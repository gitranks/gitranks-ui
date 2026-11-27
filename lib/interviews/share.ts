import type { Route } from 'next';

import { movedPathOf } from './address';
import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';
import type { InterviewAddress } from './types';

/*
 * What a company's or a plan's share picture and Markdown copy answer, by the page's state. They follow the page: a
 * live page is served; a moved one goes for good to the same thing at its new address; a page taken down or removed
 * answers 410; anything else 404; a read that failed 503. Only a live page's public read is ever drawn: nothing of a
 * person, so a picture or a copy is the same for everyone.
 */

/** A company's or a plan's page, as its picture and its copy find it. `path`: the moved page's new address. */
export type InterviewShareState<T> =
  | { kind: 'live'; page: T }
  | { kind: 'moved'; path: Route }
  | { kind: 'gone' }
  | { kind: 'missing' }
  | { kind: 'unavailable' };

/**
 * The state from the page as everyone reads it (null when it is not live) and, only then, its address (null when the
 * address could not be read). A move to an address that is no page of Interviews is missing.
 */
export function interviewShareStateOf<T>(page: T | null, address: InterviewAddress | null): InterviewShareState<T> {
  if (page) return { kind: 'live', page };
  if (!address) return { kind: 'unavailable' };
  if (address.state === 'gone') return { kind: 'gone' };
  const moved = movedPathOf(address);
  // Live by its address, yet not readable as live: a moment between two content copies. Not found for now.
  return moved ? { kind: 'moved', path: moved } : { kind: 'missing' };
}

/** Every answer that is not the thing itself: kept by no one, so a page coming back shows at once. */
const NOT_SERVED = { 'Cache-Control': 'private, no-store' } as const;

/**
 * The plain answer of a page that is not served, by its state. `suffix`: what the moved page's address takes to name
 * the same thing (`.md`, `/card.png`).
 */
export function interviewNotServedResponse(
  state: Exclude<InterviewShareState<unknown>, { kind: 'live' }>,
  suffix: string,
): Response {
  const text = (body: string, status: number, headers: Record<string, string> = {}) =>
    new Response(`${body}\n`, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_SERVED, ...headers },
    });
  switch (state.kind) {
    case 'moved':
      return new Response(null, { status: 308, headers: { Location: `${state.path}${suffix}`, ...NOT_SERVED } });
    case 'gone':
      return text('This page is no longer here.', 410);
    case 'unavailable':
      return text('The page could not be read. Try again in a minute.', 503, { 'Retry-After': '60' });
    case 'missing':
      return text('Not found', 404);
  }
}

/**
 * How a picture is kept. Once Interviews is open to everyone, as a lesson's picture is: five minutes in a browser and
 * ten in a shared cache, and its address changes with what it draws. Until then by no one, as the gate's 404 is, so a
 * shared cache never hands it to a visitor the gate closes it to.
 */
export function interviewCardHeadersOf(openToEveryone = INTERVIEWS_OPEN_TO_EVERYONE): Record<string, string> {
  return openToEveryone
    ? {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
        'Cloudflare-CDN-Cache-Control': 'max-age=600',
      }
    : { 'Content-Type': 'image/png', ...NOT_SERVED };
}

/**
 * How a Markdown copy is kept: a minute, as Learn's copies are, once Interviews is open to everyone; by no one until
 * then. Never indexed: the page itself is, and this is its copy for agents.
 */
export function interviewMarkdownHeadersOf(openToEveryone = INTERVIEWS_OPEN_TO_EVERYONE): Record<string, string> {
  return {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': openToEveryone ? 'public, max-age=60, s-maxage=60' : NOT_SERVED['Cache-Control'],
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  };
}
