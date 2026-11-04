import 'server-only';

import { ContributeMaintainerFactsDocument, ContributePrCardDocument } from './contribute.documents';
import type { ContributeMaintainerFacts, ContributePrCard, ContributePrViewer } from './contribute.types';
import { type PrFeedbackErrorCode, prFeedbackErrorOf } from './errors';
import { currentMaintainerToken } from './maintainer-token';
import { attemptIdOf, type PrTarget, prRefText } from './pr-feedback';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The same for everyone until the next deploy: kept for an hour. */
const FACTS_REVALIDATE_SEC = 60 * 60;
/** A PR's public card changes when its repo is renamed, at most. */
const STRIP_REVALIDATE_SEC = 5 * 60;

/** The maintainers page's numbers and the file's keys, as Contribute enforces them; null when the API does not answer. */
export async function loadMaintainerFacts(): Promise<ContributeMaintainerFacts | null> {
  try {
    const { contributeMaintainerFacts } = await graphqlDirect(ContributeMaintainerFactsDocument, undefined, {
      source: 'ssr',
      revalidate: FACTS_REVALIDATE_SEC,
    });
    return contributeMaintainerFacts;
  } catch {
    return null;
  }
}

/**
 * The PR a footer link names (`?from=`), as anyone may see it: no token, nothing about the visitor. Null for an id we
 * did not give, a PR not opened yet, or any failure: the page then shows no strip, never an error.
 */
export async function loadPrStrip(from: unknown): Promise<ContributePrCard | null> {
  const attemptId = attemptIdOf(from);
  if (!attemptId) return null;
  try {
    const { contributePrCard } = await graphqlDirect(
      ContributePrCardDocument,
      { from: attemptId },
      { source: 'ssr', revalidate: STRIP_REVALIDATE_SEC },
    );
    return contributePrCard.card;
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
    const card = await loadPrStrip(target.from);
    return card ? { state: 'signed-out', card } : { state: 'failed', error: 'NOT_OURS', card: null };
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
