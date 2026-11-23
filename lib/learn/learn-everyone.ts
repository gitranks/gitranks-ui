import 'server-only';

import { LearnOpenToEveryoneDocument } from './learn.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer is reused: opening Learn to everyone reaches every server within a minute. */
const ANSWER_TTL_MS = 60_000;
/** After a failed ask, the last answer holds this long before the next try. */
const RETRY_MS = 10_000;
/** The longest a request waits for the first answer; no answer by then is closed. */
export const LEARN_EVERYONE_TIMEOUT_MS = 1_000;

/** The kept answer; `known` once the API has answered at least once, so `value` is a real answer, not a guess. */
let everyone: { value: boolean; at: number; known: boolean } | null = null;
let asking: Promise<boolean> | null = null;

/** The API's answer, or a failure once the timeout has passed without one. */
function withinTimeout<T>(ask: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Learn did not say in time whether it is open')),
      LEARN_EVERYONE_TIMEOUT_MS,
    );
  });
  return Promise.race([ask, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Whether GitRanks Learn is open to every signed-in person (the API's `learnOpenToEveryone`): its front door and the
 * home page's Learn section are then shown to visitors without a session too, and the menu links to it. Asked once a
 * minute per server, one ask at a time: a kept answer is given at once, even an old one while it is asked again. A
 * failed or late ask keeps the last answer (closed when there is none, as an API without the field yet) and tries
 * again 10 seconds later.
 */
export function learnOpenToEveryone(now = Date.now()): Promise<boolean> {
  if (everyone && now - everyone.at < ANSWER_TTL_MS) return Promise.resolve(everyone.value);
  asking ??= ask(now).finally(() => {
    asking = null;
  });
  return everyone ? Promise.resolve(everyone.value) : asking;
}

async function ask(now: number): Promise<boolean> {
  try {
    const { learnOpenToEveryone: value } = await withinTimeout(
      graphqlDirect(LearnOpenToEveryoneDocument, undefined, { source: 'ssr' }),
    );
    everyone = { value: value === true, at: now, known: true };
  } catch {
    everyone = { value: everyone?.value ?? false, at: now - ANSWER_TTL_MS + RETRY_MS, known: everyone?.known ?? false };
  }
  return everyone.value;
}

/**
 * `learnOpenToEveryone`, failing while the API has never answered (its first ask failed or was late) instead of
 * guessing closed: for an answer that is kept, so a guess is never kept as if it were the API's. Once it has answered,
 * the last real answer, as `learnOpenToEveryone` gives it.
 */
export async function learnOpenToEveryoneKnown(now = Date.now()): Promise<boolean> {
  const value = await learnOpenToEveryone(now);
  if (!everyone?.known) throw new Error('Learn has not said yet whether it is open');
  return value;
}

/** Forgets the kept answer (tests). */
export function resetLearnOpenToEveryone(): void {
  everyone = null;
  asking = null;
}
