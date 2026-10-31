import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { LiveRunPhase } from './agent-runs';
import { ContributeNotices } from './contribute-notices';
import { FollowUpRounds, PrSignals } from './pr-follow-ups';
import { HEADING, PageTitle, Pill } from './primitives';
import { type DraftFollowUp, ReplyDraftItem } from './reply-drafts';
import { attemptHref } from './reviews-ready';
import { Button } from '@/components/ui/button';
import {
  ATTEMPT_STATES,
  agentLabelOf,
  attemptTitleOf,
  costOrAgentOf,
  END_REASONS,
  githubUrlOf,
  IN_PROGRESS_STATES,
  isOwnAgent,
  labelOf,
  PR_STATES,
  repoOf,
  SUBMIT_STEP_TEXT,
  toneLabelOf,
} from '@/lib/contribute/attempt-format';
import {
  loadAttempts,
  loadContribute,
  loadContributeActivity,
  loadContributions,
  loadOpenPrDrafts,
} from '@/lib/contribute/contribute.data';
import type {
  ContributeActivity,
  ContributeAttempt,
  ContributeAttemptState,
  ContributeContribution,
  ContributeContributions,
  ContributeReplyDraft,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { contributeNoticesOf, isContributePageOpen } from '@/lib/contribute/contribute-state';
import { followUpCanHelp } from '@/lib/contribute/follow-up-format';
import { AUTOPILOT_UNLOCK_AT, dayLabel, relativeLabel, timeLeftLabel, usd } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

export async function ContributionsView() {
  const [view, contributions, attempts, activity] = await Promise.all([
    loadContribute(),
    loadContributions(),
    loadAttempts(undefined, 50),
    loadContributeActivity().catch(() => null),
  ]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'me')) redirect('/contribute');
  const drafts = await loadOpenPrDrafts(contributions);
  return (
    <ContributionsScreen
      view={view}
      contributions={contributions}
      attempts={attempts}
      drafts={drafts}
      activity={activity}
    />
  );
}

/** The reply drafts of each open pull request, by its id; `undefined` for one the API does not answer. */
export type DraftsByPr = Record<string, ContributeReplyDraft[] | undefined>;

/** A posted reply stays in its pull request's row this long, with its link. */
export const POSTED_SHOWN_MS = 24 * 60 * 60 * 1000;

/**
 * The drafts a pull request's row shows: those waiting for the user (draft, failed), those being posted, and those
 * posted in the last day, so an approved reply does not vanish from where it was approved.
 */
const shownDrafts = (drafts: ContributeReplyDraft[] | undefined, now: Date) =>
  (drafts ?? []).filter(({ state, postedAt, updatedAt }) => {
    if (state === 'DRAFT' || state === 'FAILED' || state === 'POSTING') return true;
    if (state !== 'POSTED') return false;
    const at = new Date(postedAt ?? updatedAt).getTime();
    return Number.isFinite(at) && now.getTime() - at <= POSTED_SHOWN_MS;
  });

function Tile({ label, value, text, name }: { label: string; value: string; text: ReactNode; name: string }) {
  return (
    <div data-total={name} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4.5 py-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{text}</span>
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
  const toUnlock = Math.max(0, autopilot?.mergedToUnlock ?? AUTOPILOT_UNLOCK_AT - (autopilot?.mergedCount ?? merged));
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
          <span className="font-mono text-xs text-muted-foreground">
            {repoOf(attempt)} · issue #{attempt.number}
          </span>
          <Pill tone={state.tone}>{state.label}</Pill>
          {attempt.kind === 'FOLLOW_UP' ? <Pill>Follow-up</Pill> : null}
        </span>
        <span className="font-medium">
          {attempt.kind === 'FOLLOW_UP' && attempt.followUpOf
            ? `Follow-up on pull request #${attempt.followUpOf.number}`
            : attemptTitleOf(attempt)}
        </span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </div>
      <Button asChild className="min-h-10 px-4 font-semibold">
        <Link href={attemptHref(attempt.attemptId)} prefetch={false}>
          {action}
        </Link>
      </Button>
    </li>
  );
}

/** An open pull request that needs the user: what happened on it, its follow-up rounds, and its replies. */
function PrNeedsYouRow({
  contribution,
  drafts,
  followUps,
  attemptCapUsd,
  now,
}: {
  contribution: ContributeContribution;
  drafts: ContributeReplyDraft[];
  followUps: Map<string, DraftFollowUp>;
  attemptCapUsd?: number;
  now?: Date;
}) {
  const { pullRequest } = contribution;
  const url = githubUrlOf(pullRequest.url);
  return (
    <li data-pr-needs-you={pullRequest.number} className="flex flex-col gap-3 border-b px-5 py-4 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-xs text-muted-foreground">
          {contribution.nameWithOwner || 'a repo'} ·{' '}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              PR #{pullRequest.number} on GitHub ↗
            </a>
          ) : (
            `PR #${pullRequest.number}`
          )}
        </span>
        <Link
          href={attemptHref(contribution.attemptId)}
          prefetch={false}
          className="font-medium text-foreground hover:underline"
        >
          {contribution.title?.trim() || `Fix for issue #${contribution.issueNumber}`}
        </Link>
      </div>
      <PrSignals needsYou={contribution.needsYou} now={now} prId={pullRequest.prId} prNumber={pullRequest.number} />
      {followUpCanHelp(contribution.needsYou?.signals) ? (
        <FollowUpRounds followUps={contribution.followUps} pullRequest={pullRequest} attemptCapUsd={attemptCapUsd} />
      ) : null}
      {drafts.length ? (
        <ul className="-mx-5 border-t">
          {drafts.map((draft) => (
            <ReplyDraftItem
              key={draft.draftId}
              draft={draft}
              prNumber={pullRequest.number}
              followUp={followUps.get(draft.attemptId)}
              freshness={[contribution.followUps?.used ?? '', contribution.followUps?.currentAttemptId ?? ''].join('|')}
              now={now}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function NeedsYou({
  attempts,
  prs,
  drafts,
  followUps,
  attemptCapUsd,
  now,
}: {
  attempts: ContributeAttempt[];
  prs: ContributeContribution[];
  drafts: DraftsByPr;
  followUps: Map<string, DraftFollowUp>;
  attemptCapUsd?: number;
  now?: Date;
}) {
  const count = attempts.length + prs.length;
  if (!count) return null;
  return (
    <section
      aria-labelledby="needs-you"
      data-section="needs-you"
      className="overflow-hidden rounded-xl border border-warning/30 bg-card"
    >
      <h2
        id="needs-you"
        className={cn(
          HEADING.card,
          'border-b border-warning/30 bg-warning-soft px-5 py-3.5 text-warning-soft-foreground',
        )}
      >
        Needs you · {count}
      </h2>
      <ul>
        {attempts.map((attempt) => (
          <AttemptRow
            key={attempt.attemptId}
            attempt={attempt}
            action="Review"
            text={
              attempt.state === 'PENDING_AUTOSUBMIT'
                ? attempt.autosubmitAt
                  ? `Autopilot submits it ${relativeLabel(attempt.autosubmitAt, now)}, unless you stop it.`
                  : 'Autopilot submits it within the hour.'
                : attempt.submit?.lastError
                  ? attempt.submit.lastError.note
                  : `Ready ${relativeLabel(attempt.updatedAt, now)} · ${isOwnAgent(attempt) ? `made by ${costOrAgentOf(attempt, usd)}` : `cost ${usd(attempt.costUsd)}`} · waits seven days for you`
            }
          />
        ))}
        {prs.map((contribution) => (
          <PrNeedsYouRow
            key={contribution.attemptId}
            contribution={contribution}
            drafts={shownDrafts(drafts[contribution.pullRequest.prId], now ?? new Date())}
            followUps={followUps}
            attemptCapUsd={attemptCapUsd}
            now={now}
          />
        ))}
      </ul>
    </section>
  );
}

/** The user's own agent at work: checking the issue, or holding it until its lease ends, with what was asked of it. */
function ownAgentWorkText(attempt: ContributeAttempt, now?: Date): string {
  if (attempt.state === 'CLAIMING') return 'Your own agent claimed it: checking the issue on GitHub.';
  const agent = agentLabelOf(attempt.agent) ?? 'Your own agent';
  const left = timeLeftLabel(attempt.leaseUntil, now);
  const held = left ? ` · held for it for another ${left}` : '';
  const asked = attempt.changesRequested ? ' · sent back with your note' : '';
  return `${agent} is on it${held}${asked}`;
}

function InProgress({
  attempts,
  activity,
  now,
}: {
  attempts: ContributeAttempt[];
  activity?: ContributeActivity | null;
  now?: Date;
}) {
  if (!attempts.length) return null;
  return (
    <section
      aria-labelledby="in-progress"
      data-section="in-progress"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <h2 id="in-progress" className={cn(HEADING.card, 'border-b px-5 py-3.5')}>
        In progress · {attempts.length}
      </h2>
      <ul>
        {attempts.map((attempt) => (
          <AttemptRow
            key={attempt.attemptId}
            attempt={attempt}
            action="Details"
            text={
              <LiveRunPhase attemptId={attempt.attemptId} activity={activity}>
                {inProgressTextOf(attempt, now)}
              </LiveRunPhase>
            }
          />
        ))}
      </ul>
    </section>
  );
}

/** An in-progress row's own line: the submission's step, the user's own agent, or when it started and its spend. */
function inProgressTextOf(attempt: ContributeAttempt, now?: Date): string {
  return attempt.state === 'SUBMITTING' && attempt.submit
    ? `${labelOf(SUBMIT_STEP_TEXT, attempt.submit.step)}${
        attempt.submit.step === 'WAITING_CAP' && attempt.submit.waitUntil
          ? ` It goes on ${relativeLabel(attempt.submit.waitUntil, now)}.`
          : ''
      }`
    : isOwnAgent(attempt)
      ? ownAgentWorkText(attempt, now)
      : `Started ${relativeLabel(attempt.createdAt, now)} · ${usd(attempt.costUsd)} of ${usd(attempt.budgetUsd)}`;
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
        <Link href="/contribute/issues" prefetch={false} className="font-semibold text-link">
          See the issues picked for you
        </Link>
      </p>
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <table className="w-full min-w-155 border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
              <th className="px-5 py-2.5 font-medium">Pull request</th>
              <th className="px-3 py-2.5 font-medium">State</th>
              <th className="px-3 py-2.5 font-medium">Dates</th>
              <th className="py-2.5 pr-5 pl-3 text-right font-medium">Cost or agent</th>
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
                    <div className="font-mono text-xs text-muted-foreground">
                      {contribution.nameWithOwner || 'a repo'} ·{' '}
                      <PrNumberLink url={pullRequest.url} number={pullRequest.number} /> · issue #
                      {contribution.issueNumber}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PrStatePill contribution={contribution} />
                  </td>
                  <td className="px-3 py-3 align-top text-xs whitespace-nowrap text-muted-foreground">
                    <div>Opened {dayLabel(pullRequest.openedAt)}</div>
                    {ended ? (
                      <div>
                        {pullRequest.mergedAt ? 'Merged' : 'Closed'} {dayLabel(ended)}
                      </div>
                    ) : (
                      <div>{relativeLabel(pullRequest.openedAt, now)}</div>
                    )}
                  </td>
                  <td
                    data-runner={contribution.runner ?? ''}
                    className={`py-3 pr-5 pl-3 text-right align-top text-xs ${isOwnAgent(contribution) ? '' : 'font-mono'}`}
                  >
                    {costOrAgentOf(contribution, usd)}
                    {contribution.openedBy === 'HAND' ? (
                      <div className="text-muted-foreground">opened by hand</div>
                    ) : null}
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
      <h2 id="pull-requests" className={cn(HEADING.card, 'border-b px-5 py-3.5')}>
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
        <h2 className={HEADING.card}>How attempts ended</h2>
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
    ['Follow-ups pushed', count(({ state }) => state === 'DONE')],
  ];
  const stops = attempts.filter(({ state }) => state === 'STOPPED').slice(0, 3);

  return (
    <section data-section="how-attempts-ended" className="flex flex-col gap-2.5 rounded-xl border bg-card p-4.5">
      <h2 className={HEADING.card}>
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
        <ul className="flex flex-col gap-1.5 border-t pt-2.5 text-xs text-muted-foreground">
          {stops.map((attempt) => (
            <li key={attempt.attemptId}>
              <Link href={attemptHref(attempt.attemptId)} prefetch={false} className="font-mono text-foreground/80">
                {repoOf(attempt)} #{attempt.number}
              </Link>{' '}
              · {attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : 'Stopped.'} ·{' '}
              {costOrAgentOf(attempt, usd)}
            </li>
          ))}
        </ul>
      ) : null}
      {attempts.length ? (
        <Link href="/contribute/runs" prefetch={false} className="text-sm font-semibold text-link" data-see-all-runs>
          See all runs ›
        </Link>
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
  drafts = {},
  activity,
  now,
}: {
  view: ContributeView;
  contributions: ContributeContributions | undefined;
  attempts: ContributeAttempt[] | undefined;
  /** The reply drafts of the open pull requests, by pull request id. */
  drafts?: DraftsByPr;
  /** The work in progress, for the live phase of the runs in progress. */
  activity?: ContributeActivity | null;
  now?: Date;
}) {
  const spend = view.contributor?.spend;
  const needsYou = (attempts ?? []).filter(({ state }) => state === 'REVIEW' || state === 'PENDING_AUTOSUBMIT');
  const prsNeedingYou = (contributions?.items ?? []).filter(
    ({ pullRequest, needsYou: signals }) =>
      pullRequest.state === 'OPEN' &&
      (!!signals?.signals.length || shownDrafts(drafts[pullRequest.prId], now ?? new Date()).length > 0),
  );
  const followUps = new Map(
    (attempts ?? []).filter(({ kind }) => kind === 'FOLLOW_UP').map((attempt) => [attempt.attemptId, attempt]),
  );
  const inProgress = (attempts ?? []).filter(
    ({ state }) => IN_PROGRESS_STATES.includes(state) && state !== 'PENDING_AUTOSUBMIT',
  );

  return (
    <>
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <PageTitle
        title="My contributions"
        text={
          spend
            ? `This cycle: ${dayLabel(spend.cycleStart)} to ${dayLabel(spend.cycleEnd)}, ${usd(spend.cycleUsd)} used`
            : undefined
        }
      />
      <Totals view={view} contributions={contributions} />
      <NeedsYou
        attempts={needsYou}
        prs={prsNeedingYou}
        drafts={drafts}
        followUps={followUps}
        attemptCapUsd={view.contributor?.settings?.attemptCapUsd}
        now={now}
      />
      <InProgress attempts={inProgress} activity={activity} now={now} />
      <div className="flex flex-wrap items-start gap-5">
        <PullRequests contributions={contributions} now={now} />
        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          <HowAttemptsEnded attempts={attempts} />
        </aside>
      </div>
    </>
  );
}
