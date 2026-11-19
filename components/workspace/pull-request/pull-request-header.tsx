import type { Route } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { type StageLine, stageLineOf } from './stage-line';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import { Pill } from '@/components/pill/pill';
import { NoticeLine } from '@/components/workspace/contribute-notices';
import { LearnPill } from '@/components/workspace/learn-pill';
import { HEADING } from '@/components/workspace/primitives';
import { RefChips } from '@/components/workspace/ref-chips';
import { ViewTabs } from '@/components/workspace/view-tabs';
import type { LearnAttemptLesson } from '@/lib/learn/learn.types';
import { type LessonLine, lessonLineOf } from '@/lib/learn/learn-view';
import {
  AGENT_NAMES,
  attemptTitleOf,
  githubUrlOf,
  isOwnAgent,
  labelOf,
  PR_CHECKS,
  PR_STATES,
  REVIEW_DECISIONS,
  repoOf,
  toneLabelOf,
} from '@/lib/workspace/attempt-format';
import { checkNoteLineOf, checkNotesOf } from '@/lib/workspace/check-notes';
import type {
  ContributeAttemptDetail,
  ContributeAttemptPullRequest,
  ContributeCheckNote,
  ContributePrNotes,
} from '@/lib/workspace/contribute.types';
import { dayLabel, MODELS, relativeLabel } from '@/lib/workspace/format';
import { hardStopOf } from '@/lib/workspace/hard-stop';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** Back to the user's contributions. */
export const BackLink = () => (
  <Link href={WORKSPACE_PATHS.pullRequests} prefetch={false} className="text-sm font-semibold text-link">
    ← Pull requests
  </Link>
);

const Dot = () => (
  <span aria-hidden="true" className="text-muted-foreground">
    ·
  </span>
);

const Muted = ({ children }: { children: ReactNode }) => <span className="text-muted-foreground">{children}</span>;

/** The review decisions and check states that get a coloured pill; the rest are muted words. */
const REVIEW_PILLS = { CHANGES_REQUESTED: 'amber', APPROVED: 'green' } as const;
const CHECK_PILLS = { FAILURE: 'red', ERROR: 'red' } as const;

type Part = { key: string; node: ReactNode };

/** The parts of a pull request's line after its link, each after a dot. */
function prPartsOf(pullRequest: ContributeAttemptPullRequest, now?: Date): Part[] {
  const { state, reviewDecision, checks, syncedAt } = pullRequest;
  if (state === 'MERGED') {
    return pullRequest.mergedAt
      ? [{ key: 'ended', node: <Muted>merged {relativeLabel(pullRequest.mergedAt, now)}</Muted> }]
      : [];
  }
  if (state === 'CLOSED') {
    const when = pullRequest.closedAt ? `, ${relativeLabel(pullRequest.closedAt, now)}` : '';
    return [{ key: 'ended', node: <Muted>closed without merging{when}</Muted> }];
  }
  // Open, or a state this UI does not know yet: its review and checks still show.
  const parts: Part[] = [];
  if (reviewDecision) {
    const tone = REVIEW_PILLS[reviewDecision as keyof typeof REVIEW_PILLS];
    const label = labelOf(REVIEW_DECISIONS, reviewDecision);
    parts.push({
      key: 'review',
      node: (
        <span data-pr-review={reviewDecision}>{tone ? <Pill tone={tone}>{label}</Pill> : <Muted>{label}</Muted>}</span>
      ),
    });
  }
  if (checks) {
    const tone = CHECK_PILLS[checks as keyof typeof CHECK_PILLS];
    const label = labelOf(PR_CHECKS, checks);
    parts.push({
      key: 'checks',
      node: <span data-pr-checks={checks}>{tone ? <Pill tone={tone}>{label}</Pill> : <Muted>{label}</Muted>}</span>,
    });
  }
  if (syncedAt) {
    parts.push({
      key: 'read',
      node: <span className="text-xs text-muted-foreground">read {relativeLabel(syncedAt, now)}</span>,
    });
  }
  return parts;
}

/**
 * The pull request in one line: its state, then while it is open its review, its checks and when it was last read from
 * GitHub; once it ended, when it was merged or closed. Its number and link are the header's `PR #N ↗` chip.
 */
export function PullRequestStatus({ pullRequest, now }: { pullRequest: ContributeAttemptPullRequest; now?: Date }) {
  const state = toneLabelOf(PR_STATES, pullRequest.state);
  return (
    <div data-pr-state={pullRequest.state} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Pill tone={state.tone}>{state.label}</Pill>
      {prPartsOf(pullRequest, now).map(({ key, node }) => (
        <Fragment key={key}>
          <Dot />
          {node}
        </Fragment>
      ))}
    </div>
  );
}

/**
 * Under the pull request's line: its failing checks that call nobody, one line each, with why (a run's verdict, a
 * commit someone else pushed, checks still running). Nothing without a note.
 */
export function CheckNotes({ notes }: { notes: readonly ContributeCheckNote[] | null | undefined }) {
  const lines = checkNotesOf(notes);
  if (!lines.length) return null;
  return (
    <ul data-check-notes={lines.length} aria-label="Notes on the failing checks" className="flex flex-col gap-0.5">
      {lines.map((note, index) => (
        <li
          key={`${index}-${note.name}`}
          data-check-note={note.kind}
          className="text-sm break-words text-muted-foreground"
        >
          {checkNoteLineOf(note)}
        </li>
      ))}
    </ul>
  );
}

const NEWCOMERS = 'The maintainers keep it for people new to the project.';

/** The issue's newcomers label, as the repo wrote it: what it means on a hover or a tap. */
function NewcomersChip({ label }: { label: string }) {
  return (
    <AdaptiveTooltip
      trigger={
        <button
          type="button"
          data-first-timers=""
          className="inline-flex rounded-full font-sans outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Pill tone="neutral">{label}</Pill>
          <span className="sr-only">: the maintainers keep it for people new to the project</span>
        </button>
      }
    >
      {NEWCOMERS}
    </AdaptiveTooltip>
  );
}

/** A maintainer stopped GitRanks work on the pull request: said once, under its line. */
function MaintainerStoppedLine({
  stopped,
  repo,
  url,
  number,
}: {
  stopped: NonNullable<ContributePrNotes['stopped']>;
  repo: string;
  url: string | null;
  number: number | undefined;
}) {
  return (
    <NoticeLine
      tone="warn"
      icon
      title="GitRanks work on this PR stopped"
      fact={`${stopped.login} · ${dayLabel(stopped.at)}`}
      why={
        <>
          A maintainer of {repo} stopped GitRanks work on this PR. No run, push, reply, sign-off or proof goes out from
          GitRanks. You can still answer on GitHub yourself.
          {url ? (
            <>
              {' '}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-link hover:underline"
              >
                Open #{number} on GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          ) : null}
        </>
      }
      data={{ 'data-pr-stopped': '' }}
    />
  );
}

/** "Hosted agent · Sonnet 5.5" or "Your own agent · Claude Code": whose agent wrote it. */
export function agentLineOf(attempt: Pick<ContributeAttemptDetail, 'runner' | 'agent' | 'model'>): string {
  if (isOwnAgent(attempt)) {
    const name = attempt.agent && attempt.agent.name !== 'OTHER' ? AGENT_NAMES[attempt.agent.name] : null;
    return name ? `Your own agent · ${name}` : 'Your own agent';
  }
  const model = attempt.model ? MODELS[attempt.model]?.replace(/^Claude /, '') : null;
  return model ? `Hosted agent · ${model}` : 'Hosted agent';
}

/** "Lesson", its pill, then a few facts: the step, whom it was written for, when it passed, whether it is public. */
function LessonLineView({ line }: { line: LessonLine }) {
  return (
    <div data-lesson-line={line.pill.label} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">Lesson</span>
      <Pill tone={line.pill.tone}>{line.pill.label}</Pill>
      {line.facts.length ? (
        <>
          <Dot />
          <Muted>{line.facts.join(' · ')}</Muted>
        </>
      ) : null}
    </div>
  );
}

/** The pill and words where the pull request's line goes, while no pull request exists. */
function StageStatus({ line }: { line: StageLine }) {
  return (
    <div data-stage={line.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Pill tone={line.pill.tone}>{line.pill.label}</Pill>
      {line.text ? <Muted>{line.text}</Muted> : null}
    </div>
  );
}

/**
 * The pull request's page's header (W1 §8.2), one for both sides: the way back (and, on an earlier attempt, the line
 * to the latest above it), the reference line (the repo, `Issue #N ↗`, `PR #N ↗` once it exists, the Learn pill, whose
 * agent wrote it, the newcomers chip), the issue's title, then one status line: the pull request's, with its failing
 * checks that call nobody and a maintainer's stop under it; before it exists, the stage (`stageLineOf`). A run is
 * always drawn under its first attempt (every run names it), so the header is the first attempt's. The lesson line and
 * the two views come with the Lesson view.
 */
export function PullRequestHeader({
  attempt,
  first,
  prNotes,
  earlier,
  lesson,
  base,
  now,
}: {
  /** Names the issue: the first attempt, or a run (`first` then is its first attempt). */
  attempt: ContributeAttemptDetail;
  /** The first attempt, when `attempt` is a run (a first attempt is its own). */
  first?: ContributeAttemptDetail;
  prNotes?: ContributePrNotes;
  /** An earlier attempt on the issue: the address of the latest, for the line above. */
  earlier?: { latest: Route } | null;
  /** A Learn attempt's lesson, while Learn is open to the viewer: the lesson line and the two views. */
  lesson?: LearnAttemptLesson | null;
  /** The page's address, for the two views' links. */
  base?: Route;
  now?: Date;
}) {
  const repo = repoOf(attempt);
  const named = first ?? (attempt.kind === 'FIRST' ? attempt : undefined);
  const pr = named?.pullRequest ?? null;
  const stop = hardStopOf({ first, prNotes });
  const stopped = stop?.kind === 'maintainer_stopped' ? prNotes?.stopped : null;
  const stage = named && !pr ? stageLineOf(named, now, lesson?.stage) : null;
  const lessonLine = lesson ? lessonLineOf(lesson) : null;

  return (
    <header className="flex flex-col gap-2" data-pr-header="">
      {earlier ? (
        <p data-earlier-attempt="" className="text-sm text-muted-foreground">
          An earlier attempt on this issue.{' '}
          <Link href={earlier.latest} prefetch={false} className="font-semibold text-link">
            See the latest →
          </Link>
        </p>
      ) : null}
      <BackLink />
      <RefChips repo={attempt.nameWithOwner} issue={attempt.number} pr={pr ? { number: pr.number, url: pr.url } : null}>
        {(named ?? attempt).mode === 'LEARN' ? <LearnPill /> : null}
        <Pill tone="neutral">{agentLineOf(named ?? attempt)}</Pill>
        {attempt.newcomersLabel ? <NewcomersChip label={attempt.newcomersLabel} /> : null}
      </RefChips>
      <h1 className={HEADING.page}>{attemptTitleOf(attempt)}</h1>
      {pr ? (
        <>
          <PullRequestStatus pullRequest={pr} now={now} />
          {pr.state === 'OPEN' ? <CheckNotes notes={named?.checkNotes} /> : null}
        </>
      ) : stage ? (
        <StageStatus line={stage} />
      ) : null}
      {stopped ? (
        <MaintainerStoppedLine stopped={stopped} repo={repo} url={githubUrlOf(pr?.url)} number={pr?.number} />
      ) : null}
      {lessonLine ? <LessonLineView line={lessonLine} /> : null}
      {lesson && base ? (
        <ViewTabs
          label="Views of this pull request"
          className="mt-2"
          tabs={[
            { key: 'pr', label: 'Pull request', href: base },
            { key: 'lesson', label: 'Lesson', href: `${base}/lesson` as Route, pathEnds: '/lesson' },
          ]}
        />
      ) : null}
    </header>
  );
}
