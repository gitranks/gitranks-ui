import Link from 'next/link';

import { Meter, Pill } from './primitives';
import type { ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, isPaused } from '@/lib/contribute/contribute-state';
import { dayLabel, relativeLabel, usd } from '@/lib/contribute/format';

/** Spent this cycle against the cycle's cap, when it renews, and when the next attempt could start. */
export function CycleSummary({ view, now, action }: { view: ContributeView; now?: Date; action?: React.ReactNode }) {
  const { contributor } = view;
  const spend = contributor?.spend;
  const settings = contributor?.settings;
  const key = claudeKeyOf(view);
  const paused = isPaused(view);

  const state = paused
    ? { label: 'Paused', tone: 'neutral' as const }
    : key?.state === 'VALID'
      ? { label: 'Active', tone: 'green' as const }
      : { label: 'Waiting', tone: 'amber' as const };

  const next =
    paused || !spend
      ? null
      : spend.nextAttemptAt
        ? `next attempt ${relativeLabel(spend.nextAttemptAt, now)}`
        : 'no attempt can start under your limits';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-5 py-4">
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <Pill tone={state.tone}>{state.label}</Pill>
          {spend && settings ? (
            <span className="text-lg font-semibold">
              {usd(spend.cycleUsd)} of {usd(settings.cycleCapUsd)} used this cycle
            </span>
          ) : (
            <span className="text-lg font-semibold">No spend yet</span>
          )}
          {spend ? (
            <span className="text-sm text-muted-foreground">
              renews {dayLabel(spend.cycleEnd)}
              {next ? ` · ${next}` : ''}
            </span>
          ) : null}
        </div>
        {spend && settings ? (
          <Meter value={spend.cycleUsd} max={settings.cycleCapUsd} label="Spent this cycle" />
        ) : null}
      </div>
      {action ?? (
        <Link href="/contribute/issues" prefetch={false} className="text-sm font-semibold text-primary">
          Issues for you →
        </Link>
      )}
    </div>
  );
}
