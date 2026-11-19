import 'server-only';

import { PackagesGateDocument } from './packages.documents';
import { accountEmailOf } from '@/lib/account-email';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { sessionTokenOf } from '@/lib/workspace/session-token';

// Who may see package pages, decided before anything renders: by the proxy and route handlers only, never by a page or
// a layout (a usage spec keeps it so). A cached page then reads its data the same way for everyone it is shown to.
//
// The proxy asks on every repository page, so no request waits on the API once an answer is known: a kept answer is
// given at once, and an old one is asked again in the background. Only the very first ask is waited for, at most
// `ASK_TIMEOUT_MS`; no answer by then is closed.

/** How long an answer is fresh, for everyone and per login; an older one is still given while it is asked again. */
const ANSWER_TTL_MS = 60_000;
/** After a failed ask, the answer it left holds this long before the next try. */
const RETRY_MS = 10_000;
/** The longest a request waits for an answer when none is kept yet. */
export const ASK_TIMEOUT_MS = 1_000;
/** The most logins kept at once; the oldest answer goes first. */
const VIEWERS_KEPT = 10_000;

type Answer = { value: boolean; at: number };

let everyone: Answer | null = null;
let askingEveryone: Promise<boolean> | null = null;
const viewers = new Map<string, Answer>();
const askingViewers = new Map<string, Promise<boolean>>();

/** The API's answer, or a failure once `ASK_TIMEOUT_MS` has passed without one. */
function withinTimeout<T>(ask: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('The packages gate did not answer in time')), ASK_TIMEOUT_MS);
  });
  return Promise.race([ask, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Whether package pages are open to every visitor (the API's `packagesGate.everyone`). Asked once a minute per server,
 * one ask at a time, not per request: a kept answer is given at once, even an old one while it is asked again. A failed
 * or late ask keeps the last answer (closed when there is none, as an API without the field yet) and tries again 10
 * seconds later.
 */
export function packagesPublic(now = Date.now()): Promise<boolean> {
  if (everyone && now - everyone.at < ANSWER_TTL_MS) return Promise.resolve(everyone.value);
  askingEveryone ??= askEveryone(now).finally(() => {
    askingEveryone = null;
  });
  return everyone ? Promise.resolve(everyone.value) : askingEveryone;
}

async function askEveryone(now: number): Promise<boolean> {
  try {
    const { packagesGate } = await withinTimeout(graphqlDirect(PackagesGateDocument, undefined, { source: 'ssr' }));
    everyone = { value: packagesGate?.everyone === true, at: now };
  } catch {
    everyone = { value: everyone?.value ?? false, at: now - ANSWER_TTL_MS + RETRY_MS };
  }
  return everyone.value;
}

/**
 * Whether the request may see package pages: always once they are open to everyone (the session is not read then);
 * until then only a signed-in person the API names (`packagesGate.viewer`, asked with the session's login and email).
 * Closed without a session, for a session that needs a new sign-in, and on any failure or late answer. Each login's
 * answer is kept as the answer for everyone is: given at once, asked again after a minute, one ask at a time per login.
 */
export async function requestMaySeePackages(req: { headers: Headers }, now = Date.now()): Promise<boolean> {
  if (await packagesPublic(now)) return true;
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return false;
  return viewerMaySeePackages(token.githubLogin, accountEmailOf(token.email), now);
}

function viewerMaySeePackages(githubLogin: string, accountEmail: string | undefined, now: number): Promise<boolean> {
  const kept = viewers.get(githubLogin);
  if (kept && now - kept.at < ANSWER_TTL_MS) return Promise.resolve(kept.value);

  let asking = askingViewers.get(githubLogin);
  if (!asking) {
    asking = askViewer(githubLogin, accountEmail, now).finally(() => {
      askingViewers.delete(githubLogin);
    });
    askingViewers.set(githubLogin, asking);
  }
  return kept ? Promise.resolve(kept.value) : asking;
}

async function askViewer(githubLogin: string, accountEmail: string | undefined, now: number): Promise<boolean> {
  let answer: Answer;
  try {
    const { packagesGate } = await withinTimeout(
      graphqlDirect(PackagesGateDocument, undefined, {
        source: 'ssr',
        githubLogin,
        ...(accountEmail ? { accountEmail } : {}),
      }),
    );
    answer = { value: packagesGate?.viewer === true, at: now };
  } catch {
    // A failed ask closes the gate for this login, as before; it is asked again 10 seconds later.
    answer = { value: false, at: now - ANSWER_TTL_MS + RETRY_MS };
  }
  viewers.delete(githubLogin);
  viewers.set(githubLogin, answer);
  if (viewers.size > VIEWERS_KEPT) {
    const oldest = viewers.keys().next().value;
    if (oldest !== undefined) viewers.delete(oldest);
  }
  return answer.value;
}

/** Forgets every kept answer (tests). */
export function resetPackagesGate(): void {
  everyone = null;
  askingEveryone = null;
  viewers.clear();
  askingViewers.clear();
}
