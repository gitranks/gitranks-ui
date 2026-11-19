import type { Route } from 'next';

import { LessonPageGateDocument, LessonResultGateDocument } from './learn.documents';
import { type LessonRoute, lessonResultPath } from './learn-path';
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
 * What the proxy does with a lesson's page: `missing` for a 404 (no such lesson, a hidden one, or no public pass of
 * that login), a redirect to the result's current address (a renamed login), else `page`, which reads it as before
 * (a removed or held lesson's stub, or the lesson). A failed or slow ask is `page` too: the page then answers as it
 * did. The API's "not there" and "not a valid ask" are missing, as the pages read them; a field the API does not
 * know yet (a deploy in between) is left to the page.
 */
export type LessonGate = { kind: 'page' } | { kind: 'missing' } | { kind: 'redirect'; path: Route };

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

export async function lessonGateOf(route: LessonRoute, timeoutMs = LESSON_GATE_TIMEOUT_MS): Promise<LessonGate> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<LessonGate>((resolve) => {
    timer = setTimeout(() => resolve(PAGE), timeoutMs);
  });
  try {
    return await Promise.race([askGate(route), late]);
  } finally {
    clearTimeout(timer);
  }
}
