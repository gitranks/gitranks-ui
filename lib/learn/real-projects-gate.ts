import type { Route } from 'next';

import { LEARN_ADDRESS_TIMEOUT_MS } from './address-gate';
import {
  courseMarkdownPath,
  coursePath,
  learnLessonMarkdownPath,
  learnLessonPath,
  type RealProjectsRoute,
} from './paths';
import { RealProjectsFixesTotalDocument, RealProjectsOpenDocument } from './real-projects.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A lesson's or a course's view in real projects is not made when it has neither a listed merged fix nor an open issue
 * in the shared list. The page streams, so the proxy asks first: two public reads, the same for everyone, within the
 * time the other Learn gates wait. Not made, the address goes to the lesson or the course (its Markdown copy to theirs)
 * with a temporary redirect, since an issue or a fix may come any day. A failed, slow or unclear read lets the page
 * answer: nothing is redirected on a read that could not be made.
 */

/** Where a view that is not made sends its reader: the lesson or the course, or their Markdown copy. */
export function realProjectsNotMadePathOf({ of, slug, markdown }: RealProjectsRoute): Route {
  if (of === 'lesson') return markdown ? learnLessonMarkdownPath(slug) : learnLessonPath(slug);
  return (markdown ? courseMarkdownPath(slug) : coursePath(slug)) as Route;
}

/** What the two reads answered: the fixes' total and the shared list's rows, each null when it could not be read. */
export type RealProjectsReads = { fixes: number | null; open: number | null };

/** The rule, pure: not made only when both reads answered, with no fix and no open issue. */
export const realProjectsMadeOf = ({ fixes, open }: RealProjectsReads): boolean => !(fixes === 0 && open === 0);

const countOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

async function readFixes(input: { lesson: string | null; course: string | null }, signal: AbortSignal) {
  try {
    const { learnFixes } = await graphqlDirect(RealProjectsFixesTotalDocument, { input }, { source: 'ssr', signal });
    return countOf(learnFixes?.total);
  } catch {
    return null;
  }
}

async function readOpen(input: { lesson: string | null; course: string | null }, signal: AbortSignal) {
  try {
    const { learnQueuePublic } = await graphqlDirect(RealProjectsOpenDocument, { input }, { source: 'ssr', signal });
    return Array.isArray(learnQueuePublic?.rows) ? learnQueuePublic.rows.length : null;
  } catch {
    return null;
  }
}

/**
 * Where the proxy sends a view's address: null to let the page answer (made, or not known), else the lesson's or the
 * course's own address. Both reads run at once, within `timeoutMs`, and stop once answered.
 */
export async function realProjectsGateOf(
  route: RealProjectsRoute,
  timeoutMs = LEARN_ADDRESS_TIMEOUT_MS,
): Promise<Route | null> {
  const input = route.of === 'lesson' ? { lesson: route.slug, course: null } : { lesson: null, course: route.slug };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<RealProjectsReads>((resolve) => {
    timer = setTimeout(() => resolve({ fixes: null, open: null }), timeoutMs);
  });
  try {
    const reads = await Promise.race([
      Promise.all([readFixes(input, controller.signal), readOpen(input, controller.signal)]).then(([fixes, open]) => ({
        fixes,
        open,
      })),
      late,
    ]);
    return realProjectsMadeOf(reads) ? null : realProjectsNotMadePathOf(route);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
