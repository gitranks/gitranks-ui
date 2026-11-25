'use client';

import { cn } from '@/lib/utils';
import type { ContributeAgentRun } from '@/lib/workspace/contribute.types';
import { stepsLabelOf, stepsOf } from '@/lib/workspace/run-steps';

type StepsRun = Pick<ContributeAgentRun, 'phase' | 'kind' | 'mode' | 'active'>;

/** The bars: one per step, the done ones full, the current one pulsing while an agent works on it. */
function Bars({ run }: { run: StepsRun }) {
  const { steps, at } = stepsOf(run);
  return (
    <>
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
    </>
  );
}

/** The steps a run walks, the one it is on lit: a hint, not a promise of time. */
export function RunSteps({ run }: { run: StepsRun }) {
  const { steps, at } = stepsOf(run);
  return (
    <span className="flex items-center gap-1" data-run-steps={`${Math.min(at + 1, steps.length)}/${steps.length}`}>
      <span className="sr-only">{stepsLabelOf(run)}</span>
      <Bars run={run} />
    </span>
  );
}
