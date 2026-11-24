import type { Route } from 'next';

import type { LearnLessonLink } from './lesson-page';
import { LearnAddressDocument } from './lesson-page.documents';
import { coursePath, isContentSlug, learnLessonPath, learnProjectCourseRouteOf, orgLoginOf, repoNameOf } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A lesson's or a course's page answers its state before it streams: the proxy asks the address first, within two
 * seconds, and answers a missing one with a 404, a removed one with a 410 and its page, a paused one with a 503 and its
 * page, a moved one with a permanent redirect. Anything else, a failed or a slow ask included, goes on to the page.
 */

/**
 * Which kind of page an address is: a lesson's or a course's by its slug, or a project course's by its project
 * (`repository` with `owner/name`, `org` with the login).
 */
export type LearnAddressKind = 'lesson' | 'course' | 'repository' | 'org';

/** What an address answers: live, paused, removed, moved (to `movedTo`), or missing (a draft, or never there). */
export type LearnAddressState = 'LIVE' | 'PAUSED' | 'REMOVED' | 'MOVED' | 'MISSING';

/**
 * An address's state, with the title and the course it had, for the page that says it is paused or removed. `path`
 * is the page's own address when it is not the one asked for (a project course asked for by its slug); `project`
 * says the page is a project course's or one of its lessons'. Both are left out by an API that does not send them.
 */
export type LearnAddress = {
  state: LearnAddressState;
  movedTo: string | null;
  title: string | null;
  course: LearnLessonLink | null;
  path?: string | null;
  project?: boolean | null;
};

/** What the proxy does with an address. `unknown`: the ask failed or was slow, and the page answers as it can. */
export type LearnAddressGate =
  | { kind: 'page' }
  | { kind: 'unknown' }
  | { kind: 'missing' }
  | { kind: 'paused' }
  | { kind: 'removed' }
  | { kind: 'moved'; path: Route; slug: string }
  /** A live page whose own address is another: a project course asked for by its slug. */
  | { kind: 'elsewhere'; path: Route };

/** How long the proxy waits for the answer before leaving it to the page: nothing is sent while it waits. */
export const LEARN_ADDRESS_TIMEOUT_MS = 2000;

const PAGE: LearnAddressGate = { kind: 'page' };
const UNKNOWN: LearnAddressGate = { kind: 'unknown' };

/** Where a moved page now is: a lesson moves to a lesson, anything else to a course (which may be a project's). */
const movedPathOf = (kind: LearnAddressKind, slug: string): Route =>
  kind === 'lesson' ? learnLessonPath(slug) : coursePath(slug);

/** A course's own address as the API names it, when it is a project course's page; null for anything else. */
function projectPathOf(path: string | null | undefined): Route | null {
  if (!path) return null;
  const route = learnProjectCourseRouteOf(path);
  return route && route !== 'invalid' ? (path as Route) : null;
}

/**
 * The rule, pure: what an address's answer makes of it. A move that names no new slug is missing. A live course whose
 * own address is a project course's page is there, not at the address asked.
 */
export function learnAddressGateFrom(
  kind: LearnAddressKind,
  address: Pick<LearnAddress, 'state' | 'movedTo' | 'path'>,
): LearnAddressGate {
  switch (address.state) {
    case 'LIVE': {
      const elsewhere = kind === 'course' ? projectPathOf(address.path) : null;
      return elsewhere ? { kind: 'elsewhere', path: elsewhere } : PAGE;
    }
    case 'PAUSED':
      return { kind: 'paused' };
    case 'REMOVED':
      return { kind: 'removed' };
    case 'MOVED':
      return address.movedTo && isContentSlug(address.movedTo)
        ? { kind: 'moved', path: movedPathOf(kind, address.movedTo), slug: address.movedTo }
        : { kind: 'missing' };
    default:
      return { kind: 'missing' };
  }
}

/** Whether a slug has the shape its kind's addresses take: a content slug, `owner/name`, or a login. */
export function isAddressSlug(kind: LearnAddressKind, slug: string): boolean {
  if (kind === 'lesson' || kind === 'course') return isContentSlug(slug);
  return (kind === 'repository' ? repoNameOf(slug) : orgLoginOf(slug)) !== null;
}

async function askAddress(kind: LearnAddressKind, slug: string): Promise<LearnAddressGate> {
  if (!isAddressSlug(kind, slug)) return { kind: 'missing' };
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
