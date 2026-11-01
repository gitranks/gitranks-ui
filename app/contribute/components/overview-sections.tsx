import { CheckIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LiveRunsLabel, RightNowLanes } from './agent-runs';
import { ComingSoon } from './coming-soon';
import { noticeCopyOf } from './contribute-notices';
import { LiveUpNext } from './live-issues';
import { PauseButton } from './pause-button';
import { HEADING, Meter, Pill } from './primitives';
import { attemptHref } from './reviews-ready';
import { StillRanking } from './still-ranking';
import { Skeleton } from '@/components/ui/skeleton';
import { AGENT_HELLO_PROMPT } from '@/lib/contribute/agent-connect';
import { AGENT_NAMES, attemptTitleOf, isOwnAgent, repoOf, type Tone } from '@/lib/contribute/attempt-format';
import type {
  ContributeActivity,
  ContributeAttempt,
  ContributeComingSoonProvider,
  ContributeImpactTotals,
  ContributeIssuePage,
  ContributeKeyState,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { CONNECT_AGENT_PATH, CONNECT_KEY_PATH, RUNS_PATH } from '@/lib/contribute/contribute-path';
import { claudeKeyOf } from '@/lib/contribute/contribute-state';
import { dayLabel, maskedKey, planOf, relativeLabel, usd } from '@/lib/contribute/format';
import {
  type HostedState,
  impactTilesOf,
  lastUsedTokenOf,
  type NeedsYouRow,
  needsYouRowsOf,
  type OverviewNeedsRead,
  type OverviewNowRead,
  type OwnAgentState,
  rankedOf,
  rightNowOf,
  UP_NEXT_PICKS,
} from '@/lib/contribute/overview';
import { settingsPathOf } from '@/lib/contribute/settings-paths';
import { cn } from '@/lib/utils';

const ME_PATH: Route = '/contribute/me';
const ISSUES_PATH: Route = '/contribute/issues';
const settingsAt = settingsPathOf;

/** The sections rise in one after another; never with reduced motion. */
const RISE =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-450 motion-safe:ease-out motion-safe:fill-mode-both';

/** An action in a link's colour, tall enough to tap. */
const ACTION_LINK = 'inline-flex min-h-10 items-center self-start text-sm font-semibold text-link max-sm:min-h-11';

/** A row's action, as a button: full width under the row on a phone. */
const ROW_ACTION = cn(
  'inline-flex min-h-10 flex-none items-center justify-center rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90',
  'max-sm:min-h-11 max-sm:w-full',
);

const CARD = 'flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4';

function SectionHeader({
  id,
  title,
  link,
  aside,
}: {
  id: string;
  title: string;
  link?: { href: Route; label: string };
  /** A few words beside the link. */
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 id={id} className={HEADING.section}>
        {title}
      </h2>
      <div className="flex items-center gap-4">
        {aside}
        {link ? (
          <Link href={link.href} prefetch={false} className={ACTION_LINK}>
            {link.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** A line in place of a section's content: its read did not answer, or there is nothing in it yet. */
function SectionNote({ children, name }: { children: ReactNode; name: string }) {
  return (
    <div data-note={name} className="rounded-xl border border-dashed px-4.5 py-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Needs you

const repliesText = (count: number) => (count === 1 ? 'a reply' : `${count} replies`);
/** A follow-up's drafts that are part of its review: "with 2 replies". */
const foldedText = (count: number) => `with ${count === 1 ? '1 reply' : `${count} replies`}`;
const withReplies = (count: number) => (count ? `, ${foldedText(count)}` : '');

/** The issue a review is about, or the pull request a follow-up works on. */
const workOf = (attempt: ContributeAttempt) =>
  attempt.kind === 'FOLLOW_UP' && attempt.followUpOf
    ? `Follow-up on PR #${attempt.followUpOf.number}`
    : attemptTitleOf(attempt);

/**
 * What a review cost, or, made by the user's own agent, which agent made it. Whose it is unanswered and nothing
 * spent, it may be the agent's, which spends nothing through us: no "$0", the cost is left out.
 */
const madeOf = (attempt: ContributeAttempt): string | null => {
  if (isOwnAgent(attempt)) {
    return `made by ${attempt.agent ? (AGENT_NAMES[attempt.agent.name] ?? attempt.agent.name) : 'your own agent'}`;
  }
  if (attempt.runner === undefined && !(attempt.costUsd > 0)) return null;
  return usd(attempt.costUsd);
};

type RowCopy = {
  kind: string;
  tone: Tone;
  where: string | null;
  what: string;
  action: string;
  href: Route;
  label: string;
};

/** What a row says, and the one action it offers. */
export function needsRowCopyOf(row: NeedsYouRow, now = new Date()): RowCopy {
  switch (row.kind) {
    case 'key':
      return {
        kind: 'Key refused',
        tone: 'red',
        where: `Claude key ${maskedKey(row.last4)}`,
        what: 'Anthropic refused it. Nothing starts until you connect a working one.',
        action: 'Connect a new key',
        href: CONNECT_KEY_PATH,
        label: 'Connect a new Claude key',
      };
    case 'no-way':
      return {
        kind: 'Not set up',
        tone: 'neutral',
        where: null,
        what: 'Nothing runs until you connect your Claude key or your own agent.',
        action: 'Add your Claude key',
        href: CONNECT_KEY_PATH,
        label: 'Add your Claude key',
      };
    case 'grant': {
      const where = `${repoOf(row.attempt)} #${row.attempt.number}`;
      const note = row.attempt.submit?.lastError?.note?.trim() || 'GitHub access is needed to open the PR.';
      return {
        kind: 'GitHub access',
        tone: 'amber',
        where: `${repoOf(row.attempt)} · #${row.attempt.number}`,
        what: row.replies ? `${note} (${foldedText(row.replies)})` : note,
        action: 'Allow GitHub access',
        href: attemptHref(row.attempt.attemptId),
        label: `Allow GitHub access for ${where}`,
      };
    }
    case 'autopilot': {
      const when = relativeLabel(row.attempt.autosubmitAt, now) || 'an hour after emailing you';
      return {
        kind: 'Autopilot',
        tone: 'amber',
        where: `${repoOf(row.attempt)} · #${row.attempt.number}`,
        what: `Submits ${when}${row.replies ? `, ${foldedText(row.replies)},` : ''} unless you stop it.`,
        action: 'Review',
        href: attemptHref(row.attempt.attemptId),
        label: `Review ${repoOf(row.attempt)} #${row.attempt.number}`,
      };
    }
    case 'review': {
      const ready = row.attempt.reviewAt ? relativeLabel(row.attempt.reviewAt, now) : '';
      return {
        kind: 'Review ready',
        tone: 'violet',
        where: `${repoOf(row.attempt)} · #${row.attempt.number}`,
        what:
          [workOf(row.attempt), ready ? `ready ${ready}` : null, madeOf(row.attempt)].filter(Boolean).join(' · ') +
          withReplies(row.replies),
        action: 'Review',
        href: attemptHref(row.attempt.attemptId),
        label: `Review ${repoOf(row.attempt)} #${row.attempt.number}`,
      };
    }
    case 'replies': {
      const repo = row.nameWithOwner || 'a repo';
      const authors = new Set(row.drafts.map(({ comment }) => comment?.author ?? null));
      const [author] = authors;
      const to = authors.size === 1 && author ? `@${author}` : 'the maintainers';
      return {
        kind: 'Reply to approve',
        tone: 'amber',
        where: `${repo} · PR #${row.prNumber}`,
        what: `Your agent drafted ${repliesText(row.drafts.length)} to ${to}`,
        action: 'Approve reply',
        href: attemptHref(row.attemptId),
        label: `Approve the reply on ${repo} PR #${row.prNumber}`,
      };
    }
  }
}

const rowKeyOf = (row: NeedsYouRow) =>
  row.kind === 'replies' ? `replies-${row.attemptId}` : 'attempt' in row ? row.attempt.attemptId : row.kind;

const UNCHECKED = (
  <>
    We couldn&apos;t check everything right now.{' '}
    <Link href={ME_PATH} prefetch={false} className="font-semibold text-link">
      My contributions →
    </Link>
  </>
);

/**
 * "Needs you": what waits for the user, one row each, at most five. The all-clear only when every read answered; with
 * one failed and no rows, it says it could not check everything.
 */
export function NeedsYouSection({ view, read, now }: { view: ContributeView; read: OverviewNeedsRead; now?: Date }) {
  const { rows, total, complete } = needsYouRowsOf(view, read);

  if (!rows.length) {
    return (
      <section
        aria-labelledby="overview-needs"
        data-needs={complete ? 'clear' : 'unchecked'}
        className={cn('flex items-center gap-2.5 rounded-xl border px-4.5 py-4 text-sm text-foreground/80', RISE)}
      >
        <h2 id="overview-needs" className="sr-only">
          Needs you
        </h2>
        {complete ? (
          <>
            <CheckIcon aria-hidden="true" strokeWidth={2.4} className="size-4.5 flex-none text-positive" />
            <p>
              <span className="font-semibold text-foreground">Nothing needs you right now.</span> A review shows up here
              and in My contributions the moment it&apos;s ready.
            </p>
          </>
        ) : (
          <p>{UNCHECKED}</p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="overview-needs"
      data-needs={total}
      className={cn('flex flex-col gap-3 rounded-xl border border-primary/20 bg-brand-soft p-4.5', RISE)}
    >
      <h2 id="overview-needs" className={HEADING.card}>
        {total === 1 ? '1 thing needs you' : `${total} things need you`}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const copy = needsRowCopyOf(row, now);
          return (
            <li
              key={rowKeyOf(row)}
              data-row={row.kind}
              className="flex items-center gap-3 rounded-lg border bg-background px-3.5 py-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-2"
            >
              <Pill tone={copy.tone}>{copy.kind}</Pill>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                {copy.where ? (
                  <span className="truncate font-mono text-xs text-muted-foreground">{copy.where}</span>
                ) : null}
                <span className="text-sm font-medium">{copy.what}</span>
              </span>
              <Link href={copy.href} prefetch={false} aria-label={copy.label} className={ROW_ACTION}>
                {copy.action}
              </Link>
            </li>
          );
        })}
      </ul>
      {total > rows.length ? (
        <Link href={ME_PATH} prefetch={false} className={ACTION_LINK} data-needs-more={total - rows.length}>
          and {total - rows.length} more in My contributions →
        </Link>
      ) : null}
      {complete ? null : <p className="text-sm text-muted-foreground">{UNCHECKED}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Right now

type CardCopy = { label: string; title: string; text?: string; action?: ReactNode; busy?: boolean };

const settingsLink = (anchor: string, label: string) => (
  <Link href={settingsAt(anchor)} prefetch={false} className={ACTION_LINK}>
    {label} →
  </Link>
);

const capitalized = (text: string) => (text ? `${text[0].toUpperCase()}${text.slice(1)}` : text);

const WORKING_LABELS: Partial<Record<ContributeAttempt['state'], string>> = {
  CLAIMING: 'Starting',
  RUNNING: 'Working',
  CHECKS: 'Checking',
};

/** The hosted agent's card: what it does now, or what holds its next attempt. */
export function hostedCopyOf(state: HostedState, now = new Date()): CardCopy {
  switch (state.kind) {
    case 'working': {
      const { attempt } = state;
      const started = relativeLabel(attempt.createdAt, now);
      return {
        label: WORKING_LABELS[attempt.state] ?? 'Working',
        busy: true,
        title:
          attempt.kind === 'FOLLOW_UP' && attempt.followUpOf
            ? `Follow-up on PR #${attempt.followUpOf.number}`
            : `${repoOf(attempt)} #${attempt.number} · ${attemptTitleOf(attempt)}`,
        text: `${started ? `Started ${started}, on your key.` : 'On your key.'} It shows up under Needs you when it is ready.`,
      };
    }
    case 'closed':
      return {
        label: 'Waiting',
        title: "Contribute isn't open yet",
        text: 'Your agent starts on one of your top picks when Contribute opens.',
      };
    case 'paused':
      return {
        label: 'Paused',
        title: 'Contributing is paused',
        text: 'No attempt starts until you resume. Your picks and settings are kept.',
        action: (
          <div className="flex [&>div]:items-start">
            <PauseButton paused />
          </div>
        ),
      };
    // Needs you holds the way to a new key; this says only why nothing starts.
    case 'key-invalid':
      return {
        label: 'Stopped',
        title: 'Your Claude key stopped working',
        text: 'Nothing starts until you connect a working one, under Needs you.',
      };
    case 'key-waiting': {
      const notice = noticeCopyOf({
        kind: state.reason === 'EXHAUSTED' ? 'exhausted' : 'limit-reached',
        until: state.until,
      });
      return { label: 'Waiting', title: notice.title, text: typeof notice.text === 'string' ? notice.text : undefined };
    }
    case 'slots-taken':
      return {
        label: 'Waiting',
        title:
          state.slots > 1 ? `Your own agent holds all ${state.slots} of your slots` : 'Your own agent holds your slot',
        text: 'A new attempt starts when it hands back its patch or releases the issue.',
        action: settingsLink('more-limits', 'Attempts at a time in Settings'),
      };
    case 'pr-cap':
      return {
        label: 'Waiting',
        title: 'At your open PRs cap',
        text: `${state.prBound} of ${state.cap} pull requests are open or on their way. The next attempt starts when one is merged, closed or discarded.`,
        action: settingsLink('prs', 'Open PRs at a time in Settings'),
      };
    case 'nothing-queued':
      return {
        label: 'Waiting',
        title: 'Nothing queued',
        text: 'Your pacing is "Only issues I queue", and none is queued.',
        action: settingsLink('pacing', 'Pacing in Settings'),
      };
    case 'no-room':
      return {
        label: 'Next attempt',
        title: 'None can start',
        text: 'Your caps leave no room for one attempt.',
        action: settingsLink('more-limits', 'Raise them in Settings'),
      };
    case 'paced':
      return {
        label: 'Next attempt',
        title: capitalized(relativeLabel(state.at, now)) || 'Later this cycle',
        text: 'Paced across your cycle, on one of your top picks.',
      };
    case 'no-issues':
      return {
        label: 'Next attempt',
        title: "Once there's an issue for you",
        text: "We're still finding issues for you.",
      };
    case 'soon':
      return {
        label: 'Next attempt',
        title: 'Soon',
        text: 'Your agent starts on one of your top picks, usually within minutes.',
      };
    case 'unknown':
      return { label: 'Next attempt', title: "We can't check your agent right now." };
  }
}

const lastCall = (at: string | null, now: Date) => (at ? `last call ${relativeLabel(at, now)}` : null);

/** The own agent's lane: the issue it holds, or what it can do next. The lane names the agent, so the label is its state. */
export function ownAgentCopyOf(state: OwnAgentState, now = new Date()): CardCopy {
  switch (state.kind) {
    case 'holding': {
      const { attempt } = state;
      const issue = `${repoOf(attempt)} #${attempt.number}`;
      const title =
        attempt.state === 'CLAIMING'
          ? `Claiming ${issue}`
          : attempt.state === 'CHECKS'
            ? `Checking the patch for ${issue}`
            : `Holding ${issue}`;
      const who = [state.agent ?? 'Your agent', lastCall(state.lastCallAt, now)].filter(Boolean).join(' · ');
      const until = attempt.leaseUntil ? ` Held for you until ${dayLabel(attempt.leaseUntil)}.` : '';
      return {
        label: WORKING_LABELS[attempt.state] ?? 'Working',
        title: `${title}${attempt.changesRequested ? ' · sent back with your note' : ''}`,
        text: `${who}.${until}`,
      };
    }
    case 'idle':
      return {
        label: 'Idle',
        title: 'No issue held',
        text: `${state.token} · ${lastCall(state.lastCallAt, now)}. Ask it to "${AGENT_HELLO_PROMPT}".`,
      };
    case 'never-called':
      return { label: 'Waiting', title: "Your agent hasn't called yet", text: `Ask it to "${AGENT_HELLO_PROMPT}".` };
    case 'paused':
      return {
        label: 'Paused',
        title: 'Contributing is paused',
        text: "Your agent can't claim an issue until you resume.",
      };
    case 'unknown': {
      const known = [state.token, lastCall(state.lastCallAt, now)].filter(Boolean).join(' · ');
      return { label: 'Unknown', title: "We can't check your agent right now.", text: known ? `${known}.` : undefined };
    }
  }
}

function NowCard({
  copy,
  name,
  status = false,
  lane = false,
  children,
}: {
  copy: CardCopy;
  name: string;
  /** Its label is announced when the page reads itself again. */
  status?: boolean;
  /** Inside a lane of Right now's agents, which is the card. */
  lane?: boolean;
  children?: ReactNode;
}) {
  return (
    <div data-now={name} className={lane ? 'flex min-w-0 flex-col gap-1.5 px-4 py-3.5' : CARD}>
      <span role={status ? 'status' : undefined} className="flex items-center gap-2 text-xs font-semibold text-primary">
        {copy.busy ? (
          <span
            aria-hidden="true"
            className="size-3 flex-none rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin"
          />
        ) : null}
        {copy.label}
      </span>
      <span className="font-semibold">{copy.title}</span>
      {copy.text ? <span className="text-sm text-muted-foreground">{copy.text}</span> : null}
      {children}
      {copy.action ?? null}
    </div>
  );
}

/** The cycle's card: spent of the cap, when it renews, and the meter. */
function CycleCard({ view }: { view: ContributeView }) {
  const spend = view.contributor?.spend;
  const settings = view.contributor?.settings;
  if (!spend || !settings) return <NowCard name="cycle" copy={{ label: 'This cycle', title: 'No spend yet' }} />;
  return (
    <NowCard
      name="cycle"
      copy={{
        label: 'This cycle',
        title: `${usd(spend.cycleUsd)} of ${usd(settings.cycleCapUsd)}`,
        text: `Renews ${dayLabel(spend.cycleEnd)} · the most an attempt can spend is ${usd(settings.attemptCapUsd)}.`,
      }}
    >
      <Meter value={spend.cycleUsd} max={settings.cycleCapUsd} label="Spent this cycle" />
    </NowCard>
  );
}

/** Paused with both ways set up: one line for both lanes, in place of each saying it. */
const PAUSED_BOTH: CardCopy = {
  label: 'Paused',
  title: 'Contributing is paused',
  text: "No attempt starts on your key, and your own agent can't claim an issue, until you resume. Your picks and settings are kept.",
};

/**
 * "Right now": the agents, a lane each (the one we run on the user's key, the user's own agent) with their live runs or
 * what holds them, and the cycle's spend beside them. The runs come from the poll, so a run that ends leaves its lane
 * without a reload; the holds are as the page read them.
 */
export function RightNowSection({
  view,
  read,
  page,
  activity,
  now,
}: {
  view: ContributeView;
  read: OverviewNowRead;
  page: ContributeIssuePage | null | undefined;
  /** The agent runs, as the page read them. */
  activity?: ContributeActivity | null;
  now?: Date;
}) {
  const state = rightNowOf(view, read, page, now);
  const none = !state.hosted && !state.ownAgent;
  const hostedCopy = state.hosted ? hostedCopyOf(state.hosted, now) : undefined;
  const bothPaused = state.hosted?.kind === 'paused' && (!state.ownAgent || state.ownAgent.kind === 'paused');

  return (
    <section
      aria-labelledby="overview-now"
      data-hosted={state.hosted?.kind}
      data-own-agent={state.ownAgent?.kind}
      className={cn('flex flex-col gap-3', RISE, 'motion-safe:delay-100')}
    >
      <SectionHeader
        id="overview-now"
        title="Right now"
        aside={<LiveRunsLabel activity={activity} />}
        link={{ href: RUNS_PATH, label: 'All runs →' }}
      />
      <div className={cn('grid items-start gap-4', state.cycle && 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
        <RightNowLanes
          activity={activity}
          hosted={hostedCopy ? <NowCard lane name="hosted" status copy={hostedCopy} /> : undefined}
          ownAgent={
            state.ownAgent ? <NowCard lane name="own-agent" copy={ownAgentCopyOf(state.ownAgent, now)} /> : undefined
          }
          paused={
            bothPaused && hostedCopy ? (
              <NowCard
                lane
                name="hosted"
                status
                copy={state.ownAgent ? { ...hostedCopy, ...PAUSED_BOTH } : hostedCopy}
              />
            ) : undefined
          }
          none={
            none ? (
              <NowCard
                lane
                name="none"
                copy={
                  view.ownAgent === undefined
                    ? { label: 'Your agent', title: "We can't check your agent right now." }
                    : {
                        label: 'Your agent',
                        title: 'Nothing runs yet',
                        text: 'Add your Claude key or connect your own agent, under Ways you contribute.',
                      }
                }
              />
            ) : undefined
          }
        />
        {state.cycle ? <CycleCard view={view} /> : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Your impact

/** "Your impact": four tiles, and the way to My contributions. */
export function ImpactSection({ view, totals }: { view: ContributeView; totals: ContributeImpactTotals | undefined }) {
  const tiles = impactTilesOf(view, totals);
  return (
    <section aria-labelledby="overview-impact" className={cn('flex flex-col gap-3', RISE, 'motion-safe:delay-200')}>
      <SectionHeader id="overview-impact" title="Your impact" link={{ href: ME_PATH, label: 'My contributions →' }} />
      {tiles ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map(({ name, value, label }) => (
            <div
              key={name}
              data-tile={name}
              className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3.5"
            >
              <span className="text-2xl font-bold">{value}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <SectionNote name="totals">Your totals are not available yet.</SectionNote>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Ways you contribute

type WayCopy = {
  title: string;
  state?: { label: string; tone: Tone };
  text: string;
  action: { href: Route; label: string };
  dashed?: boolean;
};

const KEY_STATES: Record<ContributeKeyState, { label: string; tone: Tone }> = {
  VALID: { label: 'Connected', tone: 'green' },
  INVALID: { label: 'Refused', tone: 'amber' },
  EXHAUSTED: { label: 'Waiting', tone: 'amber' },
  LIMIT_REACHED: { label: 'Waiting', tone: 'amber' },
};

const NOT_SET_UP = { label: 'Not set up', tone: 'neutral' as const };

/** The Claude key's card: connected (or refused, or waiting), or not set up. */
export function keyWayOf(view: ContributeView): WayCopy {
  const key = claudeKeyOf(view);
  if (!key) {
    return {
      title: 'Your Claude key',
      state: NOT_SET_UP,
      text: "We run the agent on your plan's API credits, in a sandbox. About two minutes.",
      action: { href: CONNECT_KEY_PATH, label: 'Add your Claude key →' },
      dashed: true,
    };
  }
  const plan = planOf(view.contributor?.plan)?.title;
  const cap = view.contributor?.settings?.cycleCapUsd;
  return {
    title: 'Your Claude key',
    state: KEY_STATES[key.state] ?? KEY_STATES.VALID,
    text: [plan, `ends in ${maskedKey(key.last4)}`, typeof cap === 'number' ? `up to ${usd(cap)} a month` : null]
      .filter(Boolean)
      .join(' · '),
    action: { href: settingsAt('access'), label: 'Manage in Settings →' },
  };
}

/** The own agent's card: connected with a live token, or not set up; unread, it says so. */
export function agentWayOf(view: ContributeView, now = new Date()): WayCopy {
  const own = view.ownAgent;
  if (!own) {
    return {
      title: 'Your own agent',
      text: "We can't check your agent right now.",
      action: { href: settingsAt('own-agent'), label: 'Settings →' },
    };
  }
  if (!own.paths.mcp) {
    return {
      title: 'Your own agent',
      state: NOT_SET_UP,
      text: 'Claude Code, Codex, Cursor or Gemini CLI asks GitRanks for an issue. About a minute.',
      action: { href: CONNECT_AGENT_PATH, label: 'Connect your own agent →' },
      dashed: true,
    };
  }
  const last = lastUsedTokenOf(own.tokens);
  const live = own.tokens.length;
  return {
    title: 'Your own agent',
    state: { label: 'Connected', tone: 'green' },
    text: [
      (last ?? own.tokens[0])?.name,
      live ? `${live} ${live === 1 ? 'token' : 'tokens'} live` : null,
      last?.lastUsedAt ? `last call ${relativeLabel(last.lastUsedAt, now)}` : 'no call yet',
    ]
      .filter(Boolean)
      .join(' · '),
    action: { href: settingsAt('own-agent'), label: 'Manage in Settings →' },
  };
}

function WayCard({ copy, name }: { copy: WayCopy; name: string }) {
  return (
    <div
      data-way={name}
      data-way-state={copy.state?.label ?? 'unknown'}
      className={cn(CARD, copy.dashed && 'border-dashed')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{copy.title}</span>
        {copy.state ? <Pill tone={copy.state.tone}>{copy.state.label}</Pill> : null}
      </div>
      <span className="text-sm text-foreground/80">{copy.text}</span>
      <Link href={copy.action.href} prefetch={false} className={ACTION_LINK}>
        {copy.action.label}
      </Link>
    </div>
  );
}

/** "Ways you contribute": the Claude key, the user's own agent, and the providers that are coming. */
export function WaysSection({
  view,
  noted,
  now,
}: {
  view: ContributeView;
  noted: readonly ContributeComingSoonProvider[];
  now?: Date;
}) {
  return (
    <section aria-labelledby="overview-ways" className={cn('flex flex-col gap-3', RISE, 'motion-safe:delay-300')}>
      <SectionHeader id="overview-ways" title="Ways you contribute" />
      <div className="grid gap-4 sm:grid-cols-2">
        <WayCard name="key" copy={keyWayOf(view)} />
        <WayCard name="own-agent" copy={agentWayOf(view, now)} />
      </div>
      <ComingSoon viewer="signed-in" noted={noted} variant="compact" />
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Up next

/**
 * "Up next": the top of the feed, each with why it was picked. No Skip here: that is on Issues. Live: a pick taken
 * meanwhile says so and leaves, and the next one takes its place.
 */
export function UpNextSection({ page }: { page: ContributeIssuePage | null | undefined }) {
  const empty = <SectionNote name="empty">We&apos;re still finding issues for you.</SectionNote>;
  let body: ReactNode;
  if (page === undefined) {
    body = <SectionNote name="unavailable">Your picks are not available right now.</SectionNote>;
  } else if (page && !page.computedAt) {
    body = <StillRanking />;
  } else if (!page?.items.length) {
    body = empty;
  } else {
    body = (
      <LiveUpNext items={rankedOf(page)} total={page.total} next={page.next} limit={UP_NEXT_PICKS} empty={empty} />
    );
  }

  return (
    <section
      aria-labelledby="overview-next"
      data-up-next={
        page === undefined ? 'unavailable' : page && !page.computedAt ? 'ranking' : (page?.items.length ?? 0)
      }
      className={cn('flex flex-col gap-3', RISE, 'motion-safe:delay-150')}
    >
      <SectionHeader id="overview-next" title="Up next" link={{ href: ISSUES_PATH, label: 'All picks in Issues →' }} />
      {body}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// While a section reads

/** A section's place while it reads, about its height. */
export function SectionSkeleton({ className }: { className: string }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className={cn('w-full rounded-xl motion-reduce:animate-none', className)} />
    </div>
  );
}
