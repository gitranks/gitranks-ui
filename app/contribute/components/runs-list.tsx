'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState, useTransition } from 'react';

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
  outcomeOf,
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

/** Under the runner: a first attempt (with its follow-ups), or the follow-up on its PR. */
function KindLine({ run }: { run: ContributeRun }) {
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

const costSplitOf = (run: ContributeRun) =>
  run.costUsd ? `Go/no-go ${usd(run.goNoGoUsd)} · work ${usd(run.workUsd)}` : 'No session, no cost';

/** Runs that never started on one issue back to back: one quiet line, `×4`. */
const foldedLabel = (runs: ContributeRun[]) => (runs.length > 1 ? ` ×${runs.length}` : '');

/** The row's one link spans the row (`after:inset-0`); a cell above it keeps its own hover and selection. */
const ABOVE_LINK = 'relative z-10';

function TableLine({ line }: { line: RunLine }) {
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
        <td className="max-w-0 px-3 py-3 align-top">
          <div className="truncate font-mono text-xs">
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
        <td className="max-w-0 px-3 py-3 align-top">
          <OutcomePill run={run} />
          <div className={cn('mt-1 line-clamp-1 text-xs', ABOVE_LINK)}>
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
          <div className={cn('mt-1 line-clamp-1 text-xs text-muted-foreground', ABOVE_LINK)} title={reason}>
            {reason}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-3 text-right align-top font-mono text-xs whitespace-nowrap">
        {durationLabel(run.startedAt, run.finishedAt) || '—'}
      </td>
      <td className="py-3 pr-5 pl-3 text-right align-top">
        <span className={cn('font-mono text-sm', ABOVE_LINK)} title={costSplitOf(run)}>
          {usd(run.costUsd)}
        </span>
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
          {run.costUsd ? <div className="text-xs text-muted-foreground">{costSplitOf(run)}</div> : null}
        </>
      )}
    </li>
  );
}

/**
 * Pages after the first, as Load more read them, and the cursor of the first page they continue: when a refresh moves
 * the first page (new runs on top), that cursor no longer matches and they go, so no run falls between the pages.
 */
type More = { after: string; items: ContributeRun[]; days: ContributeRunsDay[]; nextCursor: string | null };

/** The first link of a run's row or card, whichever shows. */
function focusRun(attemptId: string) {
  const links = document.querySelectorAll<HTMLAnchorElement>(`[data-run="${CSS.escape(attemptId)}"] a`);
  [...links].find((link) => link.offsetParent !== null)?.focus();
}

/**
 * The runs by UTC day, a table on wide screens and cards below, with Load more for the next 50. The first page is the
 * server's (read again when the poll says the attempts moved); the pages after it stay while it does not move, and the
 * parent keys this by the URL, so a filter change starts again. `from` is the first page's own start, so a page read
 * after UTC midnight keeps the same days.
 */
export function RunsList({
  page,
  href,
  from,
  now,
}: {
  page: ContributeRunsPage;
  href: string;
  from?: string;
  now?: Date;
}) {
  const [more, setMore] = useState<More | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusOn, setFocusOn] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const kept = more && more.after === page.nextCursor ? more : null;
  const seen = new Set(page.items.map(({ attemptId }) => attemptId));
  const runs = [...page.items, ...(kept?.items ?? []).filter(({ attemptId }) => !seen.has(attemptId))];
  const days = new Map([...(kept?.days ?? []), ...page.days].map((day) => [day.day, day]));
  const next = kept ? kept.nextCursor : page.nextCursor;
  const grouped = runDaysOf(runs);

  useEffect(() => {
    if (!focusOn) return;
    focusRun(focusOn);
    setFocusOn(null);
  }, [focusOn]);

  const loadMore = () => {
    if (!next || pending || !page.nextCursor) return;
    const first = page.nextCursor;
    setError(null);
    startTransition(async () => {
      const result = await readRunsPage({ href, after: next, from });
      if (!result.ok || !result.data) {
        setError(result.ok ? 'No more runs to read.' : (result.message ?? 'Your runs could not be read. Try again.'));
        return;
      }
      const data = result.data;
      setMore((current) => {
        const base = current && current.after === first ? current : null;
        return {
          after: first,
          items: [...(base?.items ?? []), ...data.items],
          days: [...(base?.days ?? []), ...data.days],
          nextCursor: data.nextCursor,
        };
      });
      if (data.items[0]) setFocusOn(data.items[0].attemptId);
    });
  };

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
            <col className="w-20" />
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
              <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                Agent time
              </th>
              <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium">
                Cost
              </th>
            </tr>
          </thead>
          {grouped.map((day) => (
            <tbody key={day.day} data-day={day.day}>
              <tr className="border-t bg-muted/60">
                <th colSpan={6} scope="rowgroup" className="py-2 pr-5 pl-5 text-left text-xs font-normal">
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

      <div className="flex flex-col gap-1 lg:hidden">
        {grouped.map((day) => (
          <div key={day.day} data-day={day.day} className="flex flex-col gap-2">
            <h3 className="flex justify-between gap-2 px-0.5 pt-2 text-xs font-normal text-muted-foreground">
              <span className="font-semibold text-foreground">{dayRowLabel(day.day, now)}</span>
              <span>{daySumLabel(days.get(day.day), usd)}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {day.lines.map((line) => (
                <CardLine key={line.kind === 'run' ? line.run.attemptId : line.runs[0].attemptId} line={line} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <MoreBar shown={runs.length} total={page.totals.runs}>
        {next ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-10 px-4 font-semibold"
            aria-disabled={pending}
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
        {Math.max(total, shown) === 1 ? '' : 's'}
      </span>
      {children}
    </div>
  );
}
