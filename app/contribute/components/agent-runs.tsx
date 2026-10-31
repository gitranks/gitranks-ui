'use client';

import { Bot } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState, useSyncExternalStore } from 'react';

import { useActivity } from './activity';
import { Pill } from './primitives';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  anyActive,
  durationLabel,
  eventLineOf,
  indicatorLabelOf,
  indicatorShortLabelOf,
  isSettled,
  newerActivity,
  phaseTextOf,
  quietAgentOf,
  runLinkOf,
  runRefOf,
  runsOf,
  runTitleOf,
  spendLabelOf,
  stepsOf,
} from '@/lib/contribute/agent-runs';
import { contributeActivitySnapshot, onContributeActivity } from '@/lib/contribute/changes-bus';
import type { ContributeActivity, ContributeAgentRun } from '@/lib/contribute/contribute.types';
import { cn } from '@/lib/utils';

const ME_PATH = '/contribute/me';

/**
 * The work in progress as the page read it, or as the one poll read it since, whichever is newer: the page is a sibling
 * of the tabs, so the poll's reads come through the bus (`publishContributeActivity`).
 */
export function useLiveActivity(page: ContributeActivity | null | undefined): ContributeActivity | null {
  const polled = useSyncExternalStore(onContributeActivity, contributeActivitySnapshot, () => null);
  return newerActivity(page, polled);
}

/** A dot that breathes while an agent works (solid under reduced motion), green once settled, grey while it waits. */
function LiveDot({ active, settled }: { active: boolean; settled?: boolean }) {
  return (
    <span aria-hidden="true" className="relative flex size-2 shrink-0">
      {active ? (
        <span className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-contribute-pulse" />
      ) : null}
      <span
        className={cn(
          'relative size-2 rounded-full',
          active ? 'bg-primary' : settled ? 'bg-positive' : 'bg-muted-foreground/60',
        )}
      />
    </span>
  );
}

/** The steps a run walks, the one it is on lit: a hint, not a promise of time. */
export function RunSteps({ run }: { run: Pick<ContributeAgentRun, 'phase' | 'kind' | 'active'> }) {
  const { steps, at } = stepsOf(run);
  const current = Math.min(at, steps.length - 1);
  return (
    <span className="flex items-center gap-1" data-run-steps={`${Math.min(at + 1, steps.length)}/${steps.length}`}>
      <span className="sr-only">
        {at >= steps.length ? 'All steps done' : `Step ${at + 1} of ${steps.length}: ${steps[current]}`}
      </span>
      {steps.map((step, index) => (
        <span
          key={step}
          aria-hidden="true"
          className={cn(
            'h-1 w-4 rounded-full',
            index < at
              ? 'bg-primary'
              : index === at
                ? cn('bg-primary/50', run.active && 'motion-safe:animate-pulse')
                : 'bg-muted',
          )}
        />
      ))}
    </span>
  );
}

const SETTLED_TONE = { READY: 'violet', DONE: 'green', STOPPED: 'neutral' } as const;

/** One run: repo#issue and title, its phase with the steps, how long, the spend, its latest event and the link. */
export function RunRow({ run, readAt }: { run: ContributeAgentRun; readAt: string }) {
  const settled = isSettled(run);
  const event = eventLineOf(run);
  const link = runLinkOf(run);
  const facts = [durationLabel(run.elapsedSeconds), spendLabelOf(run), quietAgentOf(run, readAt)]
    .filter(Boolean)
    .join(' · ');
  return (
    <li
      data-run={run.attemptId}
      data-phase={run.phase}
      className={cn('flex flex-col gap-1.5 px-4 py-3', settled && 'bg-muted/30')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{runRefOf(run)}</span>
        {run.kind === 'FOLLOW_UP' ? <Pill>Follow-up</Pill> : null}
        {run.runner === 'MCP' ? <Pill>Your agent</Pill> : null}
      </div>
      <span className="line-clamp-2 text-sm font-medium">{runTitleOf(run)}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {settled ? (
          <Pill tone={SETTLED_TONE[run.phase as keyof typeof SETTLED_TONE]}>{phaseTextOf(run)}</Pill>
        ) : (
          <span className="flex items-center gap-2 font-medium text-foreground">
            <LiveDot active={run.active} />
            {phaseTextOf(run)}
          </span>
        )}
        {settled ? null : <RunSteps run={run} />}
        {facts ? <span className="text-muted-foreground tabular-nums">{facts}</span> : null}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{event}</span>
        <Link
          href={link.href}
          prefetch={false}
          className="inline-flex min-h-8 shrink-0 items-center text-xs font-semibold text-link hover:underline"
        >
          {link.label} →
        </Link>
      </div>
    </li>
  );
}

function RunList({ runs, readAt }: { runs: readonly ContributeAgentRun[]; readAt: string }) {
  return (
    <ul className="flex flex-col divide-y">
      {runs.map((run) => (
        <RunRow key={run.attemptId} run={run} readAt={readAt} />
      ))}
    </ul>
  );
}

/**
 * The header's "N agents working", on every tab: nothing with no runs; a dot that breathes while an agent works. A click
 * opens the runs.
 */
export function AgentRunsIndicator() {
  const activity = useActivity();
  const [open, setOpen] = useState(false);
  // Open, it stays while its last run leaves, so the focus inside it never falls to the page.
  if (!runsOf(activity).length && !open) return null;
  return <AgentRunsIndicatorView activity={activity} open={open} onOpenChange={setOpen} />;
}

export function AgentRunsIndicatorView({
  activity,
  open,
  onOpenChange,
}: {
  activity: ContributeActivity | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const runs = runsOf(activity);
  const active = anyActive(runs);
  const label = indicatorLabelOf(runs) || 'No agents at work';
  const settled = runs.every(isSettled);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-agent-runs={active ? 'working' : settled ? 'settled' : 'waiting'}
          className={cn(
            'flex min-h-9 shrink-0 items-center gap-2 rounded-full border bg-card px-3 text-xs font-medium whitespace-nowrap text-foreground outline-none',
            'hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50',
            active && 'border-primary/40',
          )}
        >
          <LiveDot active={active} settled={settled && runs.length > 0} />
          <Bot aria-hidden="true" className="size-3.5 text-muted-foreground max-sm:hidden" />
          {/* The name is the words shown: the short ones on a phone, so a spoken "click 2 working" finds it. */}
          <span className="max-sm:hidden">{label}</span>
          <span className="sm:hidden">{indicatorShortLabelOf(runs) || label}</span>
          <span className="sr-only">: show the agent runs</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="w-[min(26rem,calc(100vw-2rem))] p-0"
        data-agent-runs-sheet=""
        aria-label="Agent runs"
      >
        <AgentRunsSheet activity={activity} />
      </PopoverContent>
    </Popover>
  );
}

/** What the header's indicator opens: every run, and the way to My contributions. */
export function AgentRunsSheet({ activity }: { activity: ContributeActivity | null }) {
  const runs = runsOf(activity);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <span className="text-sm font-semibold">Agent runs</span>
        <Link href={ME_PATH} prefetch={false} className="text-xs font-semibold text-link hover:underline">
          My contributions →
        </Link>
      </div>
      <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
        {activity && runs.length ? (
          <RunList runs={runs} readAt={activity.readAt} />
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">No agents at work right now.</p>
        )}
      </div>
    </>
  );
}

/** Overview's "Working now": the runs, live from the poll; nothing with none. */
export function WorkingNowSection({ activity }: { activity: ContributeActivity | null | undefined }) {
  const live = useLiveActivity(activity);
  if (!live?.runs.length) return null;
  return <WorkingNowView activity={live} />;
}

export function WorkingNowView({ activity }: { activity: ContributeActivity }) {
  const { runs } = activity;
  const working = runs.filter(({ active }) => active).length;
  return (
    <section aria-labelledby="overview-working" data-overview-section="working" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="overview-working" className="text-xl font-semibold tracking-tight">
          Working now
        </h2>
        <span className="text-sm text-muted-foreground">{indicatorLabelOf(runs)}</span>
      </div>
      <div className={cn('overflow-hidden rounded-xl border bg-card', working && 'border-primary/30')}>
        <RunList runs={runs} readAt={activity.readAt} />
      </div>
    </section>
  );
}

/**
 * My contributions' row of an attempt an agent works on: its live phase and steps from the runs, or `children` (the
 * row's own line) when the runs do not list it.
 */
export function LiveRunPhase({
  attemptId,
  activity,
  children,
}: {
  attemptId: string;
  activity: ContributeActivity | null | undefined;
  children: ReactNode;
}) {
  const run = runsOf(useLiveActivity(activity)).find((item) => item.attemptId === attemptId);
  if (!run) return <>{children}</>;
  return <LiveRunPhaseView run={run}>{children}</LiveRunPhaseView>;
}

export function LiveRunPhaseView({ run, children }: { run: ContributeAgentRun; children: ReactNode }) {
  const event = eventLineOf(run);
  // The row's own line says the submission's step and the own agent's hold; a hosted run's time and spend are fresher here.
  const facts =
    run.runner === 'MCP' || run.phase === 'SUBMITTING'
      ? children
      : [durationLabel(run.elapsedSeconds), spendLabelOf(run)].filter(Boolean).join(' · ');
  return (
    <span className="flex flex-col gap-1" data-live-phase={run.phase}>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <LiveDot active={run.active} settled={isSettled(run)} />
          {phaseTextOf(run)}
        </span>
        {isSettled(run) ? null : <RunSteps run={run} />}
        <span className="tabular-nums">{facts}</span>
      </span>
      {event ? <span className="truncate">{event}</span> : null}
    </span>
  );
}
