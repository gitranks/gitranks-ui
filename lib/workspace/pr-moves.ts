import type { Route } from 'next';

import { githubUrlOf, type Tone } from './attempt-format';
import type {
  ContributeAttempt,
  ContributeContribution,
  ContributePrSignal,
  ContributePrSignalKind,
  ContributeReplyWaiting,
  ContributeView,
} from './contribute.types';
import { FOLLOW_UP_STEP_LABELS, FOLLOW_UP_STEPS, type FollowUpStep } from './follow-up-flow';
import {
  clearsAllOf,
  PR_SIGNAL_KINDS,
  repoOutReasonOf,
  repoOutTextOf,
  repoSaidNoOf,
  silentTextOf,
} from './follow-up-format';
import { replyRowOf } from './needs-you-replies';
import { isToApprove } from './one-comment';
import { type ContributePrConventionIssue, httpsOnly, PR_FIX_WORDS } from './pr-conventions';
import { askedForOf, type ProofStage, proofStageOf, proofTellsBlock, proofWaits } from './proof';
import { nextSessionPath, sessionPath } from './sessions';

/**
 * What waits on an open pull request, as its page builds its moves from it (2026-11-03): each reason with its pill,
 * the user's move in one sentence and one button, in Needs you's order (`candidatesOf`). The Pull requests tab's list
 * is the API's (`contributeNeedsYou`, worded by `needs-you-words.ts`); the page keeps this model of its own, and a
 * parity spec holds the two to the same lead. Pure.
 */

/** What a row is about, one per reason Needs you lists. */
export type NeedsYouKind =
  | 'key'
  | 'grant'
  | 'autopilot'
  | 'review'
  | 'own-review'
  | 'run-ready'
  | 'run-autopilot'
  | 'changes'
  | 'comment'
  | 'check'
  | 'replies'
  | 'reply-failed'
  | 'conversation'
  | 'check-yours'
  | 'agreement'
  | 'cla'
  | 'title'
  | 'description'
  | 'changelog'
  | 'bot'
  | 'proof'
  | 'proof-working'
  | 'proof-review'
  | 'proof-failed'
  | 'proof-posted'
  | 'run-found'
  | 'run-stopped'
  | 'push-failed'
  | 'dco'
  | 'silent'
  | 'repo-out'
  | 'fix-failed'
  | 'other'
  | 'working'
  | 'own-working'
  | 'pushed'
  | 'signing-off';

/** The row's button: a page of ours, or GitHub (`copy`: text put on the clipboard first, the comment to post). */
export type NeedsYouAction =
  | { label: string; href: Route; aria: string }
  | { label: string; external: string; copy?: string; aria: string };

/**
 * The row's small second action: a page of ours, or "I signed it": the signals of `kinds` marked handled. `all`: they
 * are every signal on the pull request, so an API that does not take `kinds` yet clears the same; never for a
 * conversation comment or the checks only the user can clear, which always name their own kind.
 */
export type NeedsYouSecondary =
  | { label: string; href: Route }
  | { label: string; handled: { prId: string; prNumber: number; kinds: ContributePrSignalKind[]; all: boolean } };

export type NeedsYouItem = {
  key: string;
  kind: NeedsYouKind;
  tone: Tone;
  pill: string;
  /** `repo · PR #12`, `repo · issue #871`, `Claude key …k3Qa`. */
  where: string | null;
  title: string | null;
  /** The user's move in one sentence (a working row: what the run does). Untrusted parts are plain text. */
  move: string;
  /** The other things waiting on the same pull request: "and 2 more". */
  more: number;
  /** Null while nothing is for the user to do (the sign-off being sent). */
  action: NeedsYouAction | null;
  secondary: NeedsYouSecondary | null;
  /** A run under way: a live dot, an outline button, not counted. */
  working: boolean;
};

// ---------------------------------------------------------------------------------------------------------------------
// Words

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** A sentence's end: one full stop, none doubled. */
const sentence = (text: string) => {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

/** Text set in brackets inside a sentence: without its own closing full stop. */
export const bracketed = (text: string) => text.trim().replace(/[.!?…]+$/, '');

/**
 * A failed push's detail worth saying: none when it only restates that the push failed (the API's fallback when the
 * push left no note, `The push failed (patch_conflict)`): the row already says so.
 */
export const pushDetailOf = (detail: string | null | undefined): string | null => {
  const text = detail?.trim();
  return text && !/^the push failed\b/i.test(text) ? text : null;
};

/** Untrusted text cut to a line: `max` characters at most, with an ellipsis. */
export const clipped = (text: string, max = 160) => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
};

/** `42 min`, `3 h`, `2 d`: how long until `at`, for a pill. */
export function shortLeftOf(at: string | null | undefined, now: Date): string | null {
  const ms = timeOf(at) - now.getTime();
  if (!Number.isFinite(ms)) return null;
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} d`;
}

/**
 * A review bot's ask for proof, as its row says it: the ask itself, the user's agent at work on it, the proof back for
 * the user, a post that failed, or one posted that the bot has yet to read. Null when no proof is asked or under way.
 */
function proofCandidateOf(
  pr: ContributeContribution,
  stage: ProofStage,
  by: string | null,
  toNext: (label: string) => NeedsYouAction,
): Omit<Candidate, 'at'> | null {
  if (stage === 'ask-cleared') return null;
  const bot = pr.proof?.ask?.bot ?? by ?? 'The review bot';
  switch (stage) {
    case 'working':
    case 'posting':
      return {
        kind: 'proof-working',
        tone: 'violet',
        pill: stage === 'posting' ? 'Posting the proof' : 'Your agent',
        move:
          stage === 'posting'
            ? 'GitRanks is posting the proof you checked.'
            : 'Your own agent is capturing the proof on your machine.',
        action: toNext('See the proof'),
        secondary: null,
      };
    case 'review':
    case 'cannot':
    case 'fix-broken':
    case 'unreadable':
      return {
        kind: 'proof-review',
        tone: 'amber',
        pill: 'Check the proof',
        move:
          stage === 'review'
            ? `Your agent captured the proof ${bot} asks for. Check it, then post it.`
            : stage === 'cannot'
              ? "Your agent couldn't capture the proof. Read why, and the reply it drafted."
              : stage === 'fix-broken'
                ? "Your agent found the fix doesn't work. Read what it saw."
                : "Your agent's proof can't be shown here. Send it back, or discard it.",
        action: toNext(stage === 'review' ? 'Check the proof' : 'Read it'),
        secondary: null,
      };
    case 'failed':
      return {
        kind: 'proof-failed',
        tone: 'red',
        pill: 'Posting failed',
        move: 'Posting the proof failed; its page says why. Try again, or discard it.',
        action: toNext('See what failed'),
        secondary: null,
      };
    case 'posted':
      return {
        kind: 'proof-posted',
        tone: 'violet',
        pill: 'Bot reads it',
        move: `Proof posted. ${bot} reads it again; this leaves once it lets the merge through.`,
        action: toNext('See the proof'),
        secondary: null,
      };
    default:
      return {
        kind: 'proof',
        tone: 'amber',
        pill: 'Proof needed',
        move: `${bot} asks for ${askedForOf(pr.proof?.ask?.title ?? 'proof')}. Your own agent can capture it on your machine.`,
        action: toNext('Get the proof'),
        secondary: null,
      };
  }
}

/** A review bot's block as its signal tells it: `clawsweeper: Blocked before merge …`. */
export function botVerdictOf(signal: Pick<ContributePrSignal, 'detail'>): { by: string | null; verdict: string } {
  const detail = (signal.detail ?? '').trim();
  const at = detail.indexOf(': ');
  return at > 0 ? { by: detail.slice(0, at), verdict: detail.slice(at + 2) } : { by: null, verdict: detail };
}

/** How a run that pushed nothing ended: a stop, a failed push, else the agent's no-go (also when the API does not say). */
export function runOutcomeOf(signal: Pick<ContributePrSignal, 'outcome'>): 'no_go' | 'stopped' | 'push_failed' {
  const outcome = String(signal.outcome ?? '').toLowerCase();
  return outcome === 'stopped' || outcome === 'push_failed' ? outcome : 'no_go';
}

/** The step a follow-up in flight is on: the list's `followUpStep`, else what its state says. */
export function runStepOf(run: Pick<ContributeAttempt, 'state' | 'followUpStep'>): string {
  const step = String(run.followUpStep ?? '').toLowerCase();
  if ((FOLLOW_UP_STEPS as readonly string[]).includes(step)) return FOLLOW_UP_STEP_LABELS[step as FollowUpStep];
  switch (run.state) {
    case 'QUEUED':
    case 'CLAIMING':
      return 'Starting';
    case 'CHECKS':
      return FOLLOW_UP_STEP_LABELS.checks;
    case 'SUBMITTING':
      return 'Pushing';
    default:
      return 'Working';
  }
}

/**
 * Who asks a PR rule, to open its row: `fallback` with the repo's file that asks it, "The repo's rules (in its
 * .github/agents/pr-and-commit-rules.md)", from the issue's `source`. Rows say why the user sees them (owner, 2026-11-03).
 */
const ruleSource = (issue: ContributePrConventionIssue | undefined, fallback: string): string => {
  const label = issue?.source?.label?.trim();
  return label ? `${fallback} (in its ${clipped(label, 80)})` : fallback;
};

/** The repo's agreement by its own name: a CLA, or a DCO signed like one. */
const agreementOf = (cla: { agreement?: string | null } | null | undefined) =>
  cla?.agreement === 'DCO' ? 'DCO' : 'CLA';

// ---------------------------------------------------------------------------------------------------------------------
// The rows

const KNOWN_KINDS = new Set<string>(PR_SIGNAL_KINDS);

/** A submission bounced for want of GitHub access: the first submit, before the grant, or after it was revoked. */
const GRANT_REASONS = new Set(['grant_missing', 'grant_revoked']);

/** The order of the groups: the key, GitHub access, autopilot, the reviews, the replies, the pull requests. */
export const GROUPS = { key: 0, grant: 2, autopilot: 3, review: 4, replies: 5, pr: 6 } as const;

export const isGrantBounce = (view: ContributeView, attempt: ContributeAttempt) =>
  view.grant?.connected !== true &&
  attempt.state === 'REVIEW' &&
  GRANT_REASONS.has(attempt.submit?.lastError?.reason?.toLowerCase() ?? '');

/** The organization, as reply rows name it: the owner part of the repo's name. */
const orgOf = (nameWithOwner: string | null | undefined) => nameWithOwner?.split('/')[0] || 'the organization';

/** The next run's number: one past the runs so far. */
const nextRunOf = (pr: ContributeContribution) =>
  Math.max(pr.followUps?.used ?? 0, pr.followUps?.history?.length ?? 0) + 1;

/** One reason waiting on an open pull request, before the first of them is chosen to lead its row. */
export type Candidate = Pick<NeedsYouItem, 'kind' | 'tone' | 'pill' | 'move' | 'action' | 'secondary'> & { at: number };

/** Who the drafts answer: `@mo`, or "the maintainers" when several or none are named. Logins as GitHub writes them. */
const draftsTo = (drafts: ContributeReplyWaiting[]) => {
  const authors = new Set(drafts.map(({ comment }) => comment?.author ?? null));
  const [author] = authors;
  return authors.size === 1 && author ? `@${author}` : 'the maintainers';
};

/** A pull request whose page holds what to do next: what the reads found, and the replies waiting on it. */
export type PrContext = {
  pr: ContributeContribution;
  /** The reply drafts on it the user can approve now. */
  drafts: ContributeReplyWaiting[];
  /** The follow-ups read (in flight, or listed), to name a run's number and step. */
  runs: ContributeAttempt[];
  now: Date;
};

/**
 * The reasons on an open pull request, in Needs you's order: what a run can do first (changes requested, a review
 * comment, a failing check), the replies, then the user's own, led by a comment in the conversation and the checks
 * only they can clear.
 */
export function candidatesOf({ pr, drafts, runs, now }: PrContext): Candidate[] {
  const signals = pr.needsYou?.signals ?? [];
  const first = (kind: ContributePrSignalKind) => signals.find((signal) => signal.kind === kind);
  const number = pr.pullRequest.number;
  const prUrl = githubUrlOf(pr.pullRequest.url);
  const next = nextSessionPath(pr.attemptId);
  const run = nextRunOf(pr);
  // A pull request the user opened by hand takes no run: what a run would do is theirs, on GitHub.
  const byHand = pr.openedBy === 'HAND';
  // Nor does one in a repo that said no to AI-made PRs: what a run would do is the user's, on GitHub.
  const saidNo = repoSaidNoOf(signals);
  const noRun = byHand || saidNo;
  const held = signals.map(({ kind }) => kind);
  const handled = (label: string, kinds: ContributePrSignalKind[]): NeedsYouSecondary => ({
    label,
    handled: { prId: pr.pullRequest.prId, prNumber: number, kinds, all: clearsAllOf(held, kinds) },
  });
  const onGithub = (label: string): NeedsYouAction =>
    prUrl
      ? { label: `${label} ↗`, external: prUrl, aria: `${label} #${number} on GitHub (opens in a new tab)` }
      : { label: 'See what to do', href: next, aria: `See what to do on PR #${number}` };
  const toNext = (label: string): NeedsYouAction => ({ label, href: next, aria: `${label} on PR #${number}` });
  const list: Candidate[] = [];

  const changes = first('CHANGES_REQUESTED');
  if (changes) {
    list.push({
      kind: 'changes',
      tone: 'amber',
      pill: 'Changes requested',
      move: noRun
        ? `A reviewer asked for changes. Make them on GitHub: no run adds to ${byHand ? 'a pull request you opened yourself' : 'a pull request in a repo that said no'}.`
        : `A reviewer asked for changes. Start run ${run} on them.`,
      action: noRun ? onGithub('Open the pull request') : toNext(`Start run ${run}`),
      secondary: noRun ? handled("I've done it", ['CHANGES_REQUESTED']) : null,
      at: timeOf(changes.at),
    });
  }
  const comment = first('COMMENT');
  if (comment) {
    list.push({
      kind: 'comment',
      tone: 'amber',
      pill: 'New comment',
      move: noRun
        ? 'Someone commented on it. Reply on GitHub.'
        : `Someone commented on it. Let run ${run} answer, or reply on GitHub.`,
      action: noRun ? onGithub('Reply on GitHub') : toNext(`Answer with run ${run}`),
      secondary: noRun ? handled("I've replied", ['COMMENT']) : null,
      at: timeOf(comment.at),
    });
  }
  const check = first('CHECK_FAILED');
  if (check) {
    const names = clipped(check.detail?.trim() || 'A check', 80);
    const fails = names.includes(', ') ? 'fail' : 'fails';
    list.push({
      kind: 'check',
      tone: 'red',
      pill: 'Check failing',
      move: noRun
        ? `${names} ${fails} on your pull request. Fix it on your branch.`
        : `${names} ${fails} on your pull request. Start run ${run} to fix it.`,
      action: noRun ? onGithub('Open the pull request') : toNext(`Fix with run ${run}`),
      secondary: noRun ? handled("I've fixed it", ['CHECK_FAILED']) : null,
      at: timeOf(check.at),
    });
  }

  // Held back by the run's plan (the not-posted row says them), or waiting for its first reply (no row): not to approve.
  const waiting = drafts.filter(isToApprove);
  if (waiting.length) {
    const by = runs.find(({ attemptId }) => attemptId === waiting[0].attemptId)?.round?.round;
    list.push({
      kind: 'replies',
      tone: 'amber',
      pill: 'Replies to approve',
      move: `${by ? `Run ${by}` : 'A run'} drafted ${plural(waiting.length, 'reply', 'replies')} to ${draftsTo(waiting)}. Read and post them.`,
      action: {
        label: waiting.length === 1 ? 'Approve the reply' : 'Approve replies',
        href: sessionPath(pr.attemptId, waiting[0].attemptId),
        aria: `Approve the replies on PR #${number}`,
      },
      secondary: null,
      at: Math.min(...waiting.map(({ createdAt }) => timeOf(createdAt))),
    });
  }
  const notPosted = replyRowOf(drafts, runs, orgOf(pr.nameWithOwner));
  if (notPosted) {
    list.push({
      kind: 'reply-failed',
      tone: notPosted.tone,
      pill: notPosted.pill,
      move: notPosted.move,
      action: {
        label: notPosted.label,
        href: `${sessionPath(pr.attemptId, notPosted.runId)}?move=reply-failed` as Route,
        aria: `${notPosted.label} on PR #${number}`,
      },
      secondary: null,
      at: Math.min(...notPosted.drafts.map(({ updatedAt }) => timeOf(updatedAt))),
    });
  }

  // The user's own, with no run for either: a comment in the conversation is theirs to read and answer, and a run
  // judged these checks theirs to clear. Each its own row, so marking one handled leaves the other.
  const talk = first('CONVERSATION');
  if (talk) {
    list.push({
      kind: 'conversation',
      tone: 'amber',
      pill: 'Conversation comment',
      move: "Someone commented in the pull request's conversation. Read it, and reply on GitHub if it asks for one.",
      action: toNext('See the comment'),
      secondary: handled("I've replied", ['CONVERSATION']),
      at: timeOf(talk.at),
    });
  }
  const yours = first('CHECK_YOURS');
  if (yours) {
    const todo = yours.detail?.trim();
    list.push({
      kind: 'check-yours',
      tone: 'amber',
      pill: 'Check only you can clear',
      move: todo ? sentence(clipped(todo, 300)) : 'A failing check is yours to clear: no run can. See it on GitHub.',
      action: onGithub('Open the pull request'),
      secondary: handled("I've done it", ['CHECK_YOURS']),
      at: timeOf(yours.at),
    });
  }

  const cla = first('CLA');
  if (cla) {
    const conventions = pr.conventions?.cla;
    const agreement = agreementOf(conventions);
    const signComment = conventions?.signComment?.trim();
    const signUrl = httpsOnly(conventions?.signUrl);
    const claCheck = conventions?.check?.trim() || cla.detail?.trim();
    list.push(
      signComment
        ? {
            kind: 'agreement',
            tone: 'amber',
            pill: 'Agreement to sign',
            move: `Only you can sign the repo's ${agreement}; its bot records it from this comment on PR #${number}, word for word: "${clipped(signComment, 300)}"`,
            action: prUrl
              ? {
                  label: 'Copy and open the PR ↗',
                  external: prUrl,
                  copy: signComment,
                  aria: `Copy the comment and open PR #${number} on GitHub (opens in a new tab)`,
                }
              : toNext('See the comment'),
            secondary: handled('I posted it', ['CLA']),
            at: timeOf(cla.at),
          }
        : {
            kind: 'cla',
            tone: 'amber',
            pill: `${agreement} to sign`,
            move: `The repo merges code only from people who signed its ${agreement}${
              claCheck ? ` (its check: ${clipped(claCheck, 80)})` : ''
            }, and only you can sign it. Sign it on its page; this clears once the check passes.`,
            action:
              signUrl || prUrl
                ? {
                    label: `Sign the ${agreement} ↗`,
                    external: (signUrl ?? prUrl) as string,
                    aria: `Sign the ${agreement} for PR #${number} (opens in a new tab)`,
                  }
                : toNext(`Sign the ${agreement}`),
            secondary: handled('I signed it', ['CLA']),
            at: timeOf(cla.at),
          },
    );
  }

  const issues = pr.prIssues ?? [];
  const title = first('TITLE');
  const titleIssue = issues.find(({ kind }) => kind === 'TITLE');
  if (title || titleIssue) {
    list.push({
      kind: 'title',
      tone: 'amber',
      pill: 'Title rule',
      move: `${ruleSource(titleIssue, 'The repo sets a rule for pull request titles')}, and this one breaks it. ${
        titleIssue ? 'Fix it in one click.' : 'Retitle the pull request on GitHub.'
      }`,
      action: toNext('Fix the title'),
      secondary: null,
      at: timeOf(title?.at ?? pr.pullRequest.openedAt),
    });
  }
  const template = issues.find(({ kind }) => kind === 'TEMPLATE');
  if (template) {
    // The repo leaves its template to the person who tested the change: no one-click fix, the user fills it on GitHub.
    const yours = !template.check;
    list.push({
      kind: 'description',
      tone: 'amber',
      pill: 'Description rule',
      move: yours
        ? `${ruleSource(template, "The repo's rules")} say the person who tested the change fills in the description, so the agent left it empty. Open it for what to write and tick, section by section.`
        : `The repo's ${template.check ? `"${template.check}"` : 'template'} check fails on the description. Edit it on the rules card, with the check's own words beside it.`,
      action: toNext(yours ? 'Fill in the description' : 'Fix the description'),
      secondary: null,
      at: timeOf(pr.pullRequest.openedAt),
    });
  }
  if (issues.some(({ kind }) => kind === 'CHANGELOG')) {
    list.push({
      kind: 'changelog',
      tone: 'amber',
      pill: 'Changelog rule',
      move: `${ruleSource(
        issues.find(({ kind }) => kind === 'CHANGELOG'),
        'The repo wants a changelog line for each pull request',
      )}, and this one is missing or off. Fix it in one click.`,
      action: toNext('Fix the changelog'),
      secondary: null,
      at: timeOf(pr.pullRequest.openedAt),
    });
  }

  // The proof's row: whenever the proof waits on the user or their agent (it outlives an "I've done it" on the block),
  // and a posted one while the block it answers stands. A block newer than that is the bot's own row.
  const blocked = first('BOT_BLOCKED');
  const stage = byHand ? null : proofStageOf(pr.proof, true, now);
  const proofRow =
    stage && (proofWaits(stage) || (blocked && proofTellsBlock(stage, pr.proof?.session, blocked.at)))
      ? proofCandidateOf(pr, stage, blocked ? botVerdictOf(blocked).by : null, toNext)
      : null;
  if (proofRow) list.push({ ...proofRow, at: timeOf(blocked?.at ?? pr.proof?.session?.stateAt) });
  if (blocked && !proofTellsBlock(stage, pr.proof?.session, blocked.at)) {
    const { by, verdict } = botVerdictOf(blocked);
    list.push({
      kind: 'bot',
      tone: 'amber',
      pill: 'Bot blocks merge',
      move: `${by ?? 'A review bot'} holds the merge until you do what it asks: "${clipped(verdict || 'Blocked before merge', 120)}" Read what it asks.`,
      action: toNext('See what it asks'),
      secondary: null,
      at: timeOf(blocked.at),
    });
  }

  const ended = first('RUN_ENDED');
  if (ended) {
    const round = ended.round ?? (pr.followUps?.used || null);
    const name = round ? `Run ${round}` : 'The last run';
    const outcome = runOutcomeOf(ended);
    const said = outcome === 'push_failed' ? pushDetailOf(ended.detail) : ended.detail?.trim();
    const detail = said ? clipped(said, 200) : null;
    list.push(
      outcome === 'push_failed'
        ? {
            kind: 'push-failed',
            tone: 'red',
            pill: round ? `Run ${round} not pushed` : 'Push failed',
            move: `${name}'s commits could not be pushed${detail ? `: ${sentence(detail)}` : '.'} Start run ${run} to make the change again on the pull request as it is now.`,
            action: toNext(`Try run ${run}`),
            secondary: null,
            at: timeOf(ended.at),
          }
        : outcome === 'stopped'
          ? {
              kind: 'run-stopped',
              tone: 'red',
              pill: round ? `Run ${round} stopped` : 'Run stopped',
              move: `${name} stopped${detail ? `: ${sentence(detail)}` : '.'} Start run ${run}, or handle it yourself.`,
              action: toNext(`Try run ${run}`),
              secondary: null,
              at: timeOf(ended.at),
            }
          : {
              kind: 'run-found',
              tone: 'amber',
              pill: 'Only you can do this',
              move: `${name} changed nothing: ${detail ? sentence(detail) : 'what is left is yours to do.'}`,
              action: toNext('See what to do'),
              secondary: null,
              at: timeOf(ended.at),
            },
    );
  }

  // A kind this UI does not know yet still says something: a run reads everything on the pull request.
  const unknown = signals.find(({ kind }) => !KNOWN_KINDS.has(kind));
  if (unknown) {
    list.push({
      kind: 'other',
      tone: 'amber',
      pill: 'Something changed',
      move: noRun
        ? 'Something changed on it. See what on GitHub.'
        : `Something changed on it. Start run ${run} to look at it, or see what on GitHub.`,
      action: noRun ? onGithub('Open the pull request') : toNext(`Start run ${run}`),
      secondary: null,
      at: timeOf(unknown.at),
    });
  }

  const dco = first('DCO');
  if (dco) {
    list.push({
      kind: 'dco',
      tone: 'red',
      pill: 'Sign-off missing',
      move: byHand
        ? 'The repo needs your Signed-off-by on every commit, and only you can certify it. See how to add it; the code stays the same.'
        : 'The repo needs your Signed-off-by on every commit, and only you can certify it. One click adds it; the code stays the same.',
      action: toNext(byHand ? 'See how to sign off' : 'Sign off and push'),
      secondary: null,
      at: timeOf(dco.at),
    });
  }

  // GitRanks' own: the repo left Contribute, or no one has answered the pull request for 30 days. Closing it or keeping
  // it open is the user's call; no run is offered.
  const out = first('REPO_OUT');
  if (out) {
    const reason = repoOutReasonOf(out.detail);
    list.push({
      kind: 'repo-out',
      tone: 'amber',
      pill: 'Repo out of Contribute',
      move: `${repoOutTextOf(reason)} ${
        reason === 'pr_misses'
          ? 'Close it on GitHub if you no longer want it, or click Keep it open.'
          : 'Close it on GitHub, or click Keep it open.'
      }`,
      action: toNext('See your options'),
      secondary: handled('Keep it open', ['REPO_OUT']),
      at: timeOf(out.at),
    });
  }
  const silent = first('SILENT');
  if (silent) {
    list.push({
      kind: 'silent',
      tone: 'amber',
      pill: 'No answer in 30 days',
      move: `${silentTextOf(silent.detail)} Click Keep it open to keep it, or close it yourself on GitHub.`,
      action: toNext('See your options'),
      secondary: handled('Keep it open', ['SILENT']),
      at: timeOf(silent.at),
    });
  }

  // A fix that failed takes the place of what it fixed, while that still waits: what went wrong, and what to do.
  const fix = pr.prFix;
  const fixed = fix ? FIXED_BY[fix.kind] : undefined;
  const at = fixed ? list.findIndex(({ kind }) => kind === fixed) : -1;
  if (fix?.state === 'FAILED' && at >= 0) {
    const note = fix.note?.trim() ? `: ${sentence(clipped(fix.note, 160))}` : '.';
    list[at] = {
      kind: 'fix-failed',
      tone: 'red',
      pill: 'A fix failed',
      move: `${PR_FIX_WORDS[fix.kind]} did not go through${note} ${
        fix.kind === 'SIGN_OFF'
          ? 'Try again, or sign off by hand: git rebase --signoff HEAD~N (N: the commits on the pull request), then git push --force-with-lease.'
          : 'Try again, or make the change on GitHub.'
      }`,
      action: toNext('See what happened'),
      secondary: null,
      at: timeOf(fix.at),
    };
  }
  return list;
}

/** The row each fix stands for: the sign-off's DCO, the retitle's title, the description's template, the changelog. */
export const FIXED_BY: Record<string, NeedsYouKind> = {
  SIGN_OFF: 'dco',
  TITLE: 'title',
  BODY: 'description',
  CHANGELOG: 'changelog',
  LINK: 'changelog',
};
