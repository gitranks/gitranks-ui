import type { Route } from 'next';

import {
  ATTEMPT_STATES,
  checkLimitOf,
  claimRefusedOf,
  detailText,
  endMoveOf,
  endReasonLabelOf,
  endReasonTextOf,
  githubUrlOf,
  isOwnAgent,
  limitNoteOf,
  noGoReasonOf,
  ranOutCapOf,
  type Tone,
  timeLabel,
  toneLabelOf,
} from './attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeAttemptPullRequest,
  ContributeFollowUpRound,
  ContributeSubmitError,
} from './contribute.types';
import { shownByDecisions } from './decisions';
import { followUpStepOf, roundTalliesOf, shortSha } from './follow-up-flow';
import { relativeLabel, timeLeftLabel, usd } from './format';
import { clipped } from './needs-you';

/**
 * Where a session stands, in one line (M3), when nothing waits on it: a lead (a live dot, a pill or a check), a title,
 * one fact, at most one link, and the rest behind Details. And the words a submit that came back for approval says,
 * reason by reason. Pure: the status line, the move cards and their specs read the same.
 */

export type StatusLead = { kind: 'dot' } | { kind: 'pill'; label: string; tone: Tone } | { kind: 'check' } | null;
export type StatusLink = { href: string; label: string; external: boolean };

export type SessionStatus = {
  /** `data-status`: the state, or what the line says when the state alone does not tell. */
  name: string;
  lead: StatusLead;
  title: string;
  fact: string | null;
  link: StatusLink | null;
  /** Behind Details, one sentence each. */
  details: string[];
  /** The live states' progress: Reading · Fixing · Checks · Ready, or the push's steps. */
  bar: { label: string; state: 'done' | 'current' | 'retrying' | 'failed' | 'skipped' | 'pending' }[] | null;
  /** It moves while the page is open: `role="status"`. */
  live: boolean;
};

const line = (status: Partial<SessionStatus> & Pick<SessionStatus, 'name' | 'title'>): SessionStatus => ({
  lead: null,
  fact: null,
  link: null,
  details: [],
  bar: null,
  live: false,
  ...status,
});

const pill = (label: string, tone: Tone): StatusLead => ({ kind: 'pill', label, tone });

/** A pull request opened in the last few minutes: its line still shows the steps that opened it. */
const JUST_OPENED_MS = 10 * 60_000;
export const justOpened = (pullRequest: ContributeAttemptPullRequest | null | undefined, now?: Date) => {
  const opened = pullRequest ? Date.parse(pullRequest.openedAt) : Number.NaN;
  return !Number.isNaN(opened) && (now ?? new Date()).getTime() - opened < JUST_OPENED_MS;
};

/** "4 min", "1 h 5 min": how long since `iso`. */
function sinceOf(iso: string | null | undefined, now: Date): string | null {
  const at = iso ? Date.parse(iso) : Number.NaN;
  if (!Number.isFinite(at)) return null;
  const minutes = Math.max(1, Math.round((now.getTime() - at) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "ran out of the $0.60 check budget": a check that reached its cap with no verdict, as its stop reason. */
function ranOutReasonOf(attempt: Pick<ContributeAttemptDetail, 'endReason' | 'endDetail' | 'checkLimit'>) {
  const limit = checkLimitOf(attempt);
  if (!limit || limit.decided) return null;
  const { amount } = ranOutCapOf(attempt.endDetail);
  if (limit.limit === 'time') {
    return amount ? `ran out of the ${amount} check limit` : "ran out of the check's time limit";
  }
  return amount ? `ran out of the ${amount} check budget` : 'ran out of the check budget';
}

/** The user's own limits a check refused the change for. */
const OVER_LIMITS = new Set(['max_changed_lines', 'max_files']);

/** Why a session stopped, short, after "Stopped: ". Null when the reason is not known ("Stopped" alone). */
export function stopReasonOf(
  attempt: Pick<ContributeAttemptDetail, 'kind' | 'endReason' | 'endDetail' | 'checkLimit' | 'budgetUsd'>,
): string | null {
  const ranOut = ranOutReasonOf(attempt);
  if (ranOut) return ranOut;
  const detail = String(attempt.endDetail ?? '')
    .trim()
    .toLowerCase();
  switch (attempt.endReason) {
    case 'NO_GO':
      return 'the agent said no-go';
    case 'BUDGET':
      return `reached your ${usd(attempt.budgetUsd)} limit per run`;
    case 'TIMEOUT':
      return 'reached the two-hour limit';
    case 'FAILED':
      return 'the agent session failed';
    case 'CHECKS_FAILED':
      if (detail === 'not_empty' && attempt.kind === 'FOLLOW_UP') return 'the agent wrote no commit and no reply';
      return OVER_LIMITS.has(detail) ? 'it changed more than your limits allow' : 'our checks stopped it';
    case 'KEY_INVALID':
      return 'Anthropic refused your Claude key';
    case 'EXHAUSTED':
      return 'your credits ran out';
    case 'LIMIT_REACHED':
      return "your workspace's spend limit was reached";
    case 'CANCELLED':
      return 'it was cancelled';
    case 'CLAIM_LOST':
      return 'someone else took the issue first';
    case 'RELEASED':
      return 'your agent gave the issue back';
    case 'MCP_IDLE':
      return 'your agent went quiet';
    case 'MCP_EXPIRED':
      return 'the seven-day hold ran out';
    case 'SUBMIT_FAILED':
      return attempt.kind === 'FOLLOW_UP' ? 'the push did not go through' : 'the pull request could not be opened';
    case 'USER':
      return 'you discarded it';
    case 'REVIEW_EXPIRED':
      return 'it waited too long for a review';
    default:
      return null;
  }
}

/** "Run 2", or "The run" while its number is not known. */
export const runNameOf = (round: number | null) => (round ? `Run ${round}` : 'The run');

/** The run's step while it works, in the status line's words. */
const RUN_DOING = { reading: 'is reading the comments', fixing: 'is fixing', checks: 'is running checks' } as const;
const RUN_BAR = ['Reading', 'Fixing', 'Checks', 'Ready'] as const;

/** The run's four steps as a bar, the one it is on lit. */
function runBarOf(run: Pick<ContributeAttemptDetail, 'state' | 'events'>): SessionStatus['bar'] {
  const step = followUpStepOf(run);
  const at = step ? ['reading', 'fixing', 'checks', 'ready'].indexOf(step) : -1;
  return RUN_BAR.map((label, index) => ({
    label,
    state: index < at ? 'done' : index === at ? 'current' : 'pending',
  }));
}

/** The stop's Details: why, the no-go's own reason, the note on the check's cap, and what the user does next. */
function stopDetailsOf(attempt: ContributeAttemptDetail): string[] {
  const shown = shownByDecisions(attempt);
  const limit = checkLimitOf(attempt);
  const move = endMoveOf(attempt);
  const detail = shown.noGoDetail || !attempt.endDetail || attempt.endDetail === 'not_empty' ? null : attempt.endDetail;
  const ranOut = !!limit && !limit.decided;
  return [
    endReasonTextOf(attempt) ?? 'Why it stopped is not available yet.',
    detail
      ? ranOut
        ? detailText(detail)
        : `${attempt.endReason === 'NO_GO' ? 'Its reason: ' : 'Detail: '}${detailText(noGoReasonOf(detail))}`
      : null,
    limit?.decided && !shown.limitNote ? limitNoteOf(limit) : null,
    move && !move.href ? move.text : null,
  ].filter((part): part is string => !!part);
}

/** A stopped session's line: its reason short, what it spent, the end move's link. */
function stoppedOf(attempt: ContributeAttemptDetail): SessionStatus {
  const run = attempt.kind === 'FOLLOW_UP';
  if (attempt.endReason === 'SUBMIT_FAILED') {
    return line({
      name: 'SUBMIT_FAILED',
      lead: pill('Failed', 'red'),
      title: run ? 'Stopped: the push did not go through' : 'Stopped: the pull request could not be opened',
      fact: `${usd(attempt.costUsd)} spent`,
      details: attempt.submit?.lastError?.note ? [attempt.submit.lastError.note] : [],
    });
  }
  const reason = stopReasonOf(attempt);
  const move = endMoveOf(attempt);
  const ranOut = !!checkLimitOf(attempt) && !checkLimitOf(attempt)?.decided;
  return line({
    name: 'STOPPED',
    lead: pill('Stopped', 'neutral'),
    title: reason ? `Stopped: ${reason}` : 'Stopped',
    fact: `${usd(attempt.costUsd)} spent; ${
      run
        ? 'nothing was pushed or posted'
        : ranOut
          ? 'nothing was decided, and the issue went back to the pool'
          : 'the issue went back to the pool'
    }`,
    link: move?.href && move.link ? { href: move.href, label: `${move.link} →`, external: false } : null,
    details: [...stopDetailsOf(attempt), ...(move?.href ? [move.text] : [])],
  });
}

/** A first attempt's line, when nothing waits on it (no move held by it). `elsewhere`: a move another session holds. */
export function firstStatusOf(
  first: ContributeAttemptDetail,
  {
    now,
    current,
    runNumber,
    elsewhere,
  }: {
    now: Date;
    /** The run under way, read beside it. */
    current?: ContributeAttemptDetail;
    /** The run under way's number. */
    runNumber?: number | null;
    /** A move waits on another session: the line points at it. */
    elsewhere?: boolean;
  },
): SessionStatus {
  const own = isOwnAgent(first);
  const pr = first.pullRequest;
  switch (first.state) {
    case 'QUEUED':
      return line({
        name: 'QUEUED',
        lead: pill('Queued', 'neutral'),
        title: 'Queued',
        fact: 'starts when your limits allow',
      });
    case 'CLAIMING':
      return line({
        name: 'CLAIMING',
        lead: pill('Starting', 'violet'),
        title: 'Checking the issue is still free',
        live: true,
      });
    case 'RUNNING':
      if (own) return ownAgentOf(first, now);
      return line({
        name: 'RUNNING',
        lead: { kind: 'dot' },
        title: 'The agent is working on it',
        fact: [
          relativeLabel(first.createdAt, now) ? `started ${relativeLabel(first.createdAt, now)}` : null,
          `${usd(first.costUsd)} of ${usd(first.budgetUsd)}`,
        ]
          .filter(Boolean)
          .join(' · '),
        live: true,
      });
    case 'CHECKS': {
      const at = [...first.events].reverse().find((event) => event.state === 'CHECKS')?.at ?? first.updatedAt;
      return line({
        name: 'CHECKS',
        lead: { kind: 'dot' },
        title: 'Running our checks',
        fact: relativeLabel(at, now) ? `started ${relativeLabel(at, now)}` : null,
        live: true,
      });
    }
    case 'SUBMITTING':
      if (first.submit?.step === 'WAITING_CAP') {
        return line({
          name: 'WAITING_CAP',
          lead: pill('Submitting', 'violet'),
          title: "Waiting for tomorrow's pull request slot",
          fact: first.submit.waitUntil
            ? `opens at ${timeLabel(first.submit.waitUntil)}`
            : 'opens when the next UTC day starts',
          details: ['Your pull requests for today are all open. This one goes out by itself: nothing to do.'],
        });
      }
      return line({ name: 'SUBMITTING', lead: { kind: 'dot' }, title: 'Opening your pull request', live: true });
    case 'PR_OPEN':
    case 'FOLLOW_UP': {
      const runId = first.followUps?.currentAttemptId;
      if (runId) {
        const run = current?.attemptId === runId ? current : undefined;
        const step = run ? followUpStepOf(run) : null;
        const doing =
          run?.state === 'SUBMITTING'
            ? 'is pushing'
            : step && step !== 'ready'
              ? RUN_DOING[step]
              : run?.state === 'QUEUED' || run?.state === 'CLAIMING'
                ? 'is starting'
                : 'is under way';
        return line({
          name: 'RUN_UNDER_WAY',
          lead: { kind: 'dot' },
          title: `${runNameOf(runNumber ?? null)} ${doing}`,
          fact: run ? [sinceOf(run.createdAt, now), usd(run.costUsd)].filter(Boolean).join(' · ') : null,
          link: {
            href: `/contribute/attempts/${encodeURIComponent(first.attemptId)}/runs/${encodeURIComponent(runId)}`,
            label: `Watch ${runNumber ? `run ${runNumber}` : 'the run'} →`,
            external: false,
          },
          live: true,
        });
      }
      if (elsewhere) return line({ name: 'PR_OPEN', title: 'Your pull request is open' });
      if (justOpened(pr, now))
        return line({ name: 'PR_OPENED', lead: { kind: 'check' }, title: 'Your pull request is open' });
      if (pr?.reviewDecision === 'APPROVED')
        return line({ name: 'PR_APPROVED', title: 'Approved, waiting for a merge' });
      return line({
        name: 'PR_OPEN',
        title: 'Waiting for the maintainers',
        fact: 'GitRanks keeps reading the PR and brings you back when something needs you.',
      });
    }
    case 'MERGED':
      return line({
        name: 'MERGED',
        lead: { kind: 'check' },
        title: 'Merged',
        fact: 'counts toward your contribution stars',
      });
    case 'CLOSED': {
      const url = githubUrlOf(pr?.url);
      return line({
        name: 'CLOSED',
        title: 'Closed without merging',
        link: url ? { href: url, label: 'See why on GitHub ↗', external: true } : null,
      });
    }
    case 'STOPPED':
      return stoppedOf(first);
    case 'DISCARDED': {
      const refused = claimRefusedOf(first);
      return line({
        name: 'DISCARDED',
        lead: pill('Discarded', 'neutral'),
        title: 'Discarded',
        fact: `${endReasonLabelOf(first) ?? 'It was discarded.'} ${
          refused ? 'Nothing was submitted.' : 'The issue went back to the pool, and nothing was submitted.'
        }`,
        details: refused ? [refused.why, refused.move.text] : [],
      });
    }
    default:
      return unknownOf(first);
  }
}

/** The user's own agent holds the issue: for how much longer. */
function ownAgentOf(attempt: ContributeAttemptDetail, now: Date): SessionStatus {
  const left = timeLeftLabel(attempt.leaseUntil, now);
  return line({
    name: 'OWN_AGENT',
    lead: pill('Your agent', 'violet'),
    title: 'Your agent holds it',
    fact: left ? `for another ${left}` : 'it is on it',
  });
}

/** A state this UI does not know yet: its name, and nothing it cannot back up. */
const unknownOf = (attempt: ContributeAttemptDetail) => {
  const label = toneLabelOf(ATTEMPT_STATES, attempt.state).label;
  return line({
    name: String(attempt.state),
    lead: pill(label, 'neutral'),
    title: label,
    fact: 'More about this state is not available yet.',
  });
};

/** Whether a run's approved replies are still going out after its push. */
const repliesPostingOf = (run: ContributeAttemptDetail) =>
  (run.replyDrafts ?? []).some(
    (draft) => draft.state === 'POSTING' || (draft.state === 'DRAFT' && draft.send === true),
  );

/** A run's line, when nothing waits on it. `reading`: its push went out and the pull request is not read again yet. */
export function runStatusOf(
  run: ContributeAttemptDetail,
  {
    now,
    round,
    entry,
    prUrl,
    reading = false,
  }: {
    now: Date;
    round: number | null;
    /** The run as the pull request's history lists it (its pushed sha, its tallies). */
    entry?: ContributeFollowUpRound;
    prUrl?: string | null;
    reading?: boolean;
  },
): SessionStatus {
  const name = runNameOf(round);
  const lower = round ? `run ${round}` : 'the run';
  const tally = run.round ?? entry;
  switch (run.state) {
    case 'QUEUED':
      return line({
        name: 'QUEUED',
        lead: pill('Queued', 'neutral'),
        title: `${name} is queued`,
        fact: 'starts when your limits allow',
      });
    case 'CLAIMING':
      return line({ name: 'CLAIMING', lead: pill('Starting', 'violet'), title: `${name} is starting`, live: true });
    case 'RUNNING':
    case 'CHECKS': {
      if (isOwnAgent(run)) return ownAgentOf(run, now);
      const step = followUpStepOf(run);
      return line({
        name: run.state,
        lead: { kind: 'dot' },
        title: `${name} ${step && step !== 'ready' ? RUN_DOING[step] : 'is working'}`,
        fact: [sinceOf(run.createdAt, now), `${usd(run.costUsd)} of ${usd(run.budgetUsd)}`].filter(Boolean).join(' · '),
        bar: runBarOf(run),
        live: true,
      });
    }
    case 'SUBMITTING':
      return line({
        name: 'SUBMITTING',
        lead: { kind: 'dot' },
        title: `Pushing ${lower}`,
        bar: [
          { label: 'Fork', state: 'done' },
          { label: 'Push', state: run.submit?.lastError ? 'retrying' : 'current' },
          { label: 'Replies', state: 'pending' },
        ],
        details: run.submit?.lastError?.note ? [run.submit.lastError.note] : [],
        live: true,
      });
    case 'DONE': {
      if (repliesPostingOf(run)) {
        return line({
          name: 'REPLIES_POSTING',
          lead: { kind: 'dot' },
          title: `Posting ${lower}'s replies`,
          bar: [
            { label: 'Fork', state: 'done' },
            { label: 'Push', state: 'done' },
            { label: 'Replies', state: 'current' },
          ],
          live: true,
        });
      }
      const sha = shortSha(tally?.pushedSha);
      const tallies = tally ? roundTalliesOf(tally) : [];
      if (sha) {
        return line({
          name: 'PUSHED',
          lead: { kind: 'check' },
          title: `${name} pushed ${sha}`,
          fact: [...tallies, reading ? 'reading the pull request again' : null].filter(Boolean).join(' · ') || null,
          link: prUrl ? { href: prUrl, label: 'See it on GitHub ↗', external: true } : null,
        });
      }
      const posted = (run.replyDrafts ?? []).filter((draft) => draft.state === 'POSTED').length || tally?.replied || 0;
      return line({
        name: 'DONE',
        lead: { kind: 'check' },
        title: posted
          ? `${name} posted ${posted} ${posted === 1 ? 'reply' : 'replies'}`
          : `${name} is done, nothing to post`,
        fact: tallies.join(' · ') || null,
      });
    }
    case 'STOPPED':
      return stoppedOf(run);
    case 'DISCARDED':
      return line({
        name: 'DISCARDED',
        lead: pill('Discarded', 'neutral'),
        title: 'Discarded',
        fact: `${endReasonLabelOf(run) ?? 'It was discarded.'} Nothing was pushed or posted. ${usd(run.costUsd)} was spent.`,
      });
    default:
      return unknownOf(run);
  }
}

/** A run's line from what the pull request's history lists of it alone (a run the page did not read). */
export function roundLeadOf(entry: ContributeFollowUpRound): string {
  const name = runNameOf(entry.round);
  switch (entry.state) {
    case 'DONE': {
      const sha = shortSha(entry.pushedSha);
      return sha
        ? `${name} pushed ${sha}`
        : entry.replied
          ? `${name} posted ${entry.replied} ${entry.replied === 1 ? 'reply' : 'replies'}`
          : `${name} is done, nothing to post`;
    }
    case 'STOPPED':
      return 'Stopped';
    case 'DISCARDED':
      return 'Discarded';
    case 'SUBMITTING':
      return `Pushing ${name.toLowerCase()}`;
    case 'QUEUED':
      return `${name} is queued`;
    default:
      return `${name} is under way`;
  }
}

/** The proof's passive stages, as the next pane's line says them. */
export type ProofLineStage = 'working' | 'posting' | 'posted' | 'ask-cleared';

/** Why no run can start on the waiting comments, by its cause: the next pane's line when comments wait. */
export function noRunWhyOf(cause: 'hand' | 'said-no' | 'stopped'): string {
  if (cause === 'said-no') {
    return 'The repo said no to AI-made pull requests, so no run adds to this one: answer these on GitHub.';
  }
  if (cause === 'hand')
    return 'You opened this pull request yourself, so no run can add to it: answer these on GitHub.';
  return 'Answer them on GitHub.';
}

/** The next pane's line, when it holds no move: nothing waits, or comments wait with no run to take them. */
export function nextStatusOf({
  prNumber,
  prUrl,
  waiting,
  noRun,
  signingOff,
}: {
  prNumber: number;
  prUrl: string | null;
  /** Review threads waiting for an answer. */
  waiting: number;
  /** Why no run can take them, or null when a run may start. */
  noRun: 'hand' | 'said-no' | 'stopped' | null;
  signingOff: boolean;
}): SessionStatus {
  if (signingOff) {
    return line({
      name: 'SIGNING_OFF',
      lead: { kind: 'dot' },
      title: 'Signing off the commits',
      fact: 'Rewriting them with your sign-off.',
      live: true,
    });
  }
  if (waiting && noRun) {
    return line({
      name: 'COMMENTS_WAIT',
      title: `${waiting} ${waiting === 1 ? 'comment waits' : 'comments wait'} for an answer`,
      fact: noRunWhyOf(noRun),
      link: prUrl ? { href: prUrl, label: `Open #${prNumber} on GitHub ↗`, external: true } : null,
    });
  }
  return line({ name: 'NOTHING_WAITS', title: `Nothing waits on #${prNumber}` });
}

// ---------------------------------------------------------------------------------------------------------------------
// A submit that came back for approval

/** The control beside "Try again" on a submit that came back: where the way past it is. */
export type BounceSecondary = 'org-access' | 'fork-sync' | 'fork-page' | 'fork-branches' | 'repo-rules' | null;

export type BounceWords = {
  tone: 'amber' | 'red';
  title: string;
  /** The one visible sentence. */
  why: string;
  /** "Try again" opens the form; none while the note's condition has not passed. */
  tryAgain: boolean;
  secondary: BounceSecondary;
  /** A line the Why disclosure adds. */
  more: string | null;
};

/** The repo's own limits that keep the change in review until they pass. */
const REPO_LIMITS = new Set(['repo_busy', 'repo_month_cap', 'repo_open_cap', 'repo_open_cap_all_users']);

const STEP_TITLES: Record<string, string> = {
  FORK: "Your fork wasn't created",
  SYNC: "Your fork couldn't be brought up to date",
  PUSH: "The push to your fork didn't go through",
  PULL_REQUEST: "The pull request didn't open",
};

/** The note's first sentence. */
export const firstSentence = (note: string | null | undefined): string => {
  const text = note?.trim() ?? '';
  const end = text.search(/[.!?](\s|$)/);
  return clipped(end >= 0 ? text.slice(0, end + 1) : text, 300);
};

/** What a first attempt's card says after a submit that came back for approval, by the reason it came back. */
export function bounceOf(error: ContributeSubmitError, step: string | null | undefined): BounceWords {
  const reason = error.reason.trim().toLowerCase();
  const why = firstSentence(error.note) || 'The last step did not go through.';
  const base = { why, tryAgain: true, secondary: null, more: null } as const;
  switch (reason) {
    case 'org_restricted':
      return {
        ...base,
        tone: 'amber',
        title: "The organization hasn't approved GitRanks yet",
        secondary: 'org-access',
        more: 'It goes through only once the organization approves the app.',
      };
    case 'sync_workflows':
      return { ...base, tone: 'amber', title: 'Sync your fork on GitHub, then try again', secondary: 'fork-sync' };
    case 'sync_conflict':
      return {
        ...base,
        tone: 'amber',
        title: "Your fork's default branch has commits of its own",
        secondary: 'fork-page',
      };
    case 'branch_conflict':
      return {
        ...base,
        tone: 'amber',
        title: 'Your fork already has a branch of this name',
        secondary: 'fork-branches',
      };
    case 'fork_timeout':
      return { ...base, tone: 'amber', title: 'GitHub is still making your fork', why: 'Try again in a few minutes.' };
    case 'invalid':
      return { ...base, tone: 'red', title: 'GitHub refused the pull request as invalid' };
    case 'no_contributor':
      return {
        ...base,
        tone: 'red',
        title: "Your GitHub login couldn't be read",
        why: 'Sign in again, then approve again.',
        tryAgain: false,
      };
    default:
      if (REPO_LIMITS.has(reason)) {
        return {
          ...base,
          tone: 'amber',
          title: 'The repo takes no more pull requests from GitRanks for now',
          tryAgain: false,
          secondary: 'repo-rules',
        };
      }
      return { ...base, tone: 'red', title: STEP_TITLES[String(step ?? '')] ?? "The submit didn't go through" };
  }
}

/** "Fork ✓ · Sync ✓ · Push ✕ · Nov 13, 09:19 UTC": a submit's steps as they settled, in one mono line. */
export function settledStepsOf(submit: {
  step: string;
  steps?: { step: string; doneAt: string | null }[] | null;
  lastError: ContributeSubmitError | null;
}): string {
  const order = ['FORK', 'SYNC', 'PUSH', 'PULL_REQUEST'];
  const words: Record<string, string> = { FORK: 'Fork', SYNC: 'Sync', PUSH: 'Push', PULL_REQUEST: 'Open PR' };
  const at = order.indexOf(submit.step);
  const marks = order.flatMap((step, index) => {
    const timed = submit.steps?.find((each) => each.step === step);
    const done = timed ? !!timed.doneAt : at > index;
    const failed = index === at && !!submit.lastError;
    // Steps not reached are left out: the line says how far it got.
    return failed || done ? [`${words[step]} ${failed ? '✕' : '✓'}`] : [];
  });
  return [...marks, submit.lastError ? timeLabel(submit.lastError.at) : null].filter(Boolean).join(' · ');
}

/** A link inside the app, for a status line. */
export const routeOf = (href: string) => href as Route;
