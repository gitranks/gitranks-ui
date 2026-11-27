import 'server-only';

import { InterviewsOpenToEveryoneDocument } from './interviews.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer is kept: opening Interviews to everyone reaches every server within a minute. */
export const INTERVIEWS_EVERYONE_TTL_MS = 60_000;
/** After a failed or slow ask, the last answer holds this long before the next try. */
export const INTERVIEWS_EVERYONE_RETRY_MS = 10_000;
/** The longest a request waits for the API; no answer by then is a failed ask. */
export const INTERVIEWS_EVERYONE_TIMEOUT_MS = 1_000;

/** The kept answer: the last real one, or closed when there was none. */
let everyone: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/** Resolves null once `ms` passed; the timer is cleared by the caller. */
const lateAfter = (ms: number, onTimer: (timer: ReturnType<typeof setTimeout>) => void) =>
  new Promise<null>((resolve) => onTimer(setTimeout(() => resolve(null), ms)));

/**
 * The API's `interviewsOpenToEveryone`, within the timeout: true only for a real `true`, false for any other answer. Slow,
 * missing (an API that does not know the field yet answers a schema error) or failed is a failed ask: the last real
 * answer is kept (closed when there is none) and asked again 10 seconds later. Nothing is logged: until the API knows
 * Interviews, every ask fails and that is expected.
 */
async function ask(now: number): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const answer = graphqlDirect(InterviewsOpenToEveryoneDocument, undefined, {
    source: 'ssr',
    signal: controller.signal,
  })
    .then(({ interviewsOpenToEveryone }) => interviewsOpenToEveryone === true)
    .catch(() => null);
  try {
    const value = await Promise.race([
      answer,
      lateAfter(INTERVIEWS_EVERYONE_TIMEOUT_MS, (late) => {
        timer = late;
      }),
    ]);
    everyone =
      value === null
        ? { value: everyone?.value ?? false, at: now - INTERVIEWS_EVERYONE_TTL_MS + INTERVIEWS_EVERYONE_RETRY_MS }
        : { value, at: now };
    return everyone.value;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/**
 * Whether GitRanks Interviews is open to everyone: then the proxy lets every visitor through to its pages. Kept for a
 * minute per server and asked one ask at a time; an answer older than that is given while it is asked again in the
 * background. With no answer kept yet, the request waits for the ask, a second at most. Fails closed: open only once
 * the API really said so.
 */
export function interviewsOpenToEveryone(now: number): Promise<boolean> {
  if (everyone && now - everyone.at < INTERVIEWS_EVERYONE_TTL_MS) return Promise.resolve(everyone.value);
  asking ??= ask(now).finally(() => {
    asking = null;
  });
  return everyone ? Promise.resolve(everyone.value) : asking;
}

/** Forgets the kept answer (tests). */
export function resetInterviewsOpenToEveryone(): void {
  everyone = null;
  asking = null;
}
