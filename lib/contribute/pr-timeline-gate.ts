import type { Route } from 'next';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { PrTimelineByAttemptDocument, PrTimelineDocument } from '@/lib/workspace/pr-timeline.documents';
import { prTimelineFallbackPath, prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/*
 * A pull request timeline's gate, asked by the proxy before anything renders: the page streams, so its own notFound()
 * would come after a 200. The page is one cached page for everyone and reads no session.
 */

/** How long the proxy waits for a page's answer before leaving it to the page. */
export const PR_TIMELINE_GATE_TIMEOUT_MS = 2000;

/** The answer, or `late` once `timeoutMs` passed. */
async function within<T>(ask: Promise<T>, late: T, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(late), timeoutMs);
  });
  try {
    return await Promise.race([ask, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What the proxy does with a page: `page` (it is shown; `partial` when its reviews could not be read), a 307 to the
 * address the PR lives at now, or `missing` for the 404. A failed or slow ask is `page`: the page then reads it itself
 * and answers as it can; `confirmed` says the API answered that it is shown.
 */
export type PrTimelineGate =
  | { kind: 'page'; partial: boolean; confirmed: boolean }
  | { kind: 'missing' }
  | { kind: 'redirect'; path: Route };

export async function prTimelineGateOf(pr: PrRef, timeoutMs = PR_TIMELINE_GATE_TIMEOUT_MS): Promise<PrTimelineGate> {
  // No answer (a failure, or none in time): the page decides; nothing about it is confirmed.
  const page: PrTimelineGate = { kind: 'page', partial: false, confirmed: false };
  const [owner, repo] = pr.nameWithOwner.split('/');
  const ask = graphqlDirect(PrTimelineDocument, { owner, repo, number: pr.number }, { source: 'ssr' }).then(
    ({ contributePrTimeline: answer }): PrTimelineGate => {
      if (answer?.timeline) return { kind: 'page', partial: answer.timeline.partial, confirmed: true };
      if (answer?.movedTo && answer.movedNumber) {
        return {
          kind: 'redirect',
          path: prTimelinePath({ nameWithOwner: answer.movedTo, number: answer.movedNumber }),
        };
      }
      return { kind: 'missing' };
    },
    (): PrTimelineGate => page,
  );
  return within(ask, page, timeoutMs);
}

/**
 * Where the footer's short address goes (a 307 either way): the page when it is shown, else the maintainers page about
 * that PR. Asked signed out; a failure or a slow answer goes to the maintainers page.
 */
export async function prTimelineShortTargetOf(
  attemptId: string,
  timeoutMs = PR_TIMELINE_GATE_TIMEOUT_MS,
): Promise<Route> {
  const fallback = prTimelineFallbackPath(attemptId);
  const ask = graphqlDirect(PrTimelineByAttemptDocument, { id: attemptId }, { source: 'ssr' }).then(
    ({ contributePrTimelineByAttempt: answer }) => (answer?.timeline ? prTimelinePath(answer.timeline) : fallback),
    () => fallback,
  );
  return within(ask, fallback, timeoutMs);
}
