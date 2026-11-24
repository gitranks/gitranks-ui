import type { Route } from 'next';

import { learnAddressGateOf } from './address-gate';
import type { LessonRoute } from './learn-path';
import { isContentSlug, learnFixAnswersPath, learnFixPath, learnLessonGonePath } from './paths';
import { fixAddressOf } from './walkthrough';
import { LearnFixAddressBySlugDocument } from './walkthrough.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A lesson's page streams: the response starts with a 200 before the page reads the lesson, so the page's notFound()
 * reaches the browser only as a noindex in the stream. The proxy asks first instead, and a missing lesson gets a real
 * 404 before anything renders. The same address once held a walkthrough's lesson and its result pages: those live on
 * the fix's page now, so the proxy sends them there for good.
 */

/** Where the proxy sends a missing lesson: a page that is always the lesson's 404. */
export const LESSON_MISSING_PATH = '/learn/lessons/_missing' as Route;

/** How long the proxy waits for the answer before leaving it to the page: nothing is sent while it waits. */
export const LESSON_GATE_TIMEOUT_MS = 2000;

/**
 * What the proxy does with a lesson's address. A lesson of ours is asked first: paused or removed, its page at `path`
 * with a 503 or a 410 (`gone`); moved, a permanent redirect to its new address; public, `page`. An address that is not
 * one of ours is a walkthrough's old one: a permanent redirect to its fix's page once its pull request is open, else
 * `missing` for a 404. An old result page goes for good to that person's answers on the fix's page, else is missing.
 * A failed or slow ask is `page`: the page then answers (it shows only a lesson of ours).
 */
export type LessonGate =
  | { kind: 'page' }
  | { kind: 'missing' }
  | { kind: 'redirect'; path: Route; permanent?: boolean }
  | { kind: 'gone'; status: 410 | 503; path: Route };

const PAGE: LessonGate = { kind: 'page' };
const MISSING: LessonGate = { kind: 'missing' };

/**
 * Where a walkthrough's old address leads now: the fix's page (`/learn/fixes/<owner>/<repo>/<n>`), or with a login that
 * person's answers there, shared or kept private (that page says which). `missing` when the address names no fix with
 * a page; null on a failure, so the page answers.
 */
async function walkthroughGateOf({ slug, login }: LessonRoute, signal: AbortSignal): Promise<LessonGate | null> {
  try {
    const { learnFixAddress } = await graphqlDirect(
      LearnFixAddressBySlugDocument,
      { slug, login: login ?? null },
      { source: 'ssr', signal },
    );
    const address = fixAddressOf(learnFixAddress);
    if (!address) return null;
    if (!address.owner || !address.repo || !address.number) return MISSING;
    const pr = { nameWithOwner: `${address.owner}/${address.repo}`, number: address.number };
    if (login === undefined) {
      // A taken-down walkthrough's fix page says so itself.
      return address.state === 'LIVE' || address.state === 'REMOVED'
        ? { kind: 'redirect', path: learnFixPath(pr), permanent: true }
        : MISSING;
    }
    return address.state === 'LIVE' || address.state === 'PRIVATE'
      ? { kind: 'redirect', path: learnFixAnswersPath(pr, address.login ?? login), permanent: true }
      : MISSING;
  } catch {
    return null;
  }
}

/** The walkthrough's answer within `timeoutMs`; `page` on a failed or slow ask. The ask stops once answered. */
async function fixLessonGateOf(route: LessonRoute, timeoutMs: number): Promise<LessonGate> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<LessonGate>((resolve) => {
    timer = setTimeout(() => resolve(PAGE), timeoutMs);
  });
  try {
    return await Promise.race([walkthroughGateOf(route, controller.signal).then((gate) => gate ?? PAGE), late]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/**
 * A lesson's address: as a lesson of ours first, then as a walkthrough's old address. Both are asked at once, each
 * within `timeoutMs`; the walkthrough's answer counts when ours answered that the address is not one of ours. When
 * ours could not be asked (failed, empty or slow), the walkthrough's redirect still counts but its "missing" goes on to
 * the page, so a live lesson of ours is never a 404. A result page is a walkthrough's only.
 */
export async function lessonGateOf(route: LessonRoute, timeoutMs = LESSON_GATE_TIMEOUT_MS): Promise<LessonGate> {
  if (route.login !== undefined || !isContentSlug(route.slug)) return fixLessonGateOf(route, timeoutMs);
  const fix = fixLessonGateOf(route, timeoutMs);
  const ours = await learnAddressGateOf('lesson', route.slug, timeoutMs);
  switch (ours.kind) {
    case 'missing':
      return fix;
    case 'unknown': {
      const answer = await fix;
      return answer.kind === 'missing' ? PAGE : answer;
    }
    // A lesson has no address of its own elsewhere: only a project course does.
    case 'page':
    case 'elsewhere':
      return PAGE;
    case 'moved':
      return { kind: 'redirect', path: ours.path, permanent: true };
    case 'paused':
      return { kind: 'gone', status: 503, path: learnLessonGonePath(route.slug) };
    case 'removed':
      return { kind: 'gone', status: 410, path: learnLessonGonePath(route.slug) };
  }
}
