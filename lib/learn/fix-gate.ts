import type { Route } from 'next';

import { LearnFixViewGateDocument } from './fix-page.documents';
import { LEARN_MAINTAINERS_PATH } from './learn-path';
import {
  type LearnFixRoute,
  learnFixAnswersPath,
  learnFixPath,
  learnFixRemovedPath,
  learnFixWalkthroughPath,
} from './paths';
import { type FixAddress, fixAddressOf, fixRefInputOf } from './walkthrough';
import { LearnFixAddressByAttemptDocument, LearnFixAddressDocument } from './walkthrough.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/*
 * A fix's walkthrough and a person's answers stream: the response starts with a 200 before the page reads them, so
 * the page's own not found would reach the browser only inside the stream. The proxy asks where the address leads
 * first (page 33): nothing there is a real 404, a fix whose page was removed its own page with a 410, and an address
 * in another spelling than the API's (a renamed repository, a login's letter case) a redirect to the current one.
 * The footer's address by attempt is answered here too, since only the proxy can answer the site's own 404 page.
 */

/*
 * The fix's own page, "Learn from it", is answered here as well: it exists only for a pull request made with Learn
 * that is not closed without a merge, while its public page is shown. Any other pull request is sent to "How it was
 * made", its one view; a fix whose public page its fixer hid has neither, so it is the 404.
 */

/** How long the proxy waits for the answer before leaving it to the page: nothing is sent while it waits. */
export const FIX_GATE_TIMEOUT_MS = 2000;

/** How long a live answer is kept in memory, so a page opened again soon asks nothing. */
export const FIX_GATE_MEMO_MS = 60_000;

/** The most answers kept in memory: the oldest goes first. */
export const FIX_GATE_MEMO_SIZE = 500;

export type FixGate =
  | { kind: 'page' }
  | { kind: 'missing' }
  | { kind: 'removed'; path: Route }
  | { kind: 'redirect'; path: Route };

const PAGE: FixGate = { kind: 'page' };

/*
 * Live answers only: a fix that is missing, removed or private may change at any moment (a pull request opens, the
 * fixer shares again), and is always asked. Kept per process, for a minute, at most `FIX_GATE_MEMO_SIZE` of them.
 */
const memo = new Map<string, { gate: FixGate; until: number }>();

function remembered(key: string, now: number): FixGate | null {
  const kept = memo.get(key);
  if (!kept) return null;
  if (kept.until > now) return kept.gate;
  memo.delete(key);
  return null;
}

function remember(key: string, gate: FixGate, now: number) {
  memo.delete(key);
  memo.set(key, { gate, until: now + FIX_GATE_MEMO_MS });
  while (memo.size > FIX_GATE_MEMO_SIZE) {
    const oldest = memo.keys().next().value;
    if (oldest === undefined) break;
    memo.delete(oldest);
  }
}

/** Forgets every kept answer: for the specs. */
export const forgetFixGates = () => memo.clear();

/**
 * Asks where an address leads within `timeoutMs`, the request given up (aborted) when the time runs out. Null for a
 * failed or slow ask, an API that does not know the read yet, and a read of another shape.
 */
async function askAddress(
  ask: (signal: AbortSignal) => Promise<{ learnFixAddress: unknown }>,
  timeoutMs: number,
): Promise<FixAddress | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const read = ask(controller.signal).then(
    ({ learnFixAddress }) => fixAddressOf(learnFixAddress),
    () => null,
  );
  try {
    return await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What the proxy does with a walkthrough's or an answers page's address, from where the API says it leads. A live
 * address goes on to the page, and so do answers the fixer keeps private (the page says so); an address in another
 * spelling moves to the API's. A read of another shape, or none, leaves it to the page, which says it is not here.
 */
export function fixGateOf(route: LearnFixRoute, address: FixAddress | null): FixGate {
  if (!address) return PAGE;
  if (address.state === 'MISSING') return { kind: 'missing' };
  if (address.state === 'REMOVED') return { kind: 'removed', path: learnFixRemovedPath(route.pr) };
  const { owner, repo, number, login } = address;
  if (!owner || !repo || !number) return PAGE;
  const pr = { nameWithOwner: `${owner}/${repo}`, number };
  const asked = route.login === null ? learnFixWalkthroughPath(route.pr) : learnFixAnswersPath(route.pr, route.login);
  const current = route.login === null ? learnFixWalkthroughPath(pr) : learnFixAnswersPath(pr, login ?? route.login);
  return current === asked ? PAGE : { kind: 'redirect', path: current };
}

/**
 * Asks where the address leads, within `timeoutMs`. A failed or slow ask, or an API that does not know the read yet,
 * goes on to the page, which reads the walkthrough itself and says it is not here when it cannot.
 */
export async function fixRouteGateOf(
  route: LearnFixRoute,
  timeoutMs = FIX_GATE_TIMEOUT_MS,
  at?: number,
): Promise<FixGate> {
  // Only the proxy and a route handler ask, at request time: never a page rendered ahead of one.
  const now = at ?? Date.now();
  const key = `route:${route.pr.nameWithOwner}#${route.pr.number}:${route.login ?? ''}`;
  const kept = remembered(key, now);
  if (kept) return kept;
  const address = await askAddress(
    (signal) =>
      graphqlDirect(
        LearnFixAddressDocument,
        { ref: fixRefInputOf(route.pr), login: route.login },
        { source: 'ssr', signal },
      ),
    timeoutMs,
  );
  const gate = fixGateOf(route, address);
  if (address?.state === 'LIVE') remember(key, gate, now);
  return gate;
}

/**
 * Where the footer's address by attempt leads, from where the API says the fixer's answers are: their answers page
 * (which says when they are kept private), the walkthrough of a fix whose page was removed (the proxy answers its 410
 * there), or nothing (no pull request yet, an attempt that is not one: the 404). The pages for maintainers when the
 * API cannot be asked, so a footer already sent always leads somewhere.
 */
export function fixByAttemptGateOf(address: FixAddress | null): FixGate {
  if (!address) return { kind: 'redirect', path: LEARN_MAINTAINERS_PATH };
  if (address.state === 'MISSING') return { kind: 'missing' };
  const { owner, repo, number, login } = address;
  if (!owner || !repo || !number) return { kind: 'missing' };
  const pr = { nameWithOwner: `${owner}/${repo}`, number };
  if (address.state === 'REMOVED' || !login) return { kind: 'redirect', path: learnFixWalkthroughPath(pr) };
  return { kind: 'redirect', path: learnFixAnswersPath(pr, login) };
}

/** Asks where the footer's address by attempt leads, within `timeoutMs`, as `fixByAttemptGateOf` says. */
export async function fixByAttemptRouteGateOf(
  attemptId: string,
  timeoutMs = FIX_GATE_TIMEOUT_MS,
  at?: number,
): Promise<FixGate> {
  // Only the proxy and a route handler ask, at request time: never a page rendered ahead of one.
  const now = at ?? Date.now();
  const key = `attempt:${attemptId}`;
  const kept = remembered(key, now);
  if (kept) return kept;
  const address = await askAddress(
    (signal) => graphqlDirect(LearnFixAddressByAttemptDocument, { attempt: attemptId }, { source: 'ssr', signal }),
    timeoutMs,
  );
  const gate = fixByAttemptGateOf(address);
  if (address?.state === 'LIVE') remember(key, gate, now);
  return gate;
}

/**
 * What the proxy's one question about a fix page's address answers: where it leads, how the pull request stands, and
 * whether its public page is shown (false when its fixer hid it, or there is none).
 */
export type FixViewAnswer = {
  address: FixAddress | null;
  fix: { repo: string; number: number; made: string; state: string } | null;
  shown: boolean;
};

/**
 * What the proxy does with a fix page's address. A pull request made without Learn, or closed without a merge, has
 * one view, "How it was made": a redirect there. Nothing there, or no public page (none, or one its fixer hid), is the
 * 404; a fix whose page was removed its own page with a 410; another spelling a redirect to the API's. No answer
 * leaves it to the page.
 */
export function fixViewGateOf(pr: PrRef, answer: FixViewAnswer | null): FixGate {
  if (!answer) return PAGE;
  const { address, fix } = answer;
  if (fix && typeof fix.repo === 'string' && Number.isInteger(fix.number)) {
    if (fix.made !== 'LEARN' || fix.state === 'CLOSED') {
      return { kind: 'redirect', path: prTimelinePath({ nameWithOwner: fix.repo, number: fix.number }) };
    }
  }
  if (address?.state === 'REMOVED') return { kind: 'removed', path: learnFixRemovedPath(pr) };
  if (!fix) return address ? { kind: 'missing' } : PAGE;
  const current = learnFixPath({ nameWithOwner: fix.repo, number: fix.number });
  if (current !== learnFixPath(pr)) return { kind: 'redirect', path: current };
  // "Learn from it" draws the pull request's public page: one that is hidden has nothing to draw.
  return answer.shown ? PAGE : { kind: 'missing' };
}

/** Asks where a fix page's address leads, within `timeoutMs`, as `fixViewGateOf` says; a live page is kept a minute. */
export async function fixViewRouteGateOf(pr: PrRef, timeoutMs = FIX_GATE_TIMEOUT_MS, at?: number): Promise<FixGate> {
  // Only the proxy and a route handler ask, at request time: never a page rendered ahead of one.
  const now = at ?? Date.now();
  const key = `view:${pr.nameWithOwner}#${pr.number}`;
  const kept = remembered(key, now);
  if (kept) return kept;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const ref = fixRefInputOf(pr);
  const read = graphqlDirect(
    LearnFixViewGateDocument,
    { ref, owner: ref.owner, repo: ref.repo, number: ref.number },
    { source: 'ssr', signal: controller.signal },
  ).then(
    ({ learnFixAddress, learnFix, contributePrTimeline }): FixViewAnswer => ({
      address: fixAddressOf(learnFixAddress),
      fix: learnFix ?? null,
      shown: !!contributePrTimeline?.timeline,
    }),
    () => null,
  );
  let answer: FixViewAnswer | null;
  try {
    answer = await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
  }
  const gate = fixViewGateOf(pr, answer);
  if (answer?.fix && gate.kind !== 'missing' && gate.kind !== 'removed') remember(key, gate, now);
  return gate;
}
