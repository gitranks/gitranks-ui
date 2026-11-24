'use client';

import { Cloud, SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useSyncExternalStore } from 'react';

import { Pill } from '@/components/pill/pill';
import { LiveDot } from '@/components/workspace/primitives';
import { RunSteps } from '@/components/workspace/run-steps';

export { LiveDot };

import { cn } from '@/lib/utils';
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
} from '@/lib/workspace/agent-runs';
import { contributeActivitySnapshot, onContributeActivity } from '@/lib/workspace/changes-bus';
import type { ContributeActivity, ContributeAgentRun } from '@/lib/workspace/contribute.types';

/**
 * The work in progress as the page read it, or as the one poll read it since, whichever is newer: the page is a sibling
 * of the tabs, so the poll's reads come through the bus (`publishContributeActivity`).
 */
export function useLiveActivity(page: ContributeActivity | null | undefined): ContributeActivity | null {
  const polled = useSyncExternalStore(onContributeActivity, contributeActivitySnapshot, () => null);
  return newerActivity(page, polled);
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
      {/* On a phone the header wraps, so the agent and its last call stay whole. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b bg-muted/60 px-4 py-2 text-xs">
        <Icon aria-hidden="true" className="size-3.5 flex-none text-muted-foreground" />
        <h3 className="flex-none font-semibold">{title}</h3>
        {note ? <span className="min-w-0 text-muted-foreground">{note}</span> : null}
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

/**
 * The runs page's "Working now": the runs, live from the poll. With none it stays, one quiet line, so the history under
 * it does not move each time a run starts or ends.
 */
export function WorkingNowSection({ activity }: { activity: ContributeActivity | null | undefined }) {
  const live = useLiveActivity(activity);
  return <WorkingNowView activity={live ?? null} />;
}

export function WorkingNowView({ activity }: { activity: ContributeActivity | null }) {
  const runs = activity?.runs ?? [];
  const working = runs.filter(({ active }) => active).length;
  return (
    <section
      aria-labelledby="overview-working"
      data-overview-section="working"
      data-working={runs.length ? 'runs' : 'none'}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id="overview-working" className="text-xl font-semibold tracking-tight">
          Working now
        </h2>
        {runs.length ? <span className="text-sm text-muted-foreground">{indicatorLabelOf(runs)}</span> : null}
      </div>
      {activity && runs.length ? (
        <div className={cn('overflow-hidden rounded-xl border bg-card', working && 'border-primary/30')}>
          <RunList runs={runs} readAt={activity.readAt} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed px-4 py-3.5 text-sm text-muted-foreground">
          No agent is working on an issue for you right now.
        </p>
      )}
    </section>
  );
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
