import Link from 'next/link';

import { Eyebrow } from './primitives';
import type { ContributeClaudePlan, ContributeSettings } from '@/lib/contribute/contribute.types';
import { planOf, usd } from '@/lib/contribute/format';

/** Step 2: the limits a plan starts from, or the ones in force once a key is connected. */
export function LimitsPreview({
  plan,
  settings,
}: {
  plan?: ContributeClaudePlan | null;
  settings?: ContributeSettings | null;
}) {
  const credit = settings?.cycleCapUsd ?? planOf(plan)?.creditUsd ?? null;
  const attempt = settings?.attemptCapUsd ?? 5;
  const atATime = settings?.attemptsAtATime ?? 1;
  const sweepDays = settings?.sweepDays ?? 3;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5 sm:p-6">
      <Eyebrow>Step 2 · Limits</Eyebrow>
      <span className="text-[17px] font-semibold">{settings ? 'Your limits' : "Start from your plan's numbers"}</span>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Each cycle</dt>
        <dd className="font-mono">{credit === null ? 'the amount you set' : usd(credit)}</dd>
        <dt className="text-muted-foreground">Each attempt</dt>
        <dd className="font-mono">{usd(attempt)}</dd>
        <dt className="text-muted-foreground">At a time</dt>
        <dd className="font-mono">
          {atATime} attempt{atATime === 1 ? '' : 's'}
        </dd>
        <dt className="text-muted-foreground">Pacing</dt>
        <dd>Even, then use what's left in the last {sweepDays} days</dd>
      </dl>
      <Link href="/contribute/settings#limits" prefetch={false} className="text-sm font-semibold text-primary">
        Change any of these →
      </Link>
    </div>
  );
}
