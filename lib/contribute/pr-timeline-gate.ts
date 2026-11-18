import type { Route } from 'next';

import type { PrRef } from './pr-feedback';
import { PrTimelineByAttemptDocument, PrTimelineDocument, PrTimelineOpenDocument } from './pr-timeline.documents';
import { prTimelineFallbackPath, prTimelinePath } from './pr-timeline-path';
import { accountEmailOf } from '@/lib/account-email';
import { sessionTokenOf } from '@/lib/contribute/session-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A pull request timeline's gate, asked by the proxy before anything renders: the page streams, so its own notFound()
 * would come after a 200. Public, the page is one cached page for everyone and reads no session; before that it is
 * open to the people the API names, rendered per request and never cached.
 */

/** How long an answer of `contributePrTimelineOpen` is reused: opening the pages reaches every server within a minute. */
const OPEN_TTL_MS = 60_000;
/** After a failed ask, the last answer holds this long before the next try. */
const OPEN_RETRY_MS = 10_000;
/** How long the proxy waits for a page's answer before leaving it to the page. */
export const PR_TIMELINE_GATE_TIMEOUT_MS = 2000;

let open: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/**
 * Whether pull request timelines are public (the API's `contributePrTimelineOpen`). Asked once a minute per server, one
 * ask at a time. A failed ask keeps the last answer (closed when there is none) and tries again 10 seconds later.
 */
export function contributePrTimelineOpen(now = Date.now()): Promise<boolean> {
  if (open && now - open.at < OPEN_TTL_MS) return Promise.resolve(open.value);
  asking ??= askOpen(now).finally(() => {
    asking = null;
  });
  return asking;
}

async function askOpen(now: number): Promise<boolean> {
  try {
    const { contributePrTimelineOpen: value } = await graphqlDirect(PrTimelineOpenDocument, undefined, {
      source: 'ssr',
    });
    open = { value: value === true, at: now };
  } catch {
    open = { value: open?.value ?? false, at: now - OPEN_TTL_MS + OPEN_RETRY_MS };
  }
  return open.value;
}

/** Forgets the cached answer (tests). */
export function resetPrTimelineOpen(): void {
  open = null;
  asking = null;
}

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
 * What the proxy does with a public page: `page` (it is shown; `partial` when its reviews could not be read), a 307 to
 * the address the PR lives at now, or `missing` for the 404. A failed or slow ask is `page`: the page then reads it
 * itself and answers as it can; `confirmed` says the API answered that it is shown.
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
 * Where the footer's short address goes (a 307 either way): the page when it is shown to this visitor, else the
 * maintainers page about that PR. Public, asked signed out; before that, only a signed-in person the API names can be
 * sent to a page, and nobody else is asked about. A failure or a slow answer goes to the maintainers page.
 */
export async function prTimelineShortTargetOf(
  attemptId: string,
  request: { headers: Headers },
  timeoutMs = PR_TIMELINE_GATE_TIMEOUT_MS,
): Promise<Route> {
  const fallback = prTimelineFallbackPath(attemptId);
  let identity: { githubLogin?: string; accountEmail?: string } = {};
  if (!(await contributePrTimelineOpen())) {
    const token = await sessionTokenOf(request);
    if (!token?.githubLogin || token.error) return fallback;
    const accountEmail = accountEmailOf(token.email);
    identity = { githubLogin: token.githubLogin, ...(accountEmail ? { accountEmail } : {}) };
  }
  const ask = graphqlDirect(PrTimelineByAttemptDocument, { id: attemptId }, { source: 'ssr', ...identity }).then(
    ({ contributePrTimelineByAttempt: answer }) => (answer?.timeline ? prTimelinePath(answer.timeline) : fallback),
    () => fallback,
  );
  return within(ask, fallback, timeoutMs);
}
