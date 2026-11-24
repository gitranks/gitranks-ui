import Link from 'next/link';
import type { ReactNode } from 'react';

import { ABOVE_LINK, OutcomePill, RunCard, RunRefs, RunTitle } from './runs-list';
import { RunsTiles } from './runs-tiles';
import { HEADING } from '@/components/workspace/primitives';
import { cn } from '@/lib/utils';
import { dayLabel, usd } from '@/lib/workspace/format';
import { PICK_ISSUE_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import {
  type ContributeRun,
  type ContributeRunsPage,
  RUNS_PREVIEW_SIZE,
  runnerLabelOf,
  runReasonOf,
  timeOfDay,
} from '@/lib/workspace/runs';

/** "Hosted · Sonnet 5.5 · first attempt · Oct 31, 22:35": who ran it, which attempt, and when. */
function MetaLine({ run }: { run: ContributeRun }) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span className="text-foreground">{runnerLabelOf(run)}</span>
      <span aria-hidden="true">·</span>
      {run.kind === 'FOLLOW_UP' ? (
        <span className="text-brand-soft-foreground">↳ follow-up</span>
      ) : (
        <span>first attempt</span>
      )}
      <span aria-hidden="true">·</span>
      <span className="font-mono">
        {dayLabel(run.createdAt)}, {timeOfDay(run.createdAt)}
      </span>
    </span>
  );
}

/** Its cost; none shown when it spent nothing (a run of the user's own agent spends nothing through us). */
const costOf = (run: ContributeRun) => (run.costUsd > 0 ? usd(run.costUsd) : null);

function PreviewRow({ run, cost }: { run: ContributeRun; cost: boolean }) {
  const reason = runReasonOf(run);
  return (
    <tr data-run={run.attemptId} className="relative border-t hover:bg-muted/50">
      <td className="py-3.5 pr-3 pl-5 align-top">
        <div className="flex flex-col gap-1">
          <RunRefs run={run} />
          <RunTitle run={run} className="line-clamp-1" />
          <MetaLine run={run} />
        </div>
      </td>
      <td className={cn('px-3 py-3.5 align-top', !cost && 'pr-5')}>
        <OutcomePill run={run} />
        {reason ? (
          <div className={cn('mt-1 line-clamp-2 text-xs text-muted-foreground', ABOVE_LINK)} title={reason}>
            {reason}
          </div>
        ) : null}
      </td>
      {cost ? (
        <td className="py-3.5 pr-5 pl-3 text-right align-top font-mono text-sm">
          <span className={ABOVE_LINK}>{costOf(run)}</span>
        </td>
      ) : null}
    </tr>
  );
}

/**
 * The Agent tab's "Runs" (W1 §9.2): one sentence, the all-time tiles, and the latest five runs with their outcome and
 * cost, "All runs →" to the history. A preview: it never grows. A learner sees no spend: their lessons instead, and the
 * runs at work now. `page` is `undefined` when the read failed.
 */
export function RunsPreview({
  page,
  learner = false,
  atWork = 0,
}: {
  page: ContributeRunsPage | undefined;
  learner?: boolean;
  /** Runs an agent works on now. */
  atWork?: number;
}) {
  const runs = page?.items.slice(0, RUNS_PREVIEW_SIZE) ?? [];
  const cost = !learner;
  let body: ReactNode;
  if (!page) {
    body = (
      <p className="rounded-xl border border-dashed px-4 py-3.5 text-sm text-muted-foreground" data-runs="failed">
        The runs didn&apos;t load. Reload to try again.
      </p>
    );
  } else if (!runs.length) {
    body = (
      <p className="rounded-xl border border-dashed px-4 py-3.5 text-sm text-muted-foreground" data-runs="none">
        No runs yet. Start an issue on{' '}
        <Link href={WORKSPACE_PATHS.contribute} prefetch={false} className="font-semibold text-link hover:underline">
          Contribute
        </Link>{' '}
        or{' '}
        <Link href={PICK_ISSUE_PATHS.learn} prefetch={false} className="font-semibold text-link hover:underline">
          Learn
        </Link>
        .
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          {learner
            ? 'Every run your agent made for you. Times are UTC.'
            : 'Every run an agent made for you, all time. Times are UTC.'}
        </p>
        <RunsTiles totals={page.totals} variant="preview" learner={learner} atWork={atWork} />
        <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
          <table className="w-full table-fixed border-collapse text-sm" data-runs-preview>
            <colgroup>
              <col />
              <col className="w-[30%]" />
              {cost ? <col className="w-24" /> : null}
            </colgroup>
            <thead>
              <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
                <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">
                  Issue and agent
                </th>
                <th scope="col" className={cn('py-2.5 pl-3 font-medium', cost ? 'pr-3' : 'pr-5')}>
                  Outcome
                </th>
                {cost ? (
                  <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium">
                    Cost
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <PreviewRow key={run.attemptId} run={run} cost={cost} />
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-col gap-2 md:hidden">
          {runs.map((run) => (
            <RunCard key={run.attemptId} line={{ kind: 'run', run }} cost={cost} />
          ))}
        </ul>
      </>
    );
  }

  return (
    <section id="runs" aria-labelledby="runs-title" className="flex scroll-mt-20 flex-col gap-3" data-runs-block>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="runs-title" className={HEADING.section}>
          Runs
        </h2>
        <Link
          href={WORKSPACE_PATHS.agentRuns}
          prefetch={false}
          className="text-sm font-semibold text-link hover:underline max-sm:min-h-11"
        >
          All runs →
        </Link>
      </div>
      {body}
    </section>
  );
}
