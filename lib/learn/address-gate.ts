import type { Route } from 'next';

import type { LearnLessonLink } from './lesson-page';
import { LearnAddressDocument } from './lesson-page.documents';
import { coursePath, isContentSlug, learnLessonPath } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A lesson's or a course's page answers its state before it streams: the proxy asks the address first, within two
 * seconds, and answers a missing one with a 404, a removed one with a 410 and its page, a paused one with a 503 and its
 * page, a moved one with a permanent redirect. Anything else, a failed or a slow ask included, goes on to the page.
 */

/** Which kind of page an address is. */
export type LearnAddressKind = 'lesson' | 'course';

/** What an address answers: live, paused, removed, moved (to `movedTo`), or missing (a draft, or never there). */
export type LearnAddressState = 'LIVE' | 'PAUSED' | 'REMOVED' | 'MOVED' | 'MISSING';

/** An address's state, with the title and the course it had, for the page that says it is paused or removed. */
export type LearnAddress = {
  state: LearnAddressState;
  movedTo: string | null;
  title: string | null;
  course: LearnLessonLink | null;
};

/** What the proxy does with an address. `unknown`: the ask failed or was slow, and the page answers as it can. */
export type LearnAddressGate =
  | { kind: 'page' }
  | { kind: 'unknown' }
  | { kind: 'missing' }
  | { kind: 'paused' }
  | { kind: 'removed' }
  | { kind: 'moved'; path: Route; slug: string };

/** How long the proxy waits for the answer before leaving it to the page: nothing is sent while it waits. */
export const LEARN_ADDRESS_TIMEOUT_MS = 2000;

const PAGE: LearnAddressGate = { kind: 'page' };
const UNKNOWN: LearnAddressGate = { kind: 'unknown' };

const pathOf: Record<LearnAddressKind, (slug: string) => Route> = { lesson: learnLessonPath, course: coursePath };

/** The rule, pure: what an address's answer makes of it. A move that names no new slug is missing. */
export function learnAddressGateFrom(
  kind: LearnAddressKind,
  address: Pick<LearnAddress, 'state' | 'movedTo'>,
): LearnAddressGate {
  switch (address.state) {
    case 'LIVE':
      return PAGE;
    case 'PAUSED':
      return { kind: 'paused' };
    case 'REMOVED':
      return { kind: 'removed' };
    case 'MOVED':
      return address.movedTo && isContentSlug(address.movedTo)
        ? { kind: 'moved', path: pathOf[kind](address.movedTo), slug: address.movedTo }
        : { kind: 'missing' };
    default:
      return { kind: 'missing' };
  }
}

async function askAddress(kind: LearnAddressKind, slug: string): Promise<LearnAddressGate> {
  if (!isContentSlug(slug)) return { kind: 'missing' };
  try {
    const { learnAddress } = await graphqlDirect(LearnAddressDocument, { kind, slug }, { source: 'ssr' });
    return learnAddress ? learnAddressGateFrom(kind, learnAddress) : UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

/** What an address answers, asked within `timeoutMs`; `unknown` on a failed or a slow ask. */
export async function learnAddressGateOf(
  kind: LearnAddressKind,
  slug: string,
  timeoutMs = LEARN_ADDRESS_TIMEOUT_MS,
): Promise<LearnAddressGate> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<LearnAddressGate>((resolve) => {
    timer = setTimeout(() => resolve(UNKNOWN), timeoutMs);
  });
  try {
    return await Promise.race([askAddress(kind, slug), late]);
  } finally {
    clearTimeout(timer);
  }
}
