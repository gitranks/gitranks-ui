'use server';

import { run } from './action-run';
import { PR_BODY_MAX, PR_TITLE_MAX } from './attempt-format';
import type { ContributeActionResult } from './errors';
import {
  MarkPullRequestCommentAsksDocument,
  MarkPullRequestRoundNotNeededDocument,
  PullRequestListDocument,
  type PullRequestRefInput,
  ReopenPullRequestRoundDocument,
  SendPullRequestDocument,
  SendPullRequestRoundDocument,
  SetPullRequestReplyDocument,
} from './pull-request.documents';
import type { PullRequestList, PullRequestPage, PullRequestRoundNotNeeded } from './pull-request-page.types';
import { pullRequestListOf, pullRequestPageOf } from './pull-request-read';

/*
 * The calls of a pull request's page, Approve and the list, always as the session's user. Each call that changes the
 * page answers the page after it (null when the fix is not the person's), so the page draws it at once.
 */

const NAME = /^[\w.-]{1,100}$/;
const ID = /^[\w-]{1,64}$/;
const MAX_INT = 2_147_483_647;
/** A reply's words, as the page lets the person edit them. */
const REPLY_MAX = 65_536;
const REASONS: readonly PullRequestRoundNotNeeded[] = [
  'FAILS_ON_BASE',
  'ASKS_NOTHING',
  'ALREADY_ANSWERED',
  'BOT_IS_WRONG',
  'OTHER',
];

type PageResult = ContributeActionResult<PullRequestPage | null>;

const refused = (
  message = 'That was not accepted. Reload the page.',
): { ok: false; error: 'INVALID'; message: string } => ({
  ok: false,
  error: 'INVALID',
  message,
});

/** A fix the browser names: only a well-formed one. */
function refOf(value: unknown): PullRequestRefInput | null {
  const ref = value && typeof value === 'object' ? (value as Partial<PullRequestRefInput>) : null;
  if (!ref || typeof ref.owner !== 'string' || typeof ref.repo !== 'string') return null;
  if (!NAME.test(ref.owner) || !NAME.test(ref.repo)) return null;
  const issue = ref.issue;
  if (typeof issue !== 'number' || !Number.isInteger(issue) || issue < 1 || issue > MAX_INT) return null;
  const attempt = ref.attempt ?? null;
  if (attempt !== null && (typeof attempt !== 'string' || !ID.test(attempt))) return null;
  return { owner: ref.owner, repo: ref.repo, issue, attempt };
}

const roundOf = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000 ? value : null;

/** Sends the pull request with the words as the person wrote them, and the sign-off when the project asks for one. */
export async function sendPullRequestAction(
  ref: unknown,
  send: { title?: unknown; description?: unknown; signOff?: unknown },
): Promise<PageResult> {
  const input = refOf(ref);
  if (!input) return refused();
  const title = typeof send?.title === 'string' ? send.title.trim() : '';
  const description = typeof send?.description === 'string' ? send.description : '';
  if (!title) return refused('Give the pull request a title.');
  if (title.length > PR_TITLE_MAX) return refused(`Keep the title under ${PR_TITLE_MAX} characters.`);
  if (description.length > PR_BODY_MAX) {
    return refused(`Keep the description under ${PR_BODY_MAX.toLocaleString('en-US')} characters.`);
  }
  return run(
    SendPullRequestDocument,
    { input: { ref: input, title, description, signOff: send.signOff === true } },
    (data) => pullRequestPageOf(data.sendPullRequest),
  );
}

/** Sends a round as a whole: its commits and every reply not left out. */
export async function sendRoundAction(ref: unknown, round: unknown): Promise<PageResult> {
  const input = refOf(ref);
  const n = roundOf(round);
  if (!input || !n) return refused();
  return run(SendPullRequestRoundDocument, { ref: input, round: n }, (data) =>
    pullRequestPageOf(data.sendPullRequestRound),
  );
}

/** Leaves a reply out of its round or puts it back; with `text`, saves its edited words. */
export async function setReplyAction(
  ref: unknown,
  round: unknown,
  reply: unknown,
  change: { leftOut?: unknown; text?: unknown },
): Promise<PageResult> {
  const input = refOf(ref);
  const n = roundOf(round);
  if (!input || !n || typeof reply !== 'string' || !ID.test(reply) || typeof change?.leftOut !== 'boolean') {
    return refused();
  }
  const text = typeof change.text === 'string' ? change.text : undefined;
  if (text !== undefined && (!text.trim() || text.length > REPLY_MAX)) return refused('A reply needs a few words.');
  return run(
    SetPullRequestReplyDocument,
    { input: { ref: input, round: n, reply, leftOut: change.leftOut, ...(text === undefined ? {} : { text }) } },
    (data) => pullRequestPageOf(data.setPullRequestReply),
  );
}

/** Closes a round as not needed, with the reason the person picked. */
export async function markRoundNotNeededAction(ref: unknown, round: unknown, reason: unknown): Promise<PageResult> {
  const input = refOf(ref);
  const n = roundOf(round);
  if (!input || !n || !REASONS.includes(reason as PullRequestRoundNotNeeded)) return refused();
  return run(MarkPullRequestRoundNotNeededDocument, { ref: input, round: n, reason: reason as string }, (data) =>
    pullRequestPageOf(data.markPullRequestRoundNotNeeded),
  );
}

/** Opens a round marked as not needed again. */
export async function reopenRoundAction(ref: unknown, round: unknown): Promise<PageResult> {
  const input = refOf(ref);
  const n = roundOf(round);
  if (!input || !n) return refused();
  return run(ReopenPullRequestRoundDocument, { ref: input, round: n }, (data) =>
    pullRequestPageOf(data.reopenPullRequestRound),
  );
}

/** "It does need an answer": a comment judged to ask for nothing asks after all. */
export async function markCommentAsksAction(ref: unknown, comment: unknown): Promise<PageResult> {
  const input = refOf(ref);
  if (!input || typeof comment !== 'string' || !comment || comment.length > 200) return refused();
  return run(MarkPullRequestCommentAsksDocument, { ref: input, comment }, (data) =>
    pullRequestPageOf(data.markPullRequestCommentAsks),
  );
}

/** 20 more of "Ended", after the last page's cursor. */
export async function moreEndedAction(after: unknown): Promise<ContributeActionResult<PullRequestList | null>> {
  if (typeof after !== 'string' || !after || after.length > 500) return refused();
  return run(PullRequestListDocument, { after }, (data) => pullRequestListOf(data.pullRequestList));
}
