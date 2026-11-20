'use client';

import { Cloud, SquareTerminal } from 'lucide-react';
import Link from 'next/link';

import { Pill } from '@/components/pill/pill';
import { type LaneNote, useLiveActivity } from '@/components/workspace/agent/agent-runs';
import { LiveDot } from '@/components/workspace/primitives';
import { RefChips } from '@/components/workspace/ref-chips';
import { RunStepsCard } from '@/components/workspace/run-steps';
import { cn } from '@/lib/utils';
import { durationLabel, eventLineOf, runsOf, runTitleOf, spendLabelOf } from '@/lib/workspace/agent-runs';
import type { ContributeActivity, ContributeAgentRun } from '@/lib/workspace/contribute.types';
import { pullRequestByAttemptPath, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { lastCallOf, type RunSide, rightNowOf, runPrOf, workingLabelOf } from '@/lib/workspace/right-now';
import { stepNameOf, stepsOf } from '@/lib/workspace/run-steps';

const LANES = {
  hosted: { title: 'Hosted agent', note: 'on your Claude key', Icon: Cloud },
  own: { title: 'Your own agent', note: null, Icon: SquareTerminal },
} as const;

type LaneName = keyof typeof LANES;

const link = 'font-semibold text-link hover:underline';

/** One run: its references, its title (its pull request's page), the step it is on, its facts and the way to it. */
export function RightNowRun({ run }: { run: ContributeAgentRun }) {
  const href = pullRequestByAttemptPath(run.attemptId);
  const { steps, at } = stepsOf(run);
  const step = stepNameOf(run);
  const event = eventLineOf(run);
  const facts = [durationLabel(run.elapsedSeconds), run.runner === 'MCP' ? null : spendLabelOf(run), event]
    .filter(Boolean)
    .join(' · ');
  return (
    <li data-run={run.attemptId} data-phase={run.phase} className="flex flex-col gap-1.5 px-4 py-3">
      <RefChips repo={run.nameWithOwner} issue={run.number} pr={run.kind === 'FOLLOW_UP' ? runPrOf(run) : null}>
        {run.kind === 'FOLLOW_UP' ? <Pill>Follow-up</Pill> : null}
      </RefChips>
      <Link href={href} prefetch={false} className="line-clamp-2 text-sm font-semibold text-pretty hover:underline">
        {runTitleOf(run)}
      </Link>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-2 font-medium text-foreground" data-run-step={step ?? 'done'}>
          <LiveDot active={run.active} />
          {step ? `${step} · Step ${at + 1} of ${steps.length}` : 'All steps done'}
        </span>
        <RunStepsCard run={run} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {facts ? <span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">{facts}</span> : <span />}
        <Link href={href} prefetch={false} className={cn(link, 'inline-flex items-center max-sm:min-h-11')}>
          See the run →
        </Link>
      </div>
    </li>
  );
}

function Lane({ name, runs, note }: { name: LaneName; runs: readonly ContributeAgentRun[]; note: LaneNote }) {
  const { title, Icon } = LANES[name];
  return (
    <div data-lane={name} data-lane-runs={runs.length}>
      {/* On a phone the header wraps, so the agent and its last call stay whole. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b bg-muted/60 px-4 py-2 text-xs">
        <Icon aria-hidden="true" className="size-3.5 flex-none text-muted-foreground" />
        <h3 className="flex-none font-semibold">{title}</h3>
        {note.note ? <span className="min-w-0 text-muted-foreground">{note.note}</span> : null}
        {note.aside ? <span className="ml-auto flex-none text-muted-foreground tabular-nums">{note.aside}</span> : null}
      </div>
      <ul className="flex flex-col divide-y">
        {runs.map((run) => (
          <RightNowRun key={run.attemptId} run={run} />
        ))}
      </ul>
    </div>
  );
}

/**
 * "Right now" on one front tab: the runs of that side an agent works on at this moment, a lane each (the hosted agent
 * on the person's Claude key, their own agent), live from the poll. Absent with none. `notes`: each lane header's
 * words as the page read them (the model, "2 of 3 at a time", the agent's name); the own agent's last call is the
 * runs' own by default.
 */
export function RightNow({
  activity,
  side,
  notes,
  slots,
}: {
  activity: ContributeActivity | null | undefined;
  side: RunSide;
  notes?: Partial<Record<LaneName, LaneNote>>;
  /** The hosted agent's runs at a time: its lane says "{busy} of {slots} at a time" unless `notes` says otherwise. */
  slots?: number | null;
}) {
  const live = useLiveActivity(activity);
  const { hosted, own } = rightNowOf(runsOf(live), side);
  const count = hosted.length + own.length;
  if (!count) return null;
  const readAt = live?.readAt ?? new Date().toISOString();
  return (
    <section aria-labelledby={`right-now-${side}`} data-right-now={side} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`right-now-${side}`} className="text-xl font-semibold tracking-tight">
          Right now
        </h2>
        <span className="flex items-baseline gap-3 text-sm">
          <span className="text-muted-foreground">{workingLabelOf(count)}</span>
          <Link href={WORKSPACE_PATHS.agentRuns} prefetch={false} className={link}>
            All runs →
          </Link>
        </span>
      </div>
      <div className="flex flex-col divide-y overflow-hidden rounded-xl border border-primary/30 bg-card">
        {hosted.length ? (
          <Lane
            name="hosted"
            runs={hosted}
            note={{
              note: notes?.hosted?.note ?? LANES.hosted.note,
              aside: notes?.hosted?.aside ?? (slots ? `${hosted.length} of ${slots} at a time` : null),
            }}
          />
        ) : null}
        {own.length ? (
          <Lane
            name="own"
            runs={own}
            note={{ note: notes?.own?.note, aside: notes?.own?.aside ?? lastCallOf(own, readAt) }}
          />
        ) : null}
      </div>
    </section>
  );
}
