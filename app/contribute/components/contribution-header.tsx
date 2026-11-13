import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { NoticeLine } from './contribute-notices';
import { HEADING, Pill } from './primitives';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import {
  attemptTitleOf,
  githubUrlOf,
  isOwnAgent,
  labelOf,
  PR_CHECKS,
  PR_STATES,
  REVIEW_DECISIONS,
  repoOf,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeAttemptPullRequest,
  ContributeFollowUpOf,
  ContributePrNotes,
} from '@/lib/contribute/contribute.types';
import { dayLabel, relativeLabel } from '@/lib/contribute/format';
import { hardStopOf } from '@/lib/contribute/hard-stop';
import { attemptPath } from '@/lib/contribute/sessions';

/** Back to the user's contributions. */
export const BackLink = () => (
  <Link href="/contribute/me" prefetch={false} className="text-sm font-semibold text-link">
    ← My contributions
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
 * The pull request in one line: its state, a link to it, then while it is open its review, its checks and when it was
 * last read from GitHub; once it ended, when it was merged or closed.
 */
export function PullRequestStatus({ pullRequest, now }: { pullRequest: ContributeAttemptPullRequest; now?: Date }) {
  const state = toneLabelOf(PR_STATES, pullRequest.state);
  const url = githubUrlOf(pullRequest.url);
  const name = (
    <>
      <span className="max-sm:sr-only">Pull request </span>#{pullRequest.number}
    </>
  );

  return (
    <div data-pr-state={pullRequest.state} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Pill tone={state.tone}>{state.label}</Pill>
      <Dot />
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
          {name} ↗
        </a>
      ) : (
        <span className="font-semibold">{name}</span>
      )}
      {prPartsOf(pullRequest, now).map(({ key, node }) => (
        <Fragment key={key}>
          <Dot />
          {node}
        </Fragment>
      ))}
    </div>
  );
}

/** The pull request a follow-up works on: `pull request #1419 ↗`, or words while it is not known. */
export function FollowUpOfLink({ followUpOf }: { followUpOf: ContributeFollowUpOf | null | undefined }) {
  if (!followUpOf) return <>the pull request</>;
  const url = githubUrlOf(followUpOf.url);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
      pull request #{followUpOf.number} ↗
    </a>
  ) : (
    <>pull request #{followUpOf.number}</>
  );
}

/** A run whose first attempt is not known: the pull request it follows up, and the change that opened it. */
function FollowUpOfLine({ followUpOf }: { followUpOf: ContributeFollowUpOf | null | undefined }) {
  return (
    <p data-follow-up-of={followUpOf?.number ?? ''} className="text-sm text-muted-foreground">
      {followUpOf === undefined ? (
        'The pull request it follows up is not available yet.'
      ) : (
        <>
          Follows up <FollowUpOfLink followUpOf={followUpOf} />
          {followUpOf ? (
            <>
              {' '}
              ·{' '}
              <Link href={attemptPath(followUpOf.attemptId)} prefetch={false} className="text-link">
                the change that opened it
              </Link>
            </>
          ) : null}
        </>
      )}
    </p>
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

/**
 * The contribution's header: back to the list, the issue and its chips, its title, then the pull request's state in
 * one line (or, for a run whose first attempt is not known, the pull request it follows up), and a maintainer's stop.
 */
export function ContributionHeader({
  attempt,
  first,
  prNotes,
  now,
}: {
  /** Names the issue: the first attempt, or a run read on its own. */
  attempt: ContributeAttemptDetail;
  first?: ContributeAttemptDetail;
  prNotes?: ContributePrNotes;
  now?: Date;
}) {
  const issueUrl = githubUrlOf(attempt.url);
  const repo = repoOf(attempt);
  const stop = hardStopOf({ first, prNotes });
  const stopped = stop?.kind === 'maintainer_stopped' ? prNotes?.stopped : null;

  return (
    <header className="flex flex-col gap-2">
      <BackLink />
      <span className="flex flex-wrap items-center gap-2.5 font-mono text-sm text-muted-foreground">
        {issueUrl ? (
          <a href={issueUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {repo} · issue #{attempt.number} ↗
          </a>
        ) : (
          `${repo} · issue #${attempt.number}`
        )}
        {isOwnAgent(attempt) ? <Pill tone="violet">Your own agent</Pill> : null}
        {attempt.newcomersLabel ? <NewcomersChip label={attempt.newcomersLabel} /> : null}
      </span>
      <h1 className={HEADING.page}>{attemptTitleOf(attempt)}</h1>
      {first?.pullRequest ? (
        <PullRequestStatus pullRequest={first.pullRequest} now={now} />
      ) : attempt.kind === 'FOLLOW_UP' ? (
        <FollowUpOfLine followUpOf={attempt.followUpOf} />
      ) : null}
      {stopped ? (
        <MaintainerStoppedLine
          stopped={stopped}
          repo={repo}
          url={githubUrlOf(first?.pullRequest?.url ?? attempt.followUpOf?.url)}
          number={first?.pullRequest?.number ?? attempt.followUpOf?.number}
        />
      ) : null}
    </header>
  );
}
