import { endReasonLabelOf, isOwnAgent } from './attempt-format';
import type { ContributeAttemptDetail, ContributeFollowUpRound } from './contribute.types';
import { followUpStepOf, roundTalliesOf, shortSha } from './follow-up-flow';
import { usd } from './format';
import {
  line,
  ownAgentOf,
  pill,
  RUN_DOING,
  runNameOf,
  type SessionStatus,
  sinceOf,
  stoppedOf,
  unknownOf,
} from './session-status';

/**
 * Where a run stands in one line, when nothing waits on it (M3), and the next step's line when it holds no move:
 * nothing waits, comments wait with no run to take them, or a sign-off on its way. Pure.
 */

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
