import { parse } from 'graphql';

import type { IssueStart } from './issue-start';
import { MASKED_ISSUE_FIELDS } from './masked-issue.fields';
import type {
  IssueLooked,
  IssueLooksToday,
  IssueNumbers,
  IssueOutReason,
  IssuePage,
  MaskedIssue,
} from './masked-issue.types';
import { START_PAGE_ISSUE_FIELDS } from './start/start-page.documents';
import type { StartPageIssue } from './start/start-page.types';
import type DocumentNode from '@/types/typed-document-node';

/** The page of one issue and a look at it. */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const MASKED = MASKED_ISSUE_FIELDS;
const LOOKS = 'limit left tier base merged warned';
const PAGE = `state
  masked { ${MASKED} }
  full { id repo number url title labels stars agreementToSign }
  until
  holding { id until }
  reasons note startPath
  looks { ${LOOKS} }`;

type Id = { id: string };

/** The page of one issue for the viewer, by its mask id; null for an id no issue has. */
export const IssuePageDocument = doc<{ issuePage: IssuePage | null }, Id>(
  `query IssuePage($id: ID!) { issuePage(id: $id) { ${PAGE} } }`,
);

/** The full issues the viewer may see today, and what the limit is made of; null signed out. */
export const IssueLooksTodayDocument = doc<{ issueLooksToday: IssueLooksToday | null }>(
  `query IssueLooksToday { issueLooksToday { ${LOOKS} } }`,
);

/**
 * Skip on a masked row, with why: the issue leaves the person's list for good. Answers the issue that takes its place on
 * that list, none of those still shown (`shown`), or null when the list has no more.
 */
export const SkipMaskedIssueDocument = doc<
  { skipMaskedIssue: MaskedIssue | null },
  { id: string; surface: 'LEARN' | 'CONTRIBUTE' | 'PROFILE'; reason: IssueOutReason | null; shown: string[] }
>(
  `mutation SkipMaskedIssue($id: ID!, $surface: IssueSurface!, $reason: IssueOutReason, $shown: [ID!]) {
  skipMaskedIssue(id: $id, surface: $surface, reason: $reason, shown: $shown) { ${MASKED} }
}`,
);

/** The numbers of a night, the same for everyone. */
export const IssueNumbersDocument = doc<{ issueNumbers: IssueNumbers }>(
  'query IssueNumbers { issueNumbers { read kept at } }',
);

/** "See the full issue": holds it for the viewer and answers the page, or why not. */
export const LookAtIssueDocument = doc<
  { lookAtIssue: IssueLooked },
  { id: string; surface: 'LEARN' | 'CONTRIBUTE' | 'PROFILE'; channel: 'WEB' | 'SIGN_IN' }
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
 * project or hold it. The page reads the issue's answer once, with its mask.
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
