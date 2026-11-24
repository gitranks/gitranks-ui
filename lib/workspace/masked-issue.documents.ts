import { parse } from 'graphql';

import type { IssueStart } from './issue-start';
import type { IssueLooked, IssueNumbers, IssueOutReason, IssuePage } from './masked-issue.types';
import { START_PAGE_ISSUE_FIELDS } from './start/start-page.documents';
import type { StartPageIssue } from './start/start-page.types';
import type DocumentNode from '@/types/typed-document-node';

/**
 * The page of one issue and a look at it. Each read is an operation of its own, never a field added to an existing
 * query: an API that does not know these fields yet fails only them, and the caller falls back to today's view.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const MASKED = 'id title language size kind projectTier project hints { kind count }';
const PAGE = `state
  masked { ${MASKED} }
  full { id repo number url title labels stars agreementToSign }
  until
  holding { id until }
  reasons note startPath
  looks { limit left tier base merged warned }`;

type Id = { id: string };

/** The page of one issue for the viewer, by its mask id; null for an id no issue has. */
export const IssuePageDocument = doc<{ issuePage: IssuePage | null }, Id>(
  `query IssuePage($id: ID!) { issuePage(id: $id) { ${PAGE} } }`,
);

/** The numbers of a night, the same for everyone, and whether the rules about full issues a day are live. */
export const IssueNumbersDocument = doc<{ issueNumbers: IssueNumbers }>(
  'query IssueNumbers { issueNumbers { read kept at rulesLive } }',
);

/** "See the full issue": holds it for the viewer and answers the page, or why not. */
export const LookAtIssueDocument = doc<
  { lookAtIssue: IssueLooked },
  { id: string; surface: 'LEARN' | 'CONTRIBUTE'; channel: 'WEB' | 'SIGN_IN' }
>(
  `mutation LookAtIssue($id: ID!, $surface: IssueSurface!, $channel: IssueLookChannel) {
  lookAtIssue(id: $id, surface: $surface, channel: $channel) { outcome page { ${PAGE} } }
}`,
);

/** "Give it back". */
export const GiveBackIssueDocument = doc<{ giveBackIssue: IssuePage }, Id>(
  `mutation GiveBackIssue($id: ID!) { giveBackIssue(id: $id) { ${PAGE} } }`,
);

/** One reason of a give-back, on or off. */
export const SetIssueOutReasonDocument = doc<
  { setIssueOutReason: IssuePage },
  { id: string; reason: IssueOutReason; on: boolean }
>(
  `mutation SetIssueOutReason($id: ID!, $reason: IssueOutReason!, $on: Boolean!) {
  setIssueOutReason(id: $id, reason: $reason, on: $on) { ${PAGE} }
}`,
);

/** The note of a give-back. */
export const SaveIssueOutNoteDocument = doc<{ saveIssueOutNote: IssuePage }, { id: string; note: string }>(
  `mutation SaveIssueOutNote($id: ID!, $note: String!) { saveIssueOutNote(id: $id, note: $note) { ${PAGE} } }`,
);

/** Holds the issue 30 minutes from now, once: the prompt copied, or an agent connected. */
export const ExtendIssueLookDocument = doc<{ extendIssueLook: IssuePage }, Id>(
  `mutation ExtendIssueLook($id: ID!) { extendIssueLook(id: $id) { ${PAGE} } }`,
);

/** Starts the held issue on the hosted agent, by its mask id. */
export const StartMaskedIssueDocument = doc<{ startContributeIssue: IssueStart }, { maskId: string }>(
  `mutation StartMaskedIssue($maskId: ID!) {
  startContributeIssue(maskId: $maskId) {
    attempt { id repo number state }
    started refusal value
    holder { id repo number }
    until
  }
}`,
);

/**
 * The Start page's answer for an old address with the issue's mask, for the viewer: the mask is null when they named its
 * project or hold it. An operation of its own, so an API without the field fails it alone and the page asks
 * `StartPageIssue` as today; the answer is read once either way.
 */
export const StartPageMaskDocument = doc<
  { startPageIssue: StartPageIssue & { masked: { id: string } | null } },
  { repo: string; number: number; mode: 'FIX' | 'LEARN' }
>(
  `query StartPageMask($repo: String!, $number: Int!, $mode: ContributeAttemptMode) {
  startPageIssue(repo: $repo, number: $number, mode: $mode) {
    ${START_PAGE_ISSUE_FIELDS}
    masked { id }
  }
}`,
);
