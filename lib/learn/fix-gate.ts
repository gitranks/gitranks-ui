import type { Route } from 'next';

import { type LearnFixRoute, learnFixAnswersPath, learnFixRemovedPath, learnFixWalkthroughPath } from './paths';
import { type FixAddress, fixAddressOf, fixRefInputOf } from './walkthrough';
import { LearnFixAddressDocument } from './walkthrough.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A fix's walkthrough and a person's answers stream: the response starts with a 200 before the page reads them, so
 * the page's own not found would reach the browser only inside the stream. The proxy asks where the address leads
 * first (page 33): nothing there is a real 404, a fix whose page was removed its own page with a 410, and an address
 * in another spelling than the API's (a renamed repository, a login's letter case) a redirect to the current one.
 */

/** How long the proxy waits for the answer before leaving it to the page: nothing is sent while it waits. */
export const FIX_GATE_TIMEOUT_MS = 2000;

export type FixGate =
  | { kind: 'page' }
  | { kind: 'missing' }
  | { kind: 'removed'; path: Route }
  | { kind: 'redirect'; path: Route };

const PAGE: FixGate = { kind: 'page' };

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
export async function fixRouteGateOf(route: LearnFixRoute, timeoutMs = FIX_GATE_TIMEOUT_MS): Promise<FixGate> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  const ask = graphqlDirect(
    LearnFixAddressDocument,
    { ref: fixRefInputOf(route.pr), login: route.login },
    { source: 'ssr' },
  ).then(
    ({ learnFixAddress }) => fixAddressOf(learnFixAddress),
    () => null,
  );
  try {
    return fixGateOf(route, await Promise.race([ask, late]));
  } finally {
    clearTimeout(timer);
  }
}
