import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeContribution,
  ContributeFeedbackThread,
  ContributeProof,
  ContributePrSignal,
  ContributePrSignalKind,
} from './contribute.types';
import { USERS_SIGNALS } from './follow-up-format';
import { botVerdictOf, bracketed, type NeedsYouItem, prItemOf, pushDetailOf, runOutcomeOf } from './needs-you';
import { type ContributePrConventionIssue, type ContributePrFix, httpsOnly } from './pr-conventions';
import { type ProofStage, proofStageOf, proofTellsBlock, proofWaits } from './proof';
import { nextRoundOpen, nextRoundRecommended, nextRunNumberOf, waitingThreadsOf } from './sessions';

/**
 * A contribution's next step (`?session=next`, 2026-11-03): what waits on its open pull request, as the cards that
 * lead the user through it. A run's card when a run can act (the items ticked, the note filled in from them); a card
 * for each thing only the user can do (what was found, the steps, the GitHub link, "I've done it"); the repo's rules;
 * the DCO sign-off. Pure: the page and its specs read the same.
 */

/** What a run that ended found, for the card: its number, when, and what it cost. Its text is untrusted. */
export type RunFinding = {
  round: number | null;
  outcome: 'no_go' | 'stopped' | 'push_failed';
  detail: string | null;
  at: string;
  costUsd: number | null;
};

/** A thing only the user can do, one card each. `kinds`: what "I've done it" marks handled. */
export type UserMove =
  /** A review bot blocks the merge, or a run found the rest is the user's (a no-go), or both. */
  | {
      kind: 'found';
      kinds: ContributePrSignalKind[];
      bot: { by: string | null; verdict: string; at: string } | null;
      run: RunFinding | null;
    }
  /**
   * A review bot asks for proof only the user's machine can capture: their own agent captures it, they check it, GitRanks
   * posts it. `stage`: where it stands; `waits`: the user, or their agent, still has something to do.
   */
  | {
      kind: 'proof';
      kinds: ContributePrSignalKind[];
      stage: ProofStage;
      proof: ContributeProof;
      bot: { by: string | null; verdict: string; at: string } | null;
      waits: boolean;
    }
  /** A run that stopped before it was done, or whose commits failed to push: try the next one, or handle it. */
  | { kind: 'stopped'; kinds: ContributePrSignalKind[]; run: RunFinding }
  /** An agreement to sign: by a comment posted word for word, or on a page. */
  | {
      kind: 'agreement';
      kinds: ContributePrSignalKind[];
      agreement: 'CLA' | 'DCO';
      signComment: string | null;
      signUrl: string | null;
      check: string | null;
    }
  /** The title breaks the repo's rules, with no one-click fix read for it. */
  | { kind: 'title'; kinds: ContributePrSignalKind[]; title: string | null };

export type NextRun = {
  /** The run's number. */
  round: number;
  /** A run may start now. */
  open: boolean;
  /** GitRanks sees something a run can act on, or comments wait. */
  recommended: boolean;
  /** What waits that a run acts on: the reads' signals and the review threads. */
  signals: ContributePrSignal[];
  threads: ContributeFeedbackThread[];
  /** The kinds of `signals`, for "mark it as handled". */
  kinds: ContributePrSignalKind[];
  /** The note GitRanks fills in from what waits; '' when nothing does. */
  note: string;
};

export type NextStep = {
  run: NextRun;
  /** The user's own moves, in Needs you's order. */
  user: UserMove[];
  /** The repo's rules card: what the PR fails of them (an agreement left to its own card), or a fix on its way. */
  rules: { issues: ContributePrConventionIssue[]; fix: ContributePrFix | null } | null;
  /** The DCO sign-off card: a sign-off missing, or one sent. */
  dco: { missing: boolean; fix: ContributePrFix | null; canPush: boolean } | null;
};

const capitalized = (text: string) => (text ? `${text[0].toUpperCase()}${text.slice(1)}` : text);

/** `a`, `a and b`, `a, b and c`. */
const listed = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');

/** The failing checks a signal names. */
const checksOf = (signals: ContributePrSignal[]) => [
  ...new Set(
    signals
      .filter(({ kind }) => kind === 'CHECK_FAILED')
      .flatMap(({ detail }) => (detail ?? '').split(', '))
      .map((name) => name.trim())
      .filter(Boolean),
  ),
];

/**
 * The note GitRanks fills in for the next run from what waits: "Fix the failing checks (lint, test) and address the 3
 * review comments from @ana." Logins as GitHub writes them; the check names are the repo's. '' when nothing waits.
 */
export function defaultNoteOf(signals: ContributePrSignal[], threads: ContributeFeedbackThread[]): string {
  const kinds = new Set(signals.map(({ kind }) => kind));
  const checks = checksOf(signals);
  const authors = [...new Set(threads.map(({ author }) => author).filter((author): author is string => !!author))];
  const who = authors.length && authors.length <= 3 ? ` from ${listed(authors.map((author) => `@${author}`))}` : '';
  const parts = [
    checks.length ? `fix the failing ${checks.length === 1 ? 'check' : 'checks'} (${checks.join(', ')})` : null,
    threads.length
      ? `address the ${threads.length === 1 ? 'review comment' : `${threads.length} review comments`}${who}`
      : kinds.has('CHANGES_REQUESTED')
        ? 'address the requested changes'
        : null,
    kinds.has('COMMENT') && !threads.length ? 'answer the new comment on the pull request' : null,
  ].filter((part): part is string => !!part);
  return parts.length ? `${capitalized(listed(parts))}.` : '';
}

/** What a run that ended found, from its signal and the round the pull request lists for it. */
function findingOf(first: ContributeAttemptDetail, signal: ContributePrSignal): RunFinding {
  const listed = first.followUps?.history?.find((round) => round.attemptId === signal.attemptId);
  const outcome = runOutcomeOf(signal);
  return {
    round: signal.round ?? listed?.round ?? (first.followUps?.used || null),
    outcome,
    detail: (outcome === 'push_failed' ? pushDetailOf(signal.detail) : signal.detail?.trim()) || null,
    at: listed?.at ?? signal.at,
    costUsd: listed && listed.costUsd > 0 ? listed.costUsd : null,
  };
}

/**
 * The contribution's next step, from its first attempt (its open pull request and what waits on it). `agentConnected`:
 * the user's own agent has called GitRanks (a proof's card asks them to connect it first otherwise).
 */
export function nextStepOf(first: ContributeAttemptDetail, agentConnected = false, now = new Date()): NextStep {
  const signals = first.needsYou?.signals ?? [];
  const find = (kind: ContributePrSignalKind) => signals.find((signal) => signal.kind === kind);
  const runSignals = signals.filter(({ kind }) => !USERS_SIGNALS.has(kind));
  const threads = waitingThreadsOf(first);
  const user: UserMove[] = [];

  const cla = find('CLA');
  if (cla) {
    const conventions = first.conventions?.cla;
    user.push({
      kind: 'agreement',
      kinds: ['CLA'],
      agreement: conventions?.agreement === 'DCO' ? 'DCO' : 'CLA',
      signComment: conventions?.signComment?.trim() || null,
      signUrl:
        httpsOnly(conventions?.signUrl) ??
        httpsOnly(first.prIssues?.find(({ kind }) => kind === 'CLA')?.suggestion) ??
        null,
      check: conventions?.check ?? cla.detail ?? null,
    });
  }
  const title = find('TITLE');
  if (title && !first.prIssues?.some(({ kind }) => kind === 'TITLE')) {
    user.push({ kind: 'title', kinds: ['TITLE'], title: title.detail?.trim() || null });
  }
  const blocked = find('BOT_BLOCKED');
  const ended = find('RUN_ENDED');
  const finding = ended ? findingOf(first, ended) : null;
  // A proof's card tells the bot's block while the proof is the answer to it; a block raised after a proof was posted
  // is the bot's new word, on the found card. The run's no-go finding, if any, gets the found card alone.
  const stage = first.proof && first.openedBy !== 'HAND' ? proofStageOf(first.proof, agentConnected, now) : null;
  const proof = stage && first.proof ? first.proof : null;
  const proofBlock = !!blocked && proofTellsBlock(stage, proof?.session, blocked.at);
  if (stage && proof) {
    user.push({
      kind: 'proof',
      kinds: proofBlock || !blocked ? ['BOT_BLOCKED'] : [],
      stage,
      proof,
      bot: blocked && proofBlock ? { ...botVerdictOf(blocked), at: blocked.at } : null,
      waits: proofWaits(stage),
    });
  }
  if ((blocked && !proofBlock) || finding?.outcome === 'no_go') {
    const bot = blocked && !proofBlock ? { ...botVerdictOf(blocked), at: blocked.at } : null;
    user.push({
      kind: 'found',
      kinds: [
        ...(bot ? (['BOT_BLOCKED'] as const) : []),
        ...(finding?.outcome === 'no_go' ? (['RUN_ENDED'] as const) : []),
      ],
      bot,
      run: finding?.outcome === 'no_go' ? finding : null,
    });
  }
  if (finding?.outcome === 'stopped' || finding?.outcome === 'push_failed') {
    user.push({ kind: 'stopped', kinds: ['RUN_ENDED'], run: finding });
  }

  const fix = first.prFix ?? null;
  const signOff = fix?.kind === 'SIGN_OFF' ? fix : null;
  const missing = !!find('DCO');
  // The agreement has its own card: the rules card leaves its line out.
  const issues = (first.prIssues ?? []).filter(({ kind }) => !(cla && kind === 'CLA'));
  const ruleFix = fix && !signOff ? fix : null;

  return {
    run: {
      round: nextRunNumberOf(first),
      open: nextRoundOpen(first),
      recommended: nextRoundRecommended(first) || runSignals.length > 0,
      signals: runSignals,
      threads,
      kinds: [...new Set(runSignals.map(({ kind }) => kind))],
      note:
        defaultNoteOf(runSignals, threads) ||
        (finding?.outcome === 'stopped'
          ? `${finding.round ? `Run ${finding.round}` : 'The last run'} stopped before it was done${finding.detail ? ` (${bracketed(finding.detail)})` : ''}. Pick it up and finish it.`
          : finding?.outcome === 'push_failed'
            ? `${finding.round ? `Run ${finding.round}` : 'The last run'}'s commits could not be pushed${finding.detail ? ` (${bracketed(finding.detail)})` : ''}. Make the change again on the pull request as it is now.`
            : ''),
    },
    user,
    rules: issues.length || ruleFix?.state === 'SENDING' ? { issues, fix: ruleFix } : null,
    dco: missing || signOff?.state === 'SENDING' ? { missing, fix: signOff, canPush: first.openedBy !== 'HAND' } : null,
  };
}

/** Whether anything waits for the user on the pull request: the next step has a card besides the run's own. */
export const nextStepWaits = (step: NextStep): boolean =>
  step.user.some((move) => move.kind !== 'proof' || move.waits) ||
  !!step.rules ||
  !!step.dco ||
  step.run.signals.length > 0 ||
  step.run.threads.length > 0;

/**
 * The open pull request of a first attempt as a list reads it, for its Needs-you row on its own page: null before it
 * has one.
 */
export function contributionOf(first: ContributeAttemptDetail): ContributeContribution | null {
  const pr = first.pullRequest;
  if (!pr || first.kind !== 'FIRST') return null;
  return {
    attemptId: first.attemptId,
    issueId: first.issueId,
    repositoryId: first.repositoryId,
    nameWithOwner: first.nameWithOwner,
    issueNumber: first.number,
    title: first.prTitle ?? first.approval?.title ?? first.title,
    pullRequest: pr,
    costUsd: first.costUsd,
    needsYou: first.needsYou,
    followUps: first.followUps ?? undefined,
    runner: first.runner,
    agent: first.agent,
    openedBy: first.openedBy,
    prFix: first.prFix,
    prIssues: first.prIssues,
    conventions: first.conventions ? { cla: first.conventions.cla } : first.conventions,
    proof: first.proof,
  };
}

/**
 * The pull request's row as Needs you shows it, for the line on the contribution's other sessions: what the user's
 * move is, or the run at work. The comments that wait count too (the lists do not read them). Null: nothing waits.
 */
export function yourMoveOf(
  first: ContributeAttemptDetail,
  runs: ContributeAttempt[],
  now: Date,
): Pick<NeedsYouItem, 'kind' | 'move' | 'working' | 'pill' | 'action'> | null {
  const pr = contributionOf(first);
  if (!pr) return null;
  const item = prItemOf({ pr, drafts: [], runs, now });
  if (item) return item;
  const waiting = waitingThreadsOf(first).length;
  if (!waiting || !nextRoundOpen(first)) return null;
  return {
    move: `${waiting === 1 ? 'A comment waits' : `${waiting} comments wait`} for an answer. Start run ${nextRunNumberOf(first)} on ${waiting === 1 ? 'it' : 'them'}.`,
    kind: 'changes',
    working: false,
    pill: 'Review comments',
    action: null,
  };
}
