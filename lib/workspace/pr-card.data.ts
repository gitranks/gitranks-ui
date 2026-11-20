import 'server-only';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributePrCardDocument } from '@/lib/workspace/contribute.documents';
import type { ContributePrCard } from '@/lib/workspace/contribute.types';
import { type PrFeedbackErrorCode, prFeedbackErrorOf } from '@/lib/workspace/errors';
import { attemptIdOf } from '@/lib/workspace/pr-feedback';

/*
 * A footer link's pull request (`?from=`), as both maintainers pages read it: Contribute's (`/contribute/maintainers`)
 * and Learn's (`/learn/maintainers`), with the cap a page waits for a read it can do without.
 */

/** A PR's public card changes when its repo is renamed, at most. */
const STRIP_REVALIDATE_SEC = 5 * 60;
/** The page waits no longer than this for a read it can do without: an outage must not hold its first byte. */
export const PAGE_READ_TIMEOUT_MS = 2500;

export const TIMED_OUT = Symbol('timed out');

/** `read`, or `TIMED_OUT` once `ms` pass first. */
export async function within<T>(read: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    return await Promise.race([read, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** A footer link's PR as anyone may see it, or why not: `NOT_OURS` for a 404, anything else to try again. */
export async function readPublicCard(
  attemptId: string,
): Promise<{ card: ContributePrCard } | { error: PrFeedbackErrorCode }> {
  try {
    const { contributePrCard } = await graphqlDirect(
      ContributePrCardDocument,
      { from: attemptId },
      { source: 'ssr', revalidate: STRIP_REVALIDATE_SEC },
    );
    return { card: contributePrCard.card };
  } catch (failure) {
    const error = prFeedbackErrorOf(failure);
    return { error: error === 'NOT_OURS' ? error : 'FAILED' };
  }
}

/**
 * The PR a footer link names (`?from=`), as anyone may see it: no token, nothing about the visitor. Null for an id we
 * did not give, a PR not opened yet, any failure or a slow answer: the page then shows no strip, never an error.
 */
export async function loadPrStrip(from: unknown): Promise<ContributePrCard | null> {
  const attemptId = attemptIdOf(from);
  if (!attemptId) return null;
  const read = await within(readPublicCard(attemptId), PAGE_READ_TIMEOUT_MS);
  return read !== TIMED_OUT && 'card' in read ? read.card : null;
}
