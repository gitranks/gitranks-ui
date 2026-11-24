import type { Route } from 'next';

import { learnAddressGateOf } from './address-gate';
import { LessonPageGateDocument, LessonResultGateDocument } from './learn.documents';
import { type LessonRoute, lessonResultPath } from './learn-path';
import { isContentSlug, learnFixAnswersPath, learnLessonGonePath } from './paths';
import { fixAddressOf } from './walkthrough';
import { LearnFixAddressBySlugDocument } from './walkthrough.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { contributeErrorOf } from '@/lib/workspace/errors';

/*
 * A shared lesson's page and its result pages stream: the response starts with a 200 before the page reads the lesson,
 * so the page's notFound() reaches the browser only as a noindex in the stream. The proxy asks first instead, and a
 * missing lesson or result gets a real 404 before anything renders. Prerendering the routes without a fallback shell
 * does not work for them: the pages read the viewer's session, which an on-demand prerender does not allow.
 */

/** Where the proxy sends a missing lesson or result: a page that is always the lesson's 404. */
export const LESSON_MISSING_PATH = '/learn/lessons/_missing' as Route;

/** How long the proxy waits for the answer before leaving it to the page: nothing is sent while it waits. */
export const LESSON_GATE_TIMEOUT_MS = 2000;

/**
 * What the proxy does with a lesson's page. A lesson of ours is asked first: paused or removed, its page at `path`
 * with a 503 or a 410 (`gone`); moved, a permanent redirect to its new address. Otherwise, as for a lesson of a fix:
 * `missing` for a 404 (no such lesson, a hidden one, or no public pass of that login), a redirect to the result's
 * current address (a renamed login), else `page`, which reads it as before (a removed or held lesson's stub, or the
 * lesson). A failed or slow ask is `page` too: the page then answers as it did. The API's "not there" and "not a
 * valid ask" are missing, as the pages read them; a field the API does not know yet (a deploy in between) is left to
 * the page.
 */
export type LessonGate =
  | { kind: 'page' }
  | { kind: 'missing' }
  | { kind: 'redirect'; path: Route; permanent?: boolean }
  | { kind: 'gone'; status: 410 | 503; path: Route };

const PAGE: LessonGate = { kind: 'page' };
const MISSING: LessonGate = { kind: 'missing' };

/** Missing as the pages read it: nothing, or a hidden lesson's stub. */
const isMissing = (answer: { __typename: string; visibility?: string } | null | undefined) =>
  !answer || (answer.__typename === 'LessonStub' && answer.visibility === 'HIDDEN');

async function askGate({ slug, login }: LessonRoute): Promise<LessonGate> {
  try {
    if (login === undefined) {
      const { lessonPage } = await graphqlDirect(LessonPageGateDocument, { slug }, { source: 'ssr' });
      return isMissing(lessonPage) ? MISSING : PAGE;
    }
    const { lessonResult } = await graphqlDirect(LessonResultGateDocument, { slug, login }, { source: 'ssr' });
    if (isMissing(lessonResult)) return MISSING;
    if (lessonResult?.__typename === 'LessonResultPage' && lessonResult.login !== login) {
      return { kind: 'redirect', path: lessonResultPath(lessonResult.head.slug, lessonResult.login) };
    }
    return PAGE;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    return error === 'NOT_FOUND' || error === 'INVALID' ? MISSING : PAGE;
  }
}

/**
 * A lesson's page: as a lesson of ours first, then as a lesson of a fix. Both are asked at once, each within
 * `timeoutMs`; the fix's answer counts when our ask answered that the address is not one of ours. When ours could not
 * be asked (failed, empty or slow), a fix's redirect still counts but its "missing" goes on to the page, which reads
 * the lesson itself. A result page is a fix's only.
 */
export async function lessonGateOf(route: LessonRoute, timeoutMs = LESSON_GATE_TIMEOUT_MS): Promise<LessonGate> {
  if (route.login !== undefined || !isContentSlug(route.slug)) return fixLessonGateOf(route, timeoutMs);
  const fix = fixLessonGateOf(route, timeoutMs);
  const ours = await learnAddressGateOf('lesson', route.slug, timeoutMs);
  switch (ours.kind) {
    case 'missing':
      return fix;
    case 'unknown': {
      // Ours could not be asked: a lesson of ours is never "missing" to the fix's ask, so its 404 would hide a live
      // lesson. The page answers instead (it reads both, and says not found for neither).
      const answer = await fix;
      return answer.kind === 'missing' ? PAGE : answer;
    }
    case 'page':
      return PAGE;
    case 'moved':
      return { kind: 'redirect', path: ours.path, permanent: true };
    case 'paused':
      return { kind: 'gone', status: 503, path: learnLessonGonePath(route.slug) };
    case 'removed':
      return { kind: 'gone', status: 410, path: learnLessonGonePath(route.slug) };
  }
}

/**
 * A result page whose answers now live on the fix's page (`/learn/fixes/<owner>/<repo>/<n>/walkthrough/by/<login>`):
 * there for good, shared or kept private (that page says which). Null for any other answer, a failure or an API that
 * does not know the ask yet.
 */
async function movedResultOf({ slug, login }: LessonRoute): Promise<LessonGate | null> {
  if (login === undefined) return null;
  try {
    const { learnFixAddress } = await graphqlDirect(LearnFixAddressBySlugDocument, { slug, login }, { source: 'ssr' });
    const address = fixAddressOf(learnFixAddress);
    if (!address || (address.state !== 'LIVE' && address.state !== 'PRIVATE')) return null;
    if (!address.owner || !address.repo || !address.number) return null;
    const pr = { nameWithOwner: `${address.owner}/${address.repo}`, number: address.number };
    return { kind: 'redirect', path: learnFixAnswersPath(pr, address.login ?? login), permanent: true };
  } catch {
    return null;
  }
}

async function fixLessonGateOf(route: LessonRoute, timeoutMs: number): Promise<LessonGate> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<LessonGate>((resolve) => {
    timer = setTimeout(() => resolve(PAGE), timeoutMs);
  });
  const ask = async () => {
    // Both at once: the answers' new address wins, else the result page as before.
    const [moved, gate] = await Promise.all([movedResultOf(route), askGate(route)]);
    return moved ?? gate;
  };
  try {
    return await Promise.race([ask(), late]);
  } finally {
    clearTimeout(timer);
  }
}
