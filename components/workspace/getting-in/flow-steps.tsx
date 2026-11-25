import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FlowSide } from '@/lib/workspace/getting-in';

/** Each flow's steps, in order, by their fixed names. */
export const FLOW_STEPS: Record<FlowSide, readonly [string, string]> = {
  contribute: ['Your agent', 'Your first issue'],
};

/** A step's number in its flow: 1 or 2. */
export type FlowStepNumber = 1 | 2;

/**
 * The flow's one line of numbered steps: those before the current one checked, the current one filled (and named for
 * assistive tech as the current step), later ones outlined. It wraps on a phone.
 */
export function FlowSteps({ side, current }: { side: FlowSide; current: FlowStepNumber }) {
  return (
    <ol aria-label="Steps" className="flex flex-wrap items-center gap-x-6 gap-y-2" data-flow-steps={side}>
      {FLOW_STEPS[side].map((name, index) => {
        const number = index + 1;
        const state = number < current ? 'done' : number === current ? 'current' : 'next';
        return (
          <li
            key={name}
            aria-current={state === 'current' ? 'step' : undefined}
            data-step-state={state}
            className={cn(
              'flex items-center gap-2 text-sm',
              state === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
                state === 'current' && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {state === 'done' ? <Check className="size-3" /> : number}
            </span>
            {state === 'done' ? <span className="sr-only">Done: </span> : null}
            {name}
          </li>
        );
      })}
    </ol>
  );
}
