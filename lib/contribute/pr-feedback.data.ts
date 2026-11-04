import 'server-only';

import { cacheLife } from 'next/cache';

import { ContributeMaintainerFactsDocument, ContributePrCardDocument } from './contribute.documents';
import type { ContributeMaintainerFacts, ContributePrCard, ContributePrViewer } from './contribute.types';
import { type PrFeedbackErrorCode, prFeedbackErrorOf } from './errors';
import { currentMaintainerToken } from './maintainer-token';
import { attemptIdOf, type PrTarget, prRefText } from './pr-feedback';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** A PR's public card changes when its repo is renamed, at most. */
const STRIP_REVALIDATE_SEC = 5 * 60;
/** The page waits no longer than this for a read it can do without: an outage must not hold its first byte. */
export const PAGE_READ_TIMEOUT_MS = 2500;

const TIMED_OUT = Symbol('timed out');

/** `read`, or `TIMED_OUT` once `ms` pass first. */
async function within<T>(read: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
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

/**
 * The maintainers page's numbers and the file's keys, as Contribute enforces them: the same for everyone, kept for
 * minutes. Null when the API does not answer in time; the page then leaves the numbers out.
 */
export async function loadMaintainerFacts(): Promise<ContributeMaintainerFacts | null> {
  'use cache';
  cacheLife('minutes');
  try {
    const read = await within(
      graphqlDirect(ContributeMaintainerFactsDocument, undefined, { source: 'ssr' }),
      PAGE_READ_TIMEOUT_MS,
    );
    return read === TIMED_OUT ? null : read.contributeMaintainerFacts;
  } catch {
    return null;
  }
}

/** A footer link's PR as anyone may see it, or why not: `NOT_OURS` for a 404, anything else to try again. */
async function readPublicCard(attemptId: string): Promise<{ card: ContributePrCard } | { error: PrFeedbackErrorCode }> {
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

/** What the report page shows: the sign-in, the form for the visitor's role, or why it can't. */
export type PrReportRead =
  | { state: 'signed-out'; card: ContributePrCard | null }
  | { state: 'found'; card: ContributePrCard; viewer: ContributePrViewer }
  | { state: 'failed'; error: PrFeedbackErrorCode; card: ContributePrCard | null };

/**
 * The PR the report page names, and the visitor's role in its repo, read with the GitHub token of the page's sign-in
 * (a variable, never returned, logged or put in an error). Without that sign-in only a footer link's PR is read, the
 * way anyone sees it.
 */
export async function loadPrReport(target: PrTarget): Promise<PrReportRead> {
  const token = await currentMaintainerToken();
  if (!token) {
    if (!('from' in target)) return { state: 'signed-out', card: null };
    const read = await readPublicCard(target.from);
    return 'card' in read
      ? { state: 'signed-out', card: read.card }
      : { state: 'failed', error: read.error, card: null };
  }

  const variables = 'from' in target ? { from: target.from, token } : { pr: prRefText(target.pr), token };
  try {
    const { contributePrCard } = await graphqlDirect(ContributePrCardDocument, variables, { source: 'ssr' });
    if (!contributePrCard.viewer) return { state: 'failed', error: 'SIGNED_OUT', card: contributePrCard.card };
    return { state: 'found', card: contributePrCard.card, viewer: contributePrCard.viewer };
  } catch (failure) {
    return { state: 'failed', error: prFeedbackErrorOf(failure), card: null };
  }
}
