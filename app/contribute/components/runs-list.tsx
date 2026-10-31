'use client';

import Link from 'next/link';
import { type ReactNode, useState, useTransition } from 'react';

import { readRunsPage } from '../runs/actions';
import { attemptHref } from './reviews-ready';
import { Button } from '@/components/ui/button';
import { usd } from '@/lib/contribute/format';
import {
  type ContributeRun,
  type ContributeRunsDay,
  type ContributeRunsPage,
  dayRowLabel,
  daySumLabel,
  durationLabel,
  effortLabelOf,
  issueRefOf,
  NO_GO_CATEGORIES,
  RUN_OUTCOMES,
  type RunLine,
  runDaysOf,
  runnerLabelOf,
  runReasonOf,
  runTitleOf,
  timeOfDay,
} from '@/lib/contribute/runs';
import { cn } from '@/lib/utils';

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
  const { label, tone } = RUN_OUTCOMES[run.outcome];
  const category = run.outcome === 'NO_GO' && run.noGoCategory ? NO_GO_CATEGORIES[run.noGoCategory] : null;
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

/** Under the runner: a first attempt (with its follow-ups), or the follow-up on its PR. */
function KindLine({ run }: { run: ContributeRun }) {
  if (run.kind === 'FOLLOW_UP') {
    return <span className="text-brand-soft-foreground">↳ Follow-up on PR #{run.followUpOf?.number}</span>;
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

const costTitleOf = (run: ContributeRun) =>
  run.costUsd ? `Go/no-go ${usd(run.goNoGoUsd)} · work ${usd(run.workUsd)}` : 'No session, no cost';

/** Runs that never started on one issue back to back: one quiet line, `×4`. */
const foldedLabel = (runs: ContributeRun[]) => (runs.length > 1 ? ` ×${runs.length}` : '');

function TableLine({ line }: { line: RunLine }) {
  if (line.kind === 'folded') {
    const [run] = line.runs;
    const last = line.runs.at(-1) ?? run;
    return (
      <tr data-run={run.attemptId} data-folded={line.runs.length} className="relative border-t text-muted-foreground">
        <td className="py-3 pr-3 pl-5 align-top font-mono text-xs whitespace-nowrap">
          {line.runs.length > 1 ? `${timeOfDay(last.createdAt)}–${timeOfDay(run.createdAt)}` : timeOfDay(run.createdAt)}
        </td>
        <td className="px-3 py-3 align-top">
          <div className="font-mono text-xs">
            {issueRefOf(run)}
            {foldedLabel(line.runs)}
          </div>
          <Link
            href={attemptHref(run.attemptId)}
            prefetch={false}
            className="line-clamp-1 after:absolute after:inset-0 hover:underline"
          >
            {runTitleOf(run)}
          </Link>
        </td>
        <td className="px-3 py-3 align-top text-xs">Never reached the agent</td>
        <td className="px-3 py-3 align-top">
          <OutcomePill run={run} />
          <div className="mt-1 line-clamp-1 text-xs">
            {runReasonOf(run)}
            {line.runs.length > 1 ? ', at each retry' : ''}
          </div>
        </td>
        <td className="px-3 py-3 text-right align-top font-mono text-xs">—</td>
        <td className="py-3 pr-5 pl-3 text-right align-top font-mono text-xs">{usd(0)}</td>
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
      <td className="max-w-0 px-3 py-3 align-top">
        <div className="truncate font-mono text-xs text-muted-foreground">{issueRefOf(run)}</div>
        <Link
          href={attemptHref(run.attemptId)}
          prefetch={false}
          className="line-clamp-1 font-medium text-foreground after:absolute after:inset-0 hover:underline"
        >
          {runTitleOf(run)}
        </Link>
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
          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground" title={reason}>
            {reason}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-right align-top font-mono text-xs whitespace-nowrap">
        {durationLabel(run.startedAt, run.finishedAt) || '—'}
      </td>
      <td className="py-3 pr-5 pl-3 text-right align-top font-mono text-sm" title={costTitleOf(run)}>
        {usd(run.costUsd)}
      </td>
    </tr>
  );
}

function CardLine({ line }: { line: RunLine }) {
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
      <div className="flex justify-between gap-2 font-mono text-xs text-muted-foreground">
        <span className="truncate">
          {issueRefOf(run)}
          {folded ? foldedLabel(line.runs) : ''}
        </span>
        <span>{timeOfDay(run.createdAt)}</span>
      </div>
      <Link
        href={attemptHref(run.attemptId)}
        prefetch={false}
        className={cn('line-clamp-2 after:absolute after:inset-0', !folded && 'font-medium text-foreground')}
      >
        {runTitleOf(run)}
      </Link>
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
              {durationLabel(run.startedAt, run.finishedAt) || '—'} · {usd(run.costUsd)}
            </span>
          </div>
        </>
      )}
    </li>
  );
}

/** Pages after the first, as Load more read them. */
type More = { items: ContributeRun[]; days: ContributeRunsDay[]; nextCursor: string | null };

/**
 * The runs by UTC day, a table on wide screens and cards on phones, with Load more for the next 50. The first page is
 * the server's (read again when the poll says the attempts moved); the pages after it stay until the filters change
 * (the parent keys this by the URL).
 */
export function RunsList({ page, href, now }: { page: ContributeRunsPage; href: string; now?: Date }) {
  const [more, setMore] = useState<More | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seen = new Set(page.items.map(({ attemptId }) => attemptId));
  const runs = [...page.items, ...(more?.items ?? []).filter(({ attemptId }) => !seen.has(attemptId))];
  const days = new Map([...(more?.days ?? []), ...page.days].map((day) => [day.day, day]));
  const next = more ? more.nextCursor : page.nextCursor;
  const grouped = runDaysOf(runs);

  const loadMore = () => {
    if (!next) return;
    setError(null);
    startTransition(async () => {
      const result = await readRunsPage({ href, after: next });
      if (!result.ok || !result.data) {
        setError(result.ok ? 'No more runs to read.' : (result.message ?? 'Your runs could not be read. Try again.'));
        return;
      }
      const data = result.data;
      setMore((current) => ({
        items: [...(current?.items ?? []), ...data.items],
        days: [...(current?.days ?? []), ...data.days],
        nextCursor: data.nextCursor,
      }));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <table className="w-full table-fixed border-collapse text-sm" data-runs-table>
          <colgroup>
            <col className="w-24" />
            <col />
            <col className="w-52" />
            <col className="w-[30%]" />
            <col className="w-20" />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
              <th className="py-2.5 pr-3 pl-5 font-medium">Started</th>
              <th className="px-3 py-2.5 font-medium">Issue</th>
              <th className="px-3 py-2.5 font-medium">Run</th>
              <th className="px-3 py-2.5 font-medium">Outcome</th>
              <th className="px-3 py-2.5 text-right font-medium">Time</th>
              <th className="py-2.5 pr-5 pl-3 text-right font-medium">Cost</th>
            </tr>
          </thead>
          {grouped.map((day) => (
            <tbody key={day.day} data-day={day.day}>
              <tr className="border-t bg-muted/60">
                <th colSpan={6} scope="colgroup" className="py-2 pr-5 pl-5 text-left text-xs font-normal">
                  <span className="font-semibold text-foreground">{dayRowLabel(day.day, now)}</span>
                  <span className="text-muted-foreground"> · {daySumLabel(days.get(day.day), usd)}</span>
                </th>
              </tr>
              {day.lines.map((line) => (
                <TableLine key={line.kind === 'run' ? line.run.attemptId : line.runs[0].attemptId} line={line} />
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="flex flex-col gap-1 md:hidden">
        {grouped.map((day) => (
          <section key={day.day} aria-label={dayRowLabel(day.day, now)} className="flex flex-col gap-2">
            <div className="flex justify-between gap-2 px-0.5 pt-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{dayRowLabel(day.day, now)}</span>
              <span>{daySumLabel(days.get(day.day), usd)}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {day.lines.map((line) => (
                <CardLine key={line.kind === 'run' ? line.run.attemptId : line.runs[0].attemptId} line={line} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <MoreBar shown={runs.length} total={page.totals.runs}>
        {next ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10 px-4 font-semibold"
            disabled={pending}
            onClick={loadMore}
          >
            {pending ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </MoreBar>
      {error ? (
        <p role="alert" className="text-sm text-negative-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MoreBar({ shown, total, children }: { shown: number; total: number; children: ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
      data-runs-shown={shown}
    >
      <span aria-live="polite">
        Showing {shown.toLocaleString('en-US')} of {Math.max(total, shown).toLocaleString('en-US')} run
        {total === 1 ? '' : 's'}
      </span>
      {children}
    </div>
  );
}
