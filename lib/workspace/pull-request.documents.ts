import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/*
 * The pull request's page, Approve and the list of pull requests: each read and each call is its own operation, apart
 * from every other page's reads, so an API that does not know one yet fails that one alone.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A fix of the person's, as the API's `PullRequestRef` takes it: the issue, and its first attempt. */
export type PullRequestRefInput = { owner: string; repo: string; issue: number; attempt: string | null };

const LESSON = 'lesson { slug title course courseName }';
const ASK = 'id kind author bot excerpt comments url';
const ROUND = `n state openedAt asked { ${ASK} } did commits replies { id to text leftOut } sentAt since { ${ASK} }
  notNeeded closedBy prompt`;
const PAGE = `attemptId made hosted agent repo issueNumber issueTitle issueUrl number url ${LESSON} lessonConfirmed
  stages stage working box round openingStep autoSend stoppedAtLimit onlyYou { kind text url }
  change { summary files added removed } walkthrough { questions answered passedAt readers shared }
  rounds { ${ROUND} } since { ${ASK} }
  checks { pass agentCanFix needsYou notYours rows { name class reason url } }
  rules lessonToAsk outcome waysOn { lessonQuestions lessonIssues course }`;
const ROW = `attemptId made repo issueNumber issueUrl number url title group box round mark stoppedAtLimit agent costUsd
  ${LESSON} pageRemoved since path`;

/** The page of one fix of the person's; null when it is not theirs. */
export const PullRequestPageDocument = doc<{ pullRequestPage: unknown }, { ref: PullRequestRefInput }>(
  `query PullRequestPage($ref: PullRequestRef!) { pullRequestPage(ref: $ref) { ${PAGE} } }`,
);

/** What Approve needs; null when the fix is not theirs or does not wait for its approval. */
export const PullRequestApprovalDocument = doc<{ pullRequestApproval: unknown }, { ref: PullRequestRefInput }>(
  `query PullRequestApproval($ref: PullRequestRef!) {
  pullRequestApproval(ref: $ref) {
    title description footer titlePrefix signOffNeeded signOffOn githubAllowed walkthroughPassed
    lessonLater { slug title course courseName } change { summary files added removed }
    files { path added removed } filesTotal
  }
}`,
);

/** The person's pull requests: needs them, in progress, then 20 of "Ended" at a time after the cursor. */
export const PullRequestListDocument = doc<{ pullRequestList: unknown }, { after: string | null }>(
  `query PullRequestList($after: String) {
  pullRequestList(after: $after) { rows { ${ROW} } open limit atLimit more }
}`,
);

/** Whether an attempt's public page can still be hidden: only when its approval carried that choice. */
export const AttemptTimelineHideableDocument = doc<{ contributeAttempt: unknown }, { id: string }>(
  `query AttemptTimelineHideable($id: ID!) {
  contributeAttempt(id: $id) { attemptId timeline { eligible shown hideable } }
}`,
);

/** Sends a fix's pull request with the words as written: the page after. */
export const SendPullRequestDocument = doc<
  { sendPullRequest: unknown },
  { input: { ref: PullRequestRefInput; title: string; description: string; signOff: boolean } }
>(`mutation SendPullRequest($input: PullRequestSendInput!) { sendPullRequest(input: $input) { ${PAGE} } }`);

/** Sends a round as a whole: the page after. */
export const SendPullRequestRoundDocument = doc<
  { sendPullRequestRound: unknown },
  { ref: PullRequestRefInput; round: number }
>(
  `mutation SendPullRequestRound($ref: PullRequestRef!, $round: Int!) {
  sendPullRequestRound(ref: $ref, round: $round) { ${PAGE} }
}`,
);

/** Leaves a reply out of its round, puts it back, or saves its words: the page after. */
export const SetPullRequestReplyDocument = doc<
  { setPullRequestReply: unknown },
  { input: { ref: PullRequestRefInput; round: number; reply: string; leftOut: boolean; text?: string } }
>(`mutation SetPullRequestReply($input: PullRequestReplyInput!) { setPullRequestReply(input: $input) { ${PAGE} } }`);

/** Closes a round as not needed, with why: the page after. */
export const MarkPullRequestRoundNotNeededDocument = doc<
  { markPullRequestRoundNotNeeded: unknown },
  { ref: PullRequestRefInput; round: number; reason: string }
>(
  `mutation MarkPullRequestRoundNotNeeded($ref: PullRequestRef!, $round: Int!, $reason: PullRequestRoundNotNeeded!) {
  markPullRequestRoundNotNeeded(ref: $ref, round: $round, reason: $reason) { ${PAGE} }
}`,
);

/** Opens a round marked as not needed again: the page after. */
export const ReopenPullRequestRoundDocument = doc<
  { reopenPullRequestRound: unknown },
  { ref: PullRequestRefInput; round: number }
>(
  `mutation ReopenPullRequestRound($ref: PullRequestRef!, $round: Int!) {
  reopenPullRequestRound(ref: $ref, round: $round) { ${PAGE} }
}`,
);

/** "It does need an answer": a comment judged to ask for nothing asks after all. The page after. */
export const MarkPullRequestCommentAsksDocument = doc<
  { markPullRequestCommentAsks: unknown },
  { ref: PullRequestRefInput; comment: string }
>(
  `mutation MarkPullRequestCommentAsks($ref: PullRequestRef!, $comment: ID!) {
  markPullRequestCommentAsks(ref: $ref, comment: $comment) { ${PAGE} }
}`,
);

/** The "needs you" items' kinds and fixes: which walkthroughs wait for another pass. */
export const NeedsYouKindsDocument = doc<{ contributeNeedsYou: unknown }>(
  'query NeedsYouKinds { contributeNeedsYou { items { kind attemptId } } }',
);

/** Why each stopped walkthrough stopped; its own read, so an API without the reason leaves the kinds. */
export const BlockedWalkthroughReasonsDocument = doc<{ contributeNeedsYou: unknown }>(
  'query BlockedWalkthroughReasons { contributeNeedsYou { items { kind attemptId facts { blockedReason } } } }',
);
