import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { ContributeNotices } from './contribute-notices';
import { Pill } from './primitives';
import { attemptHref } from './reviews-ready';
import {
  ATTEMPT_STATES,
  attemptTitleOf,
  END_REASONS,
  githubUrlOf,
  IN_PROGRESS_STATES,
  labelOf,
  PR_STATES,
  repoOf,
  SUBMIT_STEP_TEXT,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import { loadAttempts, loadContribute, loadContributions } from '@/lib/contribute/contribute.data';
import type {
  ContributeAttempt,
  ContributeAttemptState,
  ContributeContribution,
  ContributeContributions,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { contributeNoticesOf } from '@/lib/contribute/contribute-state';
import { dayLabel, relativeLabel, usd } from '@/lib/contribute/format';

/** Merged pull requests that unlock autopilot. */
const AUTOPILOT_AT = 3;

export async function ContributionsView() {
  const [view, contributions, attempts] = await Promise.all([
    loadContribute(),
    loadContributions(),
    loadAttempts(undefined, 50),
  ]);
  if (!view) notFound();
  return <ContributionsScreen view={view} contributions={contributions} attempts={attempts} />;
}

function Tile({ label, value, text, name }: { label: string; value: string; text: ReactNode; name: string }) {
  return (
    <div data-total={name} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4.5 py-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[28px] font-bold">{value}</span>
      <span className="text-[13px] text-muted-foreground">{text}</span>
    </div>
  );
}

function Totals({ view, contributions }: { view: ContributeView; contributions: ContributeContributions | undefined }) {
  if (!contributions) {
    return (
      <div
        data-totals="unavailable"
        className="rounded-xl border border-dashed px-5 py-4 text-sm text-muted-foreground"
      >
        Your totals are not available yet.
      </div>
    );
  }
  const { open, merged, closed, costUsd } = contributions.totals;
  const autopilot = view.contributor?.autopilot;
  const toUnlock = Math.max(0, AUTOPILOT_AT - (autopilot?.mergedCount ?? merged));
  const ended = merged + closed;
  const changesRequested = contributions.items.filter(
    ({ pullRequest }) => pullRequest.state === 'OPEN' && pullRequest.reviewDecision === 'CHANGES_REQUESTED',
  ).length;
  const prs = open + merged + closed;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        name="merged"
        label="Merged"
        value={String(merged)}
        text={
          autopilot?.unlocked
            ? 'Autopilot is unlocked'
            : toUnlock
              ? `${toUnlock} more unlock${toUnlock === 1 ? 's' : ''} autopilot`
              : 'Autopilot can unlock'
        }
      />
      <Tile
        name="open"
        label="Open"
        value={String(open)}
        text={changesRequested ? `${changesRequested} with changes requested` : 'Waiting on maintainers'}
      />
      <Tile
        name="closed"
        label="Closed"
        value={String(closed)}
        text={ended ? `${Math.round((merged / ended) * 100)}% merged of those decided` : 'None decided yet'}
      />
      <Tile
        name="cost"
        label="Credits used"
        value={usd(costUsd)}
        text={`across ${prs} pull request${prs === 1 ? '' : 's'}`}
      />
    </div>
  );
}

function AttemptRow({ attempt, action, text }: { attempt: ContributeAttempt; action: string; text: ReactNode }) {
  const state = toneLabelOf(ATTEMPT_STATES, attempt.state);
  return (
    <li
      data-attempt={attempt.attemptId}
      data-state={attempt.state}
      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0"
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] text-muted-foreground">
            {repoOf(attempt)} · issue #{attempt.number}
          </span>
          <Pill tone={state.tone}>{state.label}</Pill>
        </span>
        <span className="font-medium">{attemptTitleOf(attempt)}</span>
        <span className="text-[13px] text-muted-foreground">{text}</span>
      </div>
      <Link
        href={attemptHref(attempt.attemptId)}
        prefetch={false}
        className="min-h-10 content-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {action}
      </Link>
    </li>
  );
}

function NeedsYou({ attempts, now }: { attempts: ContributeAttempt[]; now?: Date }) {
  if (!attempts.length) return null;
  return (
    <section
      aria-labelledby="needs-you"
      data-section="needs-you"
      className="overflow-hidden rounded-xl border border-amber-200 bg-card dark:border-amber-900"
    >
      <h2
        id="needs-you"
        className="border-b border-amber-200 bg-amber-50 px-5 py-3.5 text-[15px] font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      >
        Needs you · {attempts.length}
      </h2>
      <ul>
        {attempts.map((attempt) => (
          <AttemptRow
            key={attempt.attemptId}
            attempt={attempt}
            action="Review"
            text={
              attempt.state === 'PENDING_AUTOSUBMIT'
                ? 'Autopilot submits it within the hour.'
                : attempt.submit?.lastError
                  ? attempt.submit.lastError.note
                  : `Ready ${relativeLabel(attempt.updatedAt, now)} · cost ${usd(attempt.costUsd)} · waits seven days for you`
            }
          />
        ))}
      </ul>
    </section>
  );
}

function InProgress({ attempts, now }: { attempts: ContributeAttempt[]; now?: Date }) {
  if (!attempts.length) return null;
  return (
    <section
      aria-labelledby="in-progress"
      data-section="in-progress"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <h2 id="in-progress" className="border-b px-5 py-3.5 text-[15px] font-semibold">
        In progress · {attempts.length}
      </h2>
      <ul>
        {attempts.map((attempt) => (
          <AttemptRow
            key={attempt.attemptId}
            attempt={attempt}
            action="Details"
            text={
              attempt.state === 'SUBMITTING' && attempt.submit
                ? `${labelOf(SUBMIT_STEP_TEXT, attempt.submit.step)}${
                    attempt.submit.step === 'WAITING_CAP' && attempt.submit.waitUntil
                      ? ` It goes on ${relativeLabel(attempt.submit.waitUntil, now)}.`
                      : ''
                  }`
                : `Started ${relativeLabel(attempt.createdAt, now)} · ${usd(attempt.costUsd)} of ${usd(attempt.budgetUsd)}`
            }
          />
        ))}
      </ul>
    </section>
  );
}

function PrStatePill({ contribution }: { contribution: ContributeContribution }) {
  const { pullRequest } = contribution;
  if (pullRequest.state === 'OPEN' && pullRequest.reviewDecision === 'CHANGES_REQUESTED') {
    return <Pill tone="amber">Changes requested</Pill>;
  }
  const state = toneLabelOf(PR_STATES, pullRequest.state);
  return <Pill tone={state.tone}>{state.label}</Pill>;
}

/** `PR #12`, linked to GitHub only when the link points there. */
function PrNumberLink({ url, number }: { url: string; number: number }) {
  const href = githubUrlOf(url);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
      PR #{number}
    </a>
  ) : (
    <span>PR #{number}</span>
  );
}

function PullRequests({ contributions, now }: { contributions: ContributeContributions | undefined; now?: Date }) {
  let content: ReactNode;
  if (!contributions) {
    content = <p className="px-5 py-4 text-sm text-muted-foreground">Your pull requests are not available yet.</p>;
  } else if (!contributions.items.length) {
    content = (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        No pull requests yet. Once you submit a change you reviewed, it shows here.{' '}
        <Link href="/contribute/issues" prefetch={false} className="font-semibold text-primary">
          See the issues picked for you
        </Link>
      </p>
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-[0.06em] text-muted-foreground uppercase">
              <th className="px-5 py-2.5 font-medium">Pull request</th>
              <th className="px-3 py-2.5 font-medium">State</th>
              <th className="px-3 py-2.5 font-medium">Dates</th>
              <th className="py-2.5 pr-5 pl-3 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {contributions.items.map((contribution) => {
              const { pullRequest } = contribution;
              const ended = pullRequest.mergedAt ?? pullRequest.closedAt;
              return (
                <tr key={contribution.attemptId} data-pr={pullRequest.number} className="border-t">
                  <td className="px-5 py-3 align-top">
                    <Link
                      href={attemptHref(contribution.attemptId)}
                      prefetch={false}
                      className="font-medium text-foreground hover:underline"
                    >
                      {contribution.title?.trim() || `Fix for issue #${contribution.issueNumber}`}
                    </Link>
                    <div className="font-mono text-[12.5px] text-muted-foreground">
                      {contribution.nameWithOwner || 'a repo'} ·{' '}
                      <PrNumberLink url={pullRequest.url} number={pullRequest.number} /> · issue #
                      {contribution.issueNumber}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PrStatePill contribution={contribution} />
                  </td>
                  <td className="px-3 py-3 align-top text-[13px] whitespace-nowrap text-muted-foreground">
                    <div>Opened {dayLabel(pullRequest.openedAt)}</div>
                    {ended ? (
                      <div>
                        {pullRequest.mergedAt ? 'Merged' : 'Closed'} {dayLabel(ended)}
                      </div>
                    ) : (
                      <div>{relativeLabel(pullRequest.openedAt, now)}</div>
                    )}
                  </td>
                  <td className="py-3 pr-5 pl-3 text-right align-top font-mono text-[13px]">
                    {usd(contribution.costUsd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="pull-requests"
      className="min-w-0 flex-[999_1_640px] overflow-hidden rounded-xl border bg-card"
    >
      <h2 id="pull-requests" className="border-b px-5 py-3.5 text-[15px] font-semibold">
        Pull requests
      </h2>
      {content}
    </section>
  );
}

const PR_STATES_OF_ATTEMPT: ContributeAttemptState[] = ['PR_OPEN', 'FOLLOW_UP', 'MERGED', 'CLOSED'];

/** How the user's recent attempts ended, from the newest the API answers. */
function HowAttemptsEnded({ attempts }: { attempts: ContributeAttempt[] | undefined }) {
  if (!attempts) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border bg-card p-4.5">
        <h2 className="text-[15px] font-semibold">How attempts ended</h2>
        <p className="text-sm text-muted-foreground">Not available yet.</p>
      </section>
    );
  }
  const count = (test: (attempt: ContributeAttempt) => boolean) => attempts.filter(test).length;
  const rows: [string, number][] = [
    ['Became pull requests', count(({ state }) => PR_STATES_OF_ATTEMPT.includes(state))],
    ['Waiting for your review', count(({ state }) => state === 'REVIEW')],
    ['In progress', count(({ state }) => IN_PROGRESS_STATES.includes(state))],
    ['Stopped at the go/no-go check', count(({ state, endReason }) => state === 'STOPPED' && endReason === 'NO_GO')],
    ['Stopped for another reason', count(({ state, endReason }) => state === 'STOPPED' && endReason !== 'NO_GO')],
    ['Discarded', count(({ state }) => state === 'DISCARDED')],
  ];
  const stops = attempts.filter(({ state }) => state === 'STOPPED').slice(0, 3);

  return (
    <section data-section="how-attempts-ended" className="flex flex-col gap-2.5 rounded-xl border bg-card p-4.5">
      <h2 className="text-[15px] font-semibold">
        {attempts.length
          ? `Your last ${attempts.length} attempt${attempts.length === 1 ? '' : 's'}`
          : 'No attempts yet'}
      </h2>
      {attempts.length ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {rows.map(([label, value]) => (
            <li key={label} className="flex justify-between gap-2.5">
              <span>{label}</span>
              <span className="font-mono">{value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">An agent starts on an issue for you as your limits allow.</p>
      )}
      {stops.length ? (
        <ul className="flex flex-col gap-1.5 border-t pt-2.5 text-[13px] text-muted-foreground">
          {stops.map((attempt) => (
            <li key={attempt.attemptId}>
              <Link href={attemptHref(attempt.attemptId)} prefetch={false} className="font-mono text-foreground/80">
                {repoOf(attempt)} #{attempt.number}
              </Link>{' '}
              · {attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : 'Stopped.'} · {usd(attempt.costUsd)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * My contributions: the totals, what needs the user, what is in progress, the pull requests, and how attempts ended.
 * `contributions` and `attempts` are `undefined` while the API does not answer them.
 */
export function ContributionsScreen({
  view,
  contributions,
  attempts,
  now,
}: {
  view: ContributeView;
  contributions: ContributeContributions | undefined;
  attempts: ContributeAttempt[] | undefined;
  now?: Date;
}) {
  const spend = view.contributor?.spend;
  const needsYou = (attempts ?? []).filter(({ state }) => state === 'REVIEW' || state === 'PENDING_AUTOSUBMIT');
  const inProgress = (attempts ?? []).filter(
    ({ state }) => IN_PROGRESS_STATES.includes(state) && state !== 'PENDING_AUTOSUBMIT',
  );

  return (
    <>
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold tracking-tight">My contributions</h1>
        {spend ? (
          <span className="text-sm text-muted-foreground">
            This cycle: {dayLabel(spend.cycleStart)} to {dayLabel(spend.cycleEnd)}, {usd(spend.cycleUsd)} used
          </span>
        ) : null}
      </div>
      <Totals view={view} contributions={contributions} />
      <NeedsYou attempts={needsYou} now={now} />
      <InProgress attempts={inProgress} now={now} />
      <div className="flex flex-wrap items-start gap-5">
        <PullRequests contributions={contributions} now={now} />
        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          <HowAttemptsEnded attempts={attempts} />
        </aside>
      </div>
    </>
  );
}
