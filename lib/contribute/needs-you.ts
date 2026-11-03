import type { Route } from 'next';

import { githubUrlOf, isOwnAgent, type Tone } from './attempt-format';
import type {
  ContributeAttempt,
  ContributeContribution,
  ContributePrSignal,
  ContributePrSignalKind,
  ContributeReplyWaiting,
  ContributeView,
} from './contribute.types';
import { CONNECT_AGENT_PATH, CONNECT_KEY_PATH } from './contribute-path';
import { claudeKeyOf, contributeNoticesOf } from './contribute-state';
import { FOLLOW_UP_STEP_LABELS, FOLLOW_UP_STEPS, type FollowUpStep, shortSha } from './follow-up-flow';
import { PR_SIGNAL_KINDS } from './follow-up-format';
import { maskedKey, relativeLabel, timeLeftLabel } from './format';
import { httpsOnly, PR_FIX_WORDS } from './pr-conventions';
import { attemptPath, nextSessionPath } from './sessions';

/**
 * "Needs you" on Overview and My contributions (2026-11-03): one row per thing that waits for the user, each saying
 * what their move is and one button that leads to where they can make it. A run they started stays as a working row
 * (a live dot, not counted) until it comes back. Pure: both pages and their specs read the same rows.
 */

/** What a row is about, one per reason Needs you lists. */
export type NeedsYouKind =
  | 'key'
  | 'no-way'
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
  | 'agreement'
  | 'cla'
  | 'title'
  | 'description'
  | 'changelog'
  | 'bot'
  | 'run-found'
  | 'run-stopped'
  | 'push-failed'
  | 'dco'
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
 * are every signal on the pull request, so an API that does not take `kinds` yet clears the same.
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

export type NeedsYouItems = {
  /** Every row, in order: the counted ones, then the working ones. */
  items: NeedsYouItem[];
  /** The rows that need the user. */
  counted: number;
  /** The runs under way, shown and not counted. */
  working: number;
  /** Every read answered: only then may a page say nothing needs the user. */
  complete: boolean;
};

/** What Needs you reads; a read the API does not answer is `undefined`. */
export type NeedsYouRead = {
  /** The attempts in review or about to be submitted by autopilot, first attempts and follow-ups. */
  reviews: ContributeAttempt[] | undefined;
  /** The reply drafts the user can approve now (`DRAFT`, `FAILED`). */
  replies: ContributeReplyWaiting[] | undefined;
  /** The user's pull requests: the open ones are read. */
  contributions: ContributeContribution[] | undefined;
  /** The other attempts the page read: the runs in flight (My contributions: its whole list). */
  runs: ContributeAttempt[] | undefined;
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

/** The repo's agreement by its own name: a CLA, or a DCO signed like one. */
const agreementOf = (cla: { agreement?: string | null } | null | undefined) =>
  cla?.agreement === 'DCO' ? 'DCO' : 'CLA';

// ---------------------------------------------------------------------------------------------------------------------
// The rows

const DAY = 24 * 60 * 60 * 1000;

const KNOWN_KINDS = new Set<string>(PR_SIGNAL_KINDS);

/** A submission bounced for want of GitHub access: the first submit, before the grant, or after it was revoked. */
const GRANT_REASONS = new Set(['grant_missing', 'grant_revoked']);

/** The order of the groups: the setup, GitHub access, autopilot, the reviews, the replies, the pull requests. */
const GROUPS = { key: 0, 'no-way': 1, grant: 2, autopilot: 3, review: 4, replies: 5, pr: 6 } as const;

type Ranked = NeedsYouItem & { group: number; at: number };

/** When the review became ready: its seven days run from it. The last update stands in while it is not answered. */
const readySince = (attempt: ContributeAttempt) => timeOf(attempt.reviewAt ?? attempt.updatedAt);

const isGrantBounce = (view: ContributeView, attempt: ContributeAttempt) =>
  view.grant?.connected !== true &&
  attempt.state === 'REVIEW' &&
  GRANT_REASONS.has(attempt.submit?.lastError?.reason?.toLowerCase() ?? '');

const repoName = (nameWithOwner: string | null | undefined) => nameWithOwner || 'a repo';

/** The run's number: its round, else the runs the pull request counts. */
const runNumberOf = (run: Pick<ContributeAttempt, 'round'> | undefined, pr: ContributeContribution | undefined) =>
  run?.round?.round ?? (pr?.followUps?.used ? pr.followUps.used : null);

/** The next run's number: one past the runs so far. */
const nextRunOf = (pr: ContributeContribution) =>
  Math.max(pr.followUps?.used ?? 0, pr.followUps?.history?.length ?? 0) + 1;

/** "Run 2 fixed 3 comments and drafted 2 replies. Approve to push and post.", or what its checks say. */
function runReadyMoveOf(
  run: Pick<ContributeAttempt, 'checkStatus' | 'round'>,
  round: number | null,
  drafts: number,
): string {
  const name = round ? `Run ${round}` : 'The run';
  const status = run.checkStatus?.status;
  if (status === 'FAILED' || status === 'NOT_RUN') return `${name}'s tests did not pass: push anyway or discard it.`;
  if (status === 'BLOCKED') {
    return `Our checks block ${round ? `run ${round}` : 'the run'}'s push: discard it and start ${round ? `run ${round + 1}` : 'another'} with a note.`;
  }
  const fixed = run.round?.fixed ?? 0;
  const did = [
    fixed ? `fixed ${plural(fixed, 'comment')}` : null,
    drafts ? `drafted ${plural(drafts, 'reply', 'replies')}` : null,
  ]
    .filter(Boolean)
    .join(' and ');
  const approve = !drafts
    ? 'Approve to push it.'
    : run.round && !fixed && !run.round.skipped
      ? 'Approve to post.'
      : 'Approve to push and post.';
  return did ? `${name} ${did}. ${approve}` : `${name} is ready. ${approve}`;
}

/** The rows of the attempts that wait for the user: the reviews and autopilot's countdowns. */
function reviewRowsOf(
  view: ContributeView,
  reviews: ContributeAttempt[],
  folded: Map<string, number>,
  prs: Map<string, ContributeContribution>,
  now: Date,
): Ranked[] {
  return reviews.map((attempt): Ranked => {
    const href = attemptPath(attempt.attemptId);
    // A run's pull request, when its read answers it.
    const of = attempt.kind === 'FOLLOW_UP' ? attempt.followUpOf : null;
    const pr = of ? prs.get(of.prId) : undefined;
    const where = of
      ? `${repoName(attempt.nameWithOwner)} · PR #${of.number}`
      : `${repoName(attempt.nameWithOwner)} · issue #${attempt.number}`;
    const title = pr?.title?.trim() || attempt.title?.trim() || `Issue #${attempt.number}`;
    const base = { key: attempt.attemptId, where, title, more: 0, secondary: null, working: false };
    const left = shortLeftOf(attempt.autosubmitAt, now);
    const when = relativeLabel(attempt.autosubmitAt, now);

    if (isGrantBounce(view, attempt)) {
      return {
        ...base,
        kind: 'grant',
        tone: 'amber',
        pill: 'GitHub access',
        move: 'Allow GitHub access so the pull request opens under your account.',
        action: { label: 'Allow GitHub access', href, aria: `Allow GitHub access for ${where}` },
        group: GROUPS.grant,
        at: readySince(attempt),
      };
    }
    if (attempt.kind === 'FOLLOW_UP') {
      const round = runNumberOf(attempt, pr);
      const run = round ? `run ${round}` : 'the run';
      if (attempt.state === 'PENDING_AUTOSUBMIT') {
        return {
          ...base,
          kind: 'run-autopilot',
          tone: 'amber',
          pill: left ? `Autopilot · ${left}` : 'Autopilot',
          move: when
            ? `Autopilot pushes ${run} ${when}. Check it, or stop it.`
            : `Autopilot pushes ${run} soon. Check it, or stop it.`,
          action: { label: 'Check before it pushes', href, aria: `Check ${run} on ${where} before it pushes` },
          group: GROUPS.autopilot,
          at: timeOf(attempt.autosubmitAt),
        };
      }
      return {
        ...base,
        kind: 'run-ready',
        tone: 'violet',
        pill: round ? `Run ${round} ready` : 'Run ready',
        move: runReadyMoveOf(attempt, round, folded.get(attempt.attemptId) ?? attempt.round?.drafted ?? 0),
        action: { label: `Review ${run}`, href, aria: `Review ${run} on ${where}` },
        group: GROUPS.review,
        at: readySince(attempt),
      };
    }
    if (attempt.state === 'PENDING_AUTOSUBMIT') {
      return {
        ...base,
        kind: 'autopilot',
        tone: 'amber',
        pill: left ? `Autopilot · ${left}` : 'Autopilot',
        move: when
          ? `Autopilot opens this pull request ${when}. Check it, or stop it.`
          : 'Autopilot emails you first, then opens this pull request an hour later. Check it, or stop it.',
        action: { label: 'Check before it submits', href, aria: `Check ${where} before it submits` },
        group: GROUPS.autopilot,
        at: timeOf(attempt.autosubmitAt),
      };
    }
    if (isOwnAgent(attempt)) {
      return {
        ...base,
        kind: 'own-review',
        tone: 'violet',
        pill: 'Ready for review',
        move: 'Your agent made this. Approve it or send it back with a note.',
        action: { label: 'Review the change', href, aria: `Review the change on ${where}` },
        group: GROUPS.review,
        at: readySince(attempt),
      };
    }
    const daysLeft = Number.isFinite(readySince(attempt))
      ? Math.ceil((readySince(attempt) + 7 * DAY - now.getTime()) / DAY)
      : null;
    return {
      ...base,
      kind: 'review',
      tone: 'violet',
      pill: 'Ready for review',
      move: `Check the change, then open the pull request or discard it. ${
        daysLeft !== null && daysLeft >= 1 && daysLeft < 7
          ? `It waits ${plural(daysLeft, 'more day')}.`
          : 'It waits 7 days.'
      }`,
      action: { label: 'Review the change', href, aria: `Review the change on ${where}` },
      group: GROUPS.review,
      at: readySince(attempt),
    };
  });
}

/** One reason waiting on an open pull request, before the first of them is chosen to lead its row. */
type Candidate = Pick<NeedsYouItem, 'kind' | 'tone' | 'pill' | 'move' | 'action' | 'secondary'> & { at: number };

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

/** The reasons on an open pull request, in Needs you's order: what a run can do first, then the user's own. */
function candidatesOf({ pr, drafts, runs }: PrContext): Candidate[] {
  const signals = pr.needsYou?.signals ?? [];
  const first = (kind: ContributePrSignalKind) => signals.find((signal) => signal.kind === kind);
  const number = pr.pullRequest.number;
  const prUrl = githubUrlOf(pr.pullRequest.url);
  const next = nextSessionPath(pr.attemptId);
  const run = nextRunOf(pr);
  // A pull request the user opened by hand takes no run: what a run would do is theirs, on GitHub.
  const byHand = pr.openedBy === 'HAND';
  const all = new Set(signals.map(({ kind }) => kind));
  const handled = (label: string, kinds: ContributePrSignalKind[]): NeedsYouSecondary => ({
    label,
    handled: {
      prId: pr.pullRequest.prId,
      prNumber: number,
      kinds,
      all: kinds.length === all.size && kinds.every((kind) => all.has(kind)),
    },
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
      move: byHand
        ? 'A reviewer asked for changes. Make them on GitHub: no run adds to a pull request you opened yourself.'
        : `A reviewer asked for changes. Start run ${run} on them.`,
      action: byHand ? onGithub('Open the pull request') : toNext(`Start run ${run}`),
      secondary: byHand ? handled("I've done it", ['CHANGES_REQUESTED']) : null,
      at: timeOf(changes.at),
    });
  }
  const comment = first('COMMENT');
  if (comment) {
    list.push({
      kind: 'comment',
      tone: 'amber',
      pill: 'New comment',
      move: byHand
        ? 'Someone commented on it. Reply on GitHub.'
        : `Someone commented on it. Let run ${run} answer, or reply on GitHub.`,
      action: byHand ? onGithub('Reply on GitHub') : toNext(`Answer with run ${run}`),
      secondary: byHand ? handled("I've replied", ['COMMENT']) : null,
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
      move: byHand
        ? `${names} ${fails} on your pull request. Fix it on your branch.`
        : `${names} ${fails} on your pull request. Start run ${run} to fix it.`,
      action: byHand ? onGithub('Open the pull request') : toNext(`Fix with run ${run}`),
      secondary: byHand ? handled("I've fixed it", ['CHECK_FAILED']) : null,
      at: timeOf(check.at),
    });
  }

  const waiting = drafts.filter(({ state }) => state === 'DRAFT');
  if (waiting.length) {
    const by = runs.find(({ attemptId }) => attemptId === waiting[0].attemptId)?.round?.round;
    list.push({
      kind: 'replies',
      tone: 'amber',
      pill: 'Replies to approve',
      move: `${by ? `Run ${by}` : 'A run'} drafted ${plural(waiting.length, 'reply', 'replies')} to ${draftsTo(waiting)}. Read and post them.`,
      action: {
        label: waiting.length === 1 ? 'Approve the reply' : 'Approve replies',
        href: attemptPath(waiting[0].attemptId),
        aria: `Approve the replies on PR #${number}`,
      },
      secondary: null,
      at: Math.min(...waiting.map(({ createdAt }) => timeOf(createdAt))),
    });
  }
  const failed = drafts.find(({ state }) => state === 'FAILED');
  if (failed) {
    list.push({
      kind: 'reply-failed',
      tone: 'red',
      pill: 'Reply not posted',
      move: 'GitHub refused the reply. Try again, or post it yourself.',
      action: {
        label: 'Retry the reply',
        href: attemptPath(failed.attemptId),
        aria: `Retry the reply on PR #${number}`,
      },
      secondary: null,
      at: timeOf(failed.updatedAt),
    });
  }

  const cla = first('CLA');
  if (cla) {
    const conventions = pr.conventions?.cla;
    const agreement = agreementOf(conventions);
    const signComment = conventions?.signComment?.trim();
    const signUrl = httpsOnly(conventions?.signUrl);
    list.push(
      signComment
        ? {
            kind: 'agreement',
            tone: 'amber',
            pill: 'Agreement to sign',
            move: `Post this comment on PR #${number}, word for word: "${clipped(signComment, 300)}"`,
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
            move: `Sign the repo's ${agreement}; this clears once its check passes.`,
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
      move: titleIssue
        ? "The title breaks the repo's rule. Fix it in one click."
        : "The title breaks the repo's rule. Retitle the pull request.",
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
        ? 'The repo wants you, not the agent, to fill in the description. Open it for what to write and tick.'
        : "The description fails the repo's template check. Edit it on the rules card.",
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
      move: 'The changelog line is missing or off. Fix it in one click.',
      action: toNext('Fix the changelog'),
      secondary: null,
      at: timeOf(pr.pullRequest.openedAt),
    });
  }

  const blocked = first('BOT_BLOCKED');
  if (blocked) {
    const { by, verdict } = botVerdictOf(blocked);
    list.push({
      kind: 'bot',
      tone: 'amber',
      pill: 'Bot blocks merge',
      move: `${by ?? 'A review bot'}: "${clipped(verdict || 'Blocked before merge', 120)}" Read what it asks.`,
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
      move: byHand
        ? 'Something changed on it. See what on GitHub.'
        : `Something changed on it. Start run ${run} to look at it, or see what on GitHub.`,
      action: byHand ? onGithub('Open the pull request') : toNext(`Start run ${run}`),
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
      move: 'The repo wants a Signed-off-by on every commit. Add yours; the code stays the same.',
      action: toNext(byHand ? 'See how to sign off' : 'Sign off and push'),
      secondary: null,
      at: timeOf(dco.at),
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
          ? 'Try again, or sign off by hand: git rebase --signoff, then a force-push.'
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
const FIXED_BY: Record<string, NeedsYouKind> = {
  SIGN_OFF: 'dco',
  TITLE: 'title',
  BODY: 'description',
  CHANGELOG: 'changelog',
  LINK: 'changelog',
};

/**
 * An open pull request's row: its run under way (a working row), the sign-off on its way, a push not read back yet,
 * else its first reason with "and N more"; null when nothing waits on it.
 */
export function prItemOf(context: PrContext): NeedsYouItem | null {
  const { pr, runs, now } = context;
  if (pr.pullRequest.state !== 'OPEN') return null;
  const number = pr.pullRequest.number;
  const base = {
    key: pr.attemptId,
    where: `${repoName(pr.nameWithOwner)} · PR #${number}`,
    title: pr.title?.trim() || `Fix for issue #${pr.issueNumber}`,
    more: 0,
    secondary: null,
  };
  const working = (item: Pick<NeedsYouItem, 'kind' | 'pill' | 'move' | 'action'>): NeedsYouItem => ({
    ...base,
    ...item,
    tone: 'violet',
    working: true,
  });

  const current = pr.followUps?.currentAttemptId;
  if (current) {
    const run = runs.find(({ attemptId }) => attemptId === current);
    const listed = pr.followUps?.history?.find(({ attemptId }) => attemptId === current);
    const round = runNumberOf(run, pr) ?? listed?.round ?? 1;
    const state = run?.state ?? listed?.state;
    // Back for the user's review (the lists show it as its review's row): what it did, and the way to review it.
    if (state === 'REVIEW' || state === 'PENDING_AUTOSUBMIT') {
      const review = {
        label: `Review run ${round}`,
        href: attemptPath(current),
        aria: `Review run ${round} on PR #${number}`,
      };
      return {
        ...base,
        kind: state === 'REVIEW' ? 'run-ready' : 'run-autopilot',
        tone: state === 'REVIEW' ? 'violet' : 'amber',
        pill: state === 'REVIEW' ? `Run ${round} ready` : 'Autopilot',
        move:
          state === 'REVIEW'
            ? runReadyMoveOf(run ?? { round: listed }, round, run?.round?.drafted ?? 0)
            : `Autopilot pushes run ${round} soon. Check it, or stop it.`,
        action: review,
        working: false,
      };
    }
    const watch = {
      label: `Watch run ${round}`,
      href: attemptPath(current),
      aria: `Watch run ${round} on PR #${number}`,
    };
    if (run ? isOwnAgent(run) : pr.runner === 'MCP') {
      const left = timeLeftLabel(run?.leaseUntil, now);
      return working({
        kind: 'own-working',
        pill: `Run ${round} with your agent`,
        move: left ? `Your agent holds it for another ${left}.` : 'Your agent is on it.',
        action: watch,
      });
    }
    const started = run ? relativeLabel(run.createdAt, now) : '';
    return working({
      kind: 'working',
      pill: `Run ${round} working`,
      move:
        state === 'SUBMITTING'
          ? 'Pushing the commits you approved.'
          : run
            ? `${runStepOf(run)}${started ? ` · started ${started}` : ''}. It comes back here when it is ready.`
            : // Not among the runs read (queued, or past the read): under way is all that is known.
              'Under way. It comes back here when it is ready.',
      action: watch,
    });
  }

  if (pr.prFix?.kind === 'SIGN_OFF' && pr.prFix.state === 'SENDING') {
    return working({
      kind: 'signing-off',
      pill: 'Signing off',
      move: 'Rewriting the commits with your sign-off.',
      action: null,
    });
  }

  const signals = pr.needsYou?.signals ?? [];
  const lastEnded = pr.followUps?.lastEndedAt;
  const latest = latestRunOf(pr, runs);
  if (
    lastEnded &&
    timeOf(pr.pullRequest.syncedAt) < timeOf(lastEnded) &&
    !signals.some(({ kind }) => kind === 'RUN_ENDED') &&
    (!latest || latest.state === 'DONE')
  ) {
    const round = latest?.round?.round ?? (pr.followUps?.used || null);
    const sha = shortSha(latest?.round?.pushedSha ?? pr.followUps?.history?.at(-1)?.pushedSha);
    const name = round ? `run ${round}` : 'the run';
    return working({
      kind: 'pushed',
      pill: round ? `Run ${round} pushed` : 'Run pushed',
      move: `Pushed${sha ? ` ${sha}` : ''} · reading the pull request again.`,
      action: latest
        ? { label: `Watch ${name}`, href: attemptPath(latest.attemptId), aria: `Watch ${name} on PR #${number}` }
        : { label: 'See the pull request', href: attemptPath(pr.attemptId), aria: `See PR #${number}` },
    });
  }

  const candidates = candidatesOf(context);
  if (!candidates.length) return null;
  const [lead, ...rest] = candidates;
  return { ...base, ...lead, more: rest.length, working: false };
}

/** The pull request's latest follow-up among the attempts read. */
const latestRunOf = (pr: ContributeContribution, runs: ContributeAttempt[]): ContributeAttempt | undefined =>
  runs
    .filter((run) => run.kind === 'FOLLOW_UP' && run.followUpOf?.prId === pr.pullRequest.prId)
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt))[0];

/**
 * Needs you's rows, in order: the key, not set up, GitHub access, autopilot (soonest first), the reviews (oldest ready
 * first), the replies, the pull requests (oldest wait first), the runs under way last. One row per pull request: its
 * follow-up in review alone when there is one (its drafts folded into it).
 */
export function needsYouItemsOf({
  view,
  reviews,
  replies,
  contributions,
  runs,
  now = new Date(),
}: NeedsYouRead & { view: ContributeView; now?: Date }): NeedsYouItems {
  const rows: Ranked[] = [];
  const notices = contributeNoticesOf(view);
  const key = claudeKeyOf(view);
  if (key && notices.some(({ kind }) => kind === 'key-invalid')) {
    rows.push({
      key: 'key',
      kind: 'key',
      tone: 'red',
      pill: 'Key refused',
      where: `Claude key ${maskedKey(key.last4)}`,
      title: null,
      move: 'Connect a working key; nothing starts until you do.',
      more: 0,
      action: { label: 'Connect a new key', href: CONNECT_KEY_PATH, aria: 'Connect a new Claude key' },
      secondary: null,
      working: false,
      group: GROUPS.key,
      at: 0,
    });
  }
  // Without a key, whether the user's own agent is set up is the own-agent read's: unread, it is not "not set up".
  const ownAgentRead = !!key || view.ownAgent !== undefined;
  if (ownAgentRead && notices.some(({ kind }) => kind === 'no-key')) {
    rows.push({
      key: 'no-way',
      kind: 'no-way',
      tone: 'neutral',
      pill: 'Not set up',
      where: null,
      title: null,
      move: 'Add your Claude key or connect your own agent.',
      more: 0,
      action: { label: 'Add your Claude key', href: CONNECT_KEY_PATH, aria: 'Add your Claude key' },
      secondary: { label: 'Connect your own agent', href: CONNECT_AGENT_PATH },
      working: false,
      group: GROUPS['no-way'],
      at: 0,
    });
  }

  const open = (contributions ?? []).filter(({ pullRequest }) => pullRequest.state === 'OPEN');
  const prs = new Map(open.map((pr) => [pr.pullRequest.prId, pr]));
  const folded = new Map<string, number>();
  const draftsByPr = new Map<string, ContributeReplyWaiting[]>();
  for (const draft of replies ?? []) {
    if (draft.inReview) folded.set(draft.attemptId, (folded.get(draft.attemptId) ?? 0) + 1);
    else draftsByPr.set(draft.prId, [...(draftsByPr.get(draft.prId) ?? []), draft]);
  }

  const waiting = reviews ?? [];
  rows.push(...reviewRowsOf(view, waiting, folded, prs, now));
  // A pull request whose follow-up waits in review shows that row alone.
  const inReview = new Set(waiting.flatMap((attempt) => (attempt.followUpOf ? [attempt.followUpOf.prId] : [])));
  const read = [...waiting, ...(runs ?? [])];

  for (const pr of open) {
    if (inReview.has(pr.pullRequest.prId)) continue;
    const drafts = draftsByPr.get(pr.pullRequest.prId) ?? [];
    const item = prItemOf({ pr, drafts, runs: read, now });
    if (!item) continue;
    const replying = item.kind === 'replies' || item.kind === 'reply-failed';
    rows.push({
      ...item,
      group: replying ? GROUPS.replies : GROUPS.pr,
      // A row's wait: its oldest draft, else since the pull request first needed the user (or its fix, or its open).
      at: replying
        ? Math.min(...drafts.map(({ createdAt }) => timeOf(createdAt)))
        : Math.min(timeOf(pr.needsYou?.since), timeOf(pr.prFix?.at), timeOf(pr.pullRequest.openedAt)),
    });
  }
  // Drafts on a pull request this read does not list (the list unread): a row of their own, by the run that drafted them.
  for (const [prId, drafts] of draftsByPr) {
    if (prs.has(prId) || inReview.has(prId)) continue;
    const waitingDrafts = drafts.filter(({ state }) => state === 'DRAFT');
    const shown = waitingDrafts.length ? waitingDrafts : drafts;
    const failed = !waitingDrafts.length;
    const where = `${repoName(shown[0].nameWithOwner)} · PR #${shown[0].prNumber}`;
    rows.push({
      key: `replies-${prId}`,
      kind: failed ? 'reply-failed' : 'replies',
      tone: failed ? 'red' : 'amber',
      pill: failed ? 'Reply not posted' : 'Replies to approve',
      where,
      title: null,
      move: failed
        ? 'GitHub refused the reply. Try again, or post it yourself.'
        : `A run drafted ${plural(shown.length, 'reply', 'replies')} to ${draftsTo(shown)}. Read and post them.`,
      more: 0,
      action: {
        label: failed ? 'Retry the reply' : shown.length === 1 ? 'Approve the reply' : 'Approve replies',
        href: attemptPath(shown[0].attemptId),
        aria: `${failed ? 'Retry the reply' : 'Approve the replies'} on ${where}`,
      },
      secondary: null,
      working: false,
      group: GROUPS.replies,
      at: Math.min(...shown.map(({ createdAt }) => timeOf(createdAt))),
    });
  }

  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        Number(a.row.working) - Number(b.row.working) ||
        a.row.group - b.row.group ||
        a.row.at - b.row.at ||
        a.index - b.index,
    )
    .map(({ row: { group: _group, at: _at, ...item } }) => item);
  const counted = ordered.filter(({ working }) => !working).length;
  return {
    items: ordered,
    counted,
    working: ordered.length - counted,
    complete: reviews !== undefined && replies !== undefined && contributions !== undefined && ownAgentRead,
  };
}

/** The rows a section shows: the first `max` that need the user, then every run under way. */
export const shownItemsOf = (items: NeedsYouItem[], max: number): NeedsYouItem[] => [
  ...items.filter(({ working }) => !working).slice(0, max),
  ...items.filter(({ working }) => working),
];
