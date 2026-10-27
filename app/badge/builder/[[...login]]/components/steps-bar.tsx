'use client';

import type { MouseEvent } from 'react';

import { type BuilderStep, STEP_NAMES, STEPS } from '../utils/builder-state';
import { cn } from '@/lib/utils';

type StepsBarProps = {
  step: BuilderStep;
  hrefs: Record<BuilderStep, string>;
  onStep: (step: BuilderStep) => void;
};

/** Finished steps are links back; the current one is marked; later ones are plain. Phones show names only for the current step. */
export function StepsBar({ step, hrefs, onStep }: Readonly<StepsBarProps>) {
  const current = STEPS.indexOf(step);

  const follow = (target: BuilderStep) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onStep(target);
  };

  return (
    <nav aria-label="Builder steps">
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((name, index) => {
          const number = (
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums',
                index === current && 'border-primary bg-primary text-primary-foreground',
                index < current && 'border-primary text-primary',
              )}
            >
              {index + 1}
            </span>
          );
          const label = (
            <span className={cn(index !== current && 'sr-only sm:not-sr-only')}>
              <span className="sr-only">Step {index + 1}: </span>
              {STEP_NAMES[name]}
            </span>
          );
          return (
            <li key={name} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" className="h-px w-4 bg-border sm:w-8" />}
              {index < current ? (
                <a
                  href={hrefs[name]}
                  onClick={follow(name)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md pr-1 font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {number}
                  {label}
                </a>
              ) : (
                <span
                  aria-current={index === current ? 'step' : undefined}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5',
                    index === current ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {number}
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
