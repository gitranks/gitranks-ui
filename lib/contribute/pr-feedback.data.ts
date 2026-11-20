import 'server-only';

import { cacheLife } from 'next/cache';

import { currentMaintainerToken } from '@/lib/auth/light-sign-in';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeMaintainerFactsDocument, ContributePrCardDocument } from '@/lib/workspace/contribute.documents';
import type { ContributeMaintainerFacts, ContributePrCard, ContributePrViewer } from '@/lib/workspace/contribute.types';
import { type PrFeedbackErrorCode, prFeedbackErrorOf } from '@/lib/workspace/errors';
import { PAGE_READ_TIMEOUT_MS, readPublicCard, TIMED_OUT, within } from '@/lib/workspace/pr-card.data';
import { type PrTarget, prRefText } from '@/lib/workspace/pr-feedback';

/** The footer link's PR, read the way both sides' maintainers pages read it. */
export { loadPrStrip } from '@/lib/workspace/pr-card.data';

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
