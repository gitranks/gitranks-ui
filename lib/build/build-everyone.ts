import 'server-only';

import { BuildOpenToEveryoneDocument } from './build.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long an answer is kept: opening Build to everyone reaches every server within a minute. */
export const BUILD_EVERYONE_TTL_MS = 60_000;
/** The longest a request waits for the API; no answer by then is closed. */
export const BUILD_EVERYONE_TIMEOUT_MS = 1_000;

/** The kept answer, failures included, so an API that does not know the field yet is asked once a minute at most. */
let everyone: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/** Resolves `fallback` once `ms` passed; the timer is cleared by the caller. */
const lateAfter = (ms: number, fallback: boolean, onTimer: (timer: ReturnType<typeof setTimeout>) => void) =>
  new Promise<boolean>((resolve) => onTimer(setTimeout(() => resolve(fallback), ms)));

/**
 * The API's `buildOpenToEveryone`, within the timeout: true only for a real `true`. Slow, missing (an API that does
 * not know the field yet answers a schema error) or failed is closed, and nothing is logged: until the API knows
 * Build, every answer is closed and that is expected.
 */
async function ask(now: number): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const answer = graphqlDirect(BuildOpenToEveryoneDocument, undefined, { source: 'ssr', signal: controller.signal })
    .then(({ buildOpenToEveryone }) => buildOpenToEveryone === true)
    .catch(() => false);
  try {
    const value = await Promise.race([
      answer,
      lateAfter(BUILD_EVERYONE_TIMEOUT_MS, false, (late) => {
        timer = late;
      }),
    ]);
    everyone = { value, at: now };
    return value;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/**
 * Whether GitRanks Build is open to everyone: then the proxy lets every visitor through to Build's pages. Kept for a
 * minute per server and asked one ask at a time; an answer older than that is given while it is asked again in the
 * background. With no answer kept yet, the request waits for the ask, a second at most. Fails closed.
 */
export function buildOpenToEveryone(now: number): Promise<boolean> {
  if (everyone && now - everyone.at < BUILD_EVERYONE_TTL_MS) return Promise.resolve(everyone.value);
  asking ??= ask(now).finally(() => {
    asking = null;
  });
  return everyone ? Promise.resolve(everyone.value) : asking;
}

/** Forgets the kept answer (tests). */
export function resetBuildOpenToEveryone(): void {
  everyone = null;
  asking = null;
}
