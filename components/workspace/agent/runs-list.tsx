import Link from 'next/link';

import { LearnPill } from '@/components/workspace/learn-pill';
import { RefChips } from '@/components/workspace/ref-chips';
import { cn } from '@/lib/utils';
import { usd } from '@/lib/workspace/format';
import { pullRequestByAttemptPath } from '@/lib/workspace/paths';
import {
  type ContributeRun,
  type ContributeRunsDay,
  dayRowLabel,
  daySumLabel,
  durationLabel,
  effortLabelOf,
  isLearnRun,
  NO_GO_CATEGORIES,
  outcomeOf,
  type RunLine,
  runDaysOf,
  runnerLabelOf,
  runReasonOf,
  runTitleOf,
  timeOfDay,
} from '@/lib/workspace/runs';

const TONES = {
  neutral: 'bg-muted text-foreground/80',
  green: 'bg-positive/10 text-positive-strong',
  violet: 'bg-brand-soft text-brand-soft-foreground',
  amber: 'bg-warning-soft text-warning-soft-foreground',
  red: 'bg-negative/10 text-negative-strong',
  quiet: 'border border-dashed text-muted-foreground',
} as const;

/** The outcome, with a no-go's category and its colour on the bar. */
export function OutcomePill({ run }: { run: Pick<ContributeRun, 'outcome' | 'noGoCategory'> }) {
  const { label, tone } = outcomeOf(run.outcome);
  const category = run.outcome === 'NO_GO' && run.noGoCategory ? NO_GO_CATEGORIES[run.noGoCategory] : undefined;
  return (
    <span
      data-outcome={run.outcome}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
      )}
    >
      {category ? (
        <span aria-hidden="true" className="size-2 rounded-xs" style={{ background: category.color }} />
      ) : null}
      {label}
      {category ? ` · ${category.label}` : null}
    </span>
  );
}

/** The row's one link spans the row (`after:inset-0`); a part above it keeps its own links, hover and selection. */
export const ABOVE_LINK = 'relative z-10';

/**
 * The reference line of a run (decision 5): the repo, `Issue #N ↗`, `PR #N ↗` when one opened (a follow-up's is its
 * pull request's), then the Learn pill for a Learn run, and `×2` for retries folded into one line.
 */
export function RunRefs({ run, folded = 0 }: { run: ContributeRun; folded?: number }) {
  const pr = run.pullRequest ?? (run.followUpOf ? { number: run.followUpOf.number } : null);
  return (
    <RefChips repo={run.nameWithOwner} issue={run.number} pr={pr} className={ABOVE_LINK}>
      {isLearnRun(run) ? <LearnPill /> : null}
      {folded > 1 ? <span className="font-mono text-xs text-muted-foreground">×{folded}</span> : null}
    </RefChips>
  );
}

/** Under the runner: a first attempt (with its follow-ups), or the follow-up on its PR. */
export function KindLine({ run }: { run: ContributeRun }) {
  if (run.kind === 'FOLLOW_UP') {
    return (
      <span className="text-brand-soft-foreground">
        ↳ Follow-up{run.followUpOf ? ` on PR #${run.followUpOf.number}` : ''}
      </span>
    );
  }
  return (
    <span>
      First attempt{run.queuedBy === 'user' ? ' · started by you' : ''}
      {run.followUps ? (
        <span className="text-brand-soft-foreground">
          {' '}
          · +{run.followUps} follow-up{run.followUps === 1 ? '' : 's'}
        </span>
      ) : null}
    </span>
  );
}

export const costSplitOf = (run: ContributeRun) =>
  run.costUsd ? `Go/no-go ${usd(run.goNoGoUsd)} · work ${usd(run.workUsd)}` : 'No session, no cost';

/** The title, the link to the run's pull request page spanning its row or card. */
export function RunTitle({
  run,
  quiet = false,
  className,
}: {
  run: ContributeRun;
  quiet?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={pullRequestByAttemptPath(run.attemptId)}
      prefetch={false}
      className={cn('after:absolute after:inset-0 hover:underline', !quiet && 'font-medium text-foreground', className)}
    >
      {runTitleOf(run)}
    </Link>
  );
}

function TableLine({ line, cost }: { line: RunLine; cost: boolean }) {
  if (line.kind === 'folded') {
    const [run] = line.runs;
    const oldest = line.runs.at(-1) ?? run;
    return (
      <tr data-run={run.attemptId} data-folded={line.runs.length} className="relative border-t text-muted-foreground">
        <td className="py-3 pr-3 pl-5 align-top font-mono text-xs whitespace-nowrap">
          {line.runs.length > 1
            ? `${timeOfDay(oldest.createdAt)}–${timeOfDay(run.createdAt)}`
            : timeOfDay(run.createdAt)}
        </td>
        <td className="px-3 py-3 align-top">
          <div className="flex flex-col gap-1">
            <RunRefs run={run} folded={line.runs.length} />
            <RunTitle run={run} quiet className="line-clamp-1" />
          </div>
        </td>
        <td className="px-3 py-3 align-top text-xs">Never reached the agent</td>
        <td className="max-w-0 px-3 py-3 align-top">
          <OutcomePill run={run} />
          <div className={cn('mt-1 line-clamp-1 text-xs', ABOVE_LINK)}>
            {runReasonOf(run)}
            {line.runs.length > 1 ? ', at each retry' : ''}
          </div>
        </td>
        <td className="px-3 py-3 text-right align-top font-mono text-xs">—</td>
        {cost ? <td className="py-3 pr-5 pl-3 text-right align-top font-mono text-xs">{usd(0)}</td> : null}
      </tr>
    );
  }
  const { run } = line;
  const reason = runReasonOf(run);
  return (
    <tr data-run={run.attemptId} className="relative border-t hover:bg-muted/50">
      <td className="py-3 pr-3 pl-5 align-top font-mono text-xs whitespace-nowrap text-muted-foreground">
        {timeOfDay(run.createdAt)}
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-1">
          <RunRefs run={run} />
          <RunTitle run={run} className="line-clamp-1" />
        </div>
      </td>
      <td className="px-3 py-3 align-top text-xs">
        <div>
          {runnerLabelOf(run)}
          {run.effort && run.runner === 'MANAGED_AGENTS' ? (
            <span className="text-muted-foreground"> · {effortLabelOf(run.effort)}</span>
          ) : null}
        </div>
        <div className="text-muted-foreground">
          <KindLine run={run} />
        </div>
      </td>
      <td className="max-w-0 px-3 py-3 align-top">
        <OutcomePill run={run} />
        {reason ? (
          <div className={cn('mt-1 line-clamp-1 text-xs text-muted-foreground', ABOVE_LINK)} title={reason}>
            {reason}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-right align-top font-mono text-xs whitespace-nowrap">
        {durationLabel(run.startedAt, run.finishedAt) || '—'}
      </td>
      {cost ? (
        <td className="py-3 pr-5 pl-3 text-right align-top">
          <span className={cn('font-mono text-sm', ABOVE_LINK)} title={costSplitOf(run)}>
            {usd(run.costUsd)}
          </span>
        </td>
      ) : null}
    </tr>
  );
}

/** A run as a card, on phones: the reference line and time, the title, the outcome and why, the runner and cost. */
export function RunCard({ line, cost = true }: { line: RunLine; cost?: boolean }) {
  const run = line.kind === 'folded' ? line.runs[0] : line.run;
  const folded = line.kind === 'folded';
  const reason = runReasonOf(run);
  return (
    <li
      data-run={run.attemptId}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-xl border p-3.5',
        folded ? 'border-dashed text-muted-foreground' : 'bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <RunRefs run={run} folded={folded ? line.runs.length : 0} />
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{timeOfDay(run.createdAt)}</span>
      </div>
      <RunTitle run={run} quiet={folded} className="line-clamp-2" />
      <div>
        <OutcomePill run={run} />
      </div>
      {reason ? <p className="line-clamp-2 text-xs text-muted-foreground">{reason}</p> : null}
      {folded ? null : (
        <>
          {run.kind === 'FOLLOW_UP' || run.followUps ? (
            <div className="text-xs text-muted-foreground">
              <KindLine run={run} />
            </div>
          ) : null}
          <div className="mt-0.5 flex justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
            <span className="truncate">{runnerLabelOf(run)}</span>
            <span className="shrink-0 font-mono text-foreground">
              {durationLabel(run.startedAt, run.finishedAt) || '—'}
              {cost ? ` · ${usd(run.costUsd)}` : ''}
            </span>
          </div>
          {cost && run.costUsd ? <div className="text-xs text-muted-foreground">{costSplitOf(run)}</div> : null}
        </>
      )}
    </li>
  );
}

/**
 * One page of the runs by UTC day, a table on wide screens and cards below; each day row sums every run of that day
 * the filter matches. `cost`: the cost column, left out for a learner, whose own agent spends nothing through us.
 */
export function RunsList({
  runs,
  days,
  cost = true,
  now,
}: {
  runs: ContributeRun[];
  days: ContributeRunsDay[];
  cost?: boolean;
  now?: Date;
}) {
  const sums = new Map(days.map((day) => [day.day, day]));
  const grouped = runDaysOf(runs);
  const columns = cost ? 6 : 5;

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
        <table className="w-full table-fixed border-collapse text-sm" data-runs-table>
          <colgroup>
            <col className="w-24" />
            <col />
            <col className="w-48" />
            <col className="w-[28%]" />
            <col className="w-28" />
            {cost ? <col className="w-20" /> : null}
          </colgroup>
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
              <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">
                Queued
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Issue
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Run
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Outcome
              </th>
              <th
                scope="col"
                className={cn('py-2.5 text-right font-medium whitespace-nowrap', cost ? 'px-3' : 'pr-5 pl-3')}
              >
                Agent time
              </th>
              {cost ? (
                <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium">
                  Cost
                </th>
              ) : null}
            </tr>
          </thead>
          {grouped.map((day) => (
            <tbody key={day.day} data-day={day.day}>
              <tr className="border-t bg-muted/60">
                <th colSpan={columns} scope="rowgroup" className="py-2 pr-5 pl-5 text-left text-xs font-normal">
                  <span className="font-semibold text-foreground">{dayRowLabel(day.day, now)}</span>
                  <span className="text-muted-foreground"> · {daySumLabel(sums.get(day.day), cost ? usd : null)}</span>
                </th>
              </tr>
              {day.lines.map((line) => (
                <TableLine
                  key={line.kind === 'run' ? line.run.attemptId : line.runs[0].attemptId}
                  line={line}
                  cost={cost}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="flex flex-col gap-1 lg:hidden">
        {grouped.map((day) => (
          <div key={day.day} data-day={day.day} className="flex flex-col gap-2">
            <h3 className="flex justify-between gap-2 px-0.5 pt-2 text-xs font-normal text-muted-foreground">
              <span className="font-semibold text-foreground">{dayRowLabel(day.day, now)}</span>
              <span>{daySumLabel(sums.get(day.day), cost ? usd : null)}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {day.lines.map((line) => (
                <RunCard
                  key={line.kind === 'run' ? line.run.attemptId : line.runs[0].attemptId}
                  line={line}
                  cost={cost}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
