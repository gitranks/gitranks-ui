'use client';

import { Bot, Cloud, SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useSyncExternalStore } from 'react';

import { useActivity } from './activity';
import { Pill } from './primitives';
import { Tab } from '@/components/tabs/tabs';
import {
  durationLabel,
  eventLineOf,
  indicatorLabelOf,
  isSettled,
  laneRunsOf,
  newerActivity,
  phaseTextOf,
  quietAgentOf,
  runLinkOf,
  runRefOf,
  runsOf,
  runsTabMarkOf,
  runTitleOf,
  spendLabelOf,
  stepsOf,
} from '@/lib/contribute/agent-runs';
import { contributeActivitySnapshot, onContributeActivity } from '@/lib/contribute/changes-bus';
import type { ContributeActivity, ContributeAgentRun } from '@/lib/contribute/contribute.types';
import { RUNS_PATH } from '@/lib/contribute/contribute-path';
import { cn } from '@/lib/utils';

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
      className={cn(
        // A phone stacks the issue, the phase and its facts, then the event beside the link; wider, the issue and its
        // event take the left, the phase, the facts and the link the right.
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 text-xs',
        "[grid-template-areas:'ref_ref''title_title''phase_phase''facts_facts''event_link']",
        "sm:grid-cols-[minmax(0,1fr)_15rem] sm:gap-x-6 sm:[grid-template-areas:'ref_phase''title_facts''event_link']",
        settled && 'bg-muted/30',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 [grid-area:ref]">
        <span className="min-w-0 truncate font-mono text-muted-foreground">{runRefOf(run)}</span>
        {run.kind === 'FOLLOW_UP' ? <Pill>Follow-up</Pill> : null}
        {run.runner === 'MCP' ? <Pill>Your agent</Pill> : null}
      </div>
      <span className="line-clamp-2 self-start text-sm font-medium [grid-area:title]">{runTitleOf(run)}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 [grid-area:phase]">
        {settled ? (
          <Pill tone={SETTLED_TONE[run.phase as keyof typeof SETTLED_TONE]}>{phaseTextOf(run)}</Pill>
        ) : (
          <span className="flex items-center gap-2 font-medium text-foreground">
            <LiveDot active={run.active} />
            {phaseTextOf(run)}
          </span>
        )}
        {settled ? null : <RunSteps run={run} />}
      </div>
      {facts ? <span className="self-start text-muted-foreground tabular-nums [grid-area:facts]">{facts}</span> : null}
      <span className="min-w-0 truncate text-muted-foreground [grid-area:event]">{event}</span>
      <Link
        href={link.href}
        prefetch={false}
        className="inline-flex min-h-8 shrink-0 items-center justify-self-end font-semibold text-link hover:underline [grid-area:link] sm:justify-self-start"
      >
        {link.label} →
      </Link>
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
 * The robot tab, at the end of Contribute's tabs and held there while a phone's tabs scroll: every agent run, live and
 * past. While agents work it spins and counts them; with runs queued, quiet or waiting for the user, a grey dot and
 * their count; else the robot alone. Its name says the same in words.
 */
export function AgentRunsTab() {
  return (
    <Tab
      href={RUNS_PATH}
      // On a phone the tabs scroll under it; its ground stops a pixel short, so the bar's line runs on under it.
      className="sticky right-0 ms-auto bg-no-repeat max-sm:bg-linear-to-b max-sm:from-background max-sm:to-background max-sm:bg-size-[100%_calc(100%-1px)]"
    >
      <AgentRunsTabLabel runs={runsOf(useActivity())} />
    </Tab>
  );
}

export function AgentRunsTabLabel({ runs }: { runs: readonly ContributeAgentRun[] }) {
  const { working, waiting, label } = runsTabMarkOf(runs);
  const count = working || waiting;
  return (
    <span
      className="inline-flex items-center gap-1.5 align-middle"
      title={label ? `Agent runs · ${label}` : 'Agent runs'}
      data-agent-runs={working ? 'working' : waiting ? 'waiting' : 'none'}
    >
      <Bot aria-hidden="true" className="size-4.5" />
      <span className="sr-only">{label ? `Agent runs: ${label}` : 'Agent runs'}</span>
      {working ? (
        <span
          aria-hidden="true"
          className="size-3 flex-none rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin"
        />
      ) : waiting ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/60" />
      ) : null}
      {count ? (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-semibold tabular-nums',
            working ? 'bg-brand-soft text-brand-soft-foreground' : 'bg-muted text-foreground/70',
          )}
        >
          {count}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Right now's few words beside its heading, live, of the runs its lanes show: "2 agents working"; with none read, `idle`
 * ("No agent at work"), or nothing.
 */
export function LiveRunsLabel({ activity, idle }: { activity: ContributeActivity | null | undefined; idle?: string }) {
  const live = useLiveActivity(activity);
  const { hosted, own } = laneRunsOf(runsOf(live));
  // Idle only once the runs are read: unread, nothing says none is at work.
  const label = runsTabMarkOf([...hosted, ...own]).label || (live ? idle : undefined);
  return label ? <span className="text-sm text-muted-foreground">{label}</span> : null;
}

/** Whether a run has started: one only queued has not, and leaves its lane's hold (a pause, a cap) in sight. */
const isStarted = ({ phase }: Pick<ContributeAgentRun, 'phase'>) => phase !== 'QUEUED';

const LANES = {
  hosted: { title: 'Hosted agent', note: 'on your Claude key', Icon: Cloud },
  own: { title: 'Your own agent', note: null, Icon: SquareTerminal },
} as const;

type LaneName = keyof typeof LANES;

/** A lane header's words beside its title (`note`: the model, the agent) and at its end (`aside`: the last call). */
export type LaneNote = { note?: string | null; aside?: string | null };

function Lane({
  name,
  runs,
  readAt,
  header,
  children,
}: {
  name: LaneName;
  runs: readonly ContributeAgentRun[];
  readAt: string;
  header?: LaneNote;
  children: ReactNode;
}) {
  const { title, Icon } = LANES[name];
  const note = header?.note ?? LANES[name].note;
  return (
    <div data-lane={name} data-lane-runs={runs.length}>
      <div className="flex min-w-0 items-center gap-2 border-b bg-muted/60 px-4 py-2 text-xs">
        <Icon aria-hidden="true" className="size-3.5 flex-none text-muted-foreground" />
        <h3 className="flex-none font-semibold">{title}</h3>
        {note ? <span className="min-w-0 truncate text-muted-foreground">{note}</span> : null}
        {header?.aside ? (
          <span className="ml-auto flex-none text-muted-foreground tabular-nums">{header.aside}</span>
        ) : null}
      </div>
      {/* What holds the lane stays until a run of it starts: a queued one waits on that very hold. */}
      {runs.some(isStarted) ? null : children}
      {runs.length ? <RunList runs={runs} readAt={readAt} /> : null}
    </div>
  );
}

/**
 * Right now's agents, a lane each: the agent we run on the user's key, and the user's own agent. A lane lists its live
 * runs, from the poll, and says what holds it (`hosted`, `ownAgent`: the page's words for its state, as it read it)
 * until one of them starts; the runs that ended in the last ten minutes follow, under "Just finished". A run that waits
 * for the user is Needs you's alone. Paused with nothing started, one line says so for both (`paused`), any queued runs
 * under it; with neither way, `none` does.
 */
export function RightNowLanes({
  activity,
  notes,
  hosted,
  ownAgent,
  paused,
  none,
}: {
  activity: ContributeActivity | null | undefined;
  /** Each lane header's words, as the page read them. */
  notes?: Partial<Record<LaneName, LaneNote>>;
  hosted?: ReactNode;
  ownAgent?: ReactNode;
  paused?: ReactNode;
  none?: ReactNode;
}) {
  const live = useLiveActivity(activity);
  const lanes = laneRunsOf(runsOf(live));
  const readAt = live?.readAt ?? '';
  const queued = [...lanes.hosted, ...lanes.own];
  const working = queued.some(isStarted);
  return (
    <div
      data-now-lanes={working ? 'working' : 'idle'}
      className={cn('flex flex-col divide-y overflow-hidden rounded-xl border bg-card', working && 'border-primary/30')}
    >
      {paused && !working ? (
        <div data-lane="paused">
          {paused}
          {queued.length ? <RunList runs={queued} readAt={readAt} /> : null}
        </div>
      ) : (
        <>
          {hosted || lanes.hosted.length ? (
            <Lane name="hosted" runs={lanes.hosted} readAt={readAt} header={notes?.hosted}>
              {hosted}
            </Lane>
          ) : null}
          {ownAgent || lanes.own.length ? (
            <Lane name="own" runs={lanes.own} readAt={readAt} header={notes?.own}>
              {ownAgent}
            </Lane>
          ) : null}
          {queued.length || hosted || ownAgent ? null : none}
        </>
      )}
      {lanes.finished.length ? (
        <div data-lane="finished">
          <h3 className="bg-muted/30 px-4 pt-2.5 text-xs font-semibold text-muted-foreground">Just finished</h3>
          <RunList runs={lanes.finished} readAt={readAt} />
        </div>
      ) : null}
    </div>
  );
}

/** The runs page's "Working now": the runs, live from the poll; nothing with none. */
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
