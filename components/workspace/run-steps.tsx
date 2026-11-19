'use client';

import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { ContributeAgentRun } from '@/lib/workspace/contribute.types';
import { stepMarksOf, stepsLabelOf, stepsOf } from '@/lib/workspace/run-steps';

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

/** "This run's steps": each step with a mark and a word for screen readers (done, now, left). */
export function RunStepsList({ run }: { run: StepsRun }) {
  return (
    <ol className="flex flex-col gap-1.5 text-sm" data-run-steps-list="">
      {stepMarksOf(run).map(({ name, mark }) => (
        <li key={name} className="flex items-center gap-2" data-step={mark}>
          {mark === 'done' ? (
            <Check aria-hidden="true" className="size-3.5 flex-none text-primary" />
          ) : mark === 'now' ? (
            <span aria-hidden="true" className="flex size-3.5 flex-none items-center justify-center">
              <span className="size-2 rounded-full bg-primary" />
            </span>
          ) : (
            <span aria-hidden="true" className="flex size-3.5 flex-none items-center justify-center">
              <span className="size-2.5 rounded-full border border-muted-foreground/50" />
            </span>
          )}
          <span className={cn(mark === 'left' && 'text-muted-foreground', mark === 'now' && 'font-semibold')}>
            {name}
            <span className="sr-only">{mark === 'done' ? ', done' : mark === 'now' ? ', now' : ', left'}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The bars as a button that opens "This run's steps": on hover, on keyboard focus, and on a tap (a touch screen has
 * no hover; a tap outside closes it). The card holds no link and no number that is not also on the row.
 */
export function RunStepsCard({ run }: { run: StepsRun }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const { steps, at } = stepsOf(run);

  // Opened by a tap: a tap anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || card.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-expanded={open}
          data-run-steps={`${Math.min(at + 1, steps.length)}/${steps.length}`}
          className="-my-2 flex min-h-8 items-center gap-1 rounded-sm px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-sm:min-h-11"
        >
          <span className="sr-only">{stepsLabelOf(run)}</span>
          <Bars run={run} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent ref={card} align="start" className="w-60 p-3.5" data-run-steps-card="">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">This run&apos;s steps</p>
        <RunStepsList run={run} />
      </HoverCardContent>
    </HoverCard>
  );
}
