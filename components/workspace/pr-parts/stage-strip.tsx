import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';
import { type StripStep, stripOf } from '@/lib/workspace/pull-request-page';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';

const NUMBER = 'inline-grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold';

/** A stage's mark: a check when done, a ring that turns around its number while work goes on, else its number. */
function StepMark({ step }: { step: StripStep }) {
  if (step.state === 'done') {
    return (
      <span className="inline-grid size-5 shrink-0 place-items-center text-positive">
        <Check aria-hidden="true" className="size-3.5" />
      </span>
    );
  }
  if (step.working) {
    return (
      <span role="img" aria-label="In progress" className="relative inline-grid size-5 shrink-0 place-items-center">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="absolute inset-0 size-5 animate-spin motion-reduce:animate-none"
          data-spin=""
        >
          <circle cx="10" cy="10" r="8.75" fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <path
            d="M10 1.25a8.75 8.75 0 0 1 8.75 8.75"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-mono text-[10px] leading-none font-semibold text-foreground">{step.n}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        NUMBER,
        step.state === 'current' && 'border-primary text-foreground',
        step.state === 'stopped' && 'border-muted-foreground text-muted-foreground',
        step.state === 'todo' && 'text-muted-foreground',
      )}
    >
      {step.n}
    </span>
  );
}

const STEP_CLASSES: Record<StripStep['state'], string> = {
  done: 'border-positive/30 text-foreground',
  current: 'border-primary font-semibold text-foreground',
  stopped: 'border-muted-foreground font-semibold text-muted-foreground',
  todo: 'border-border text-muted-foreground',
};

const STATE_WORDS: Record<StripStep['state'], string> = {
  done: ', done',
  current: ', now',
  stopped: ', where it stopped',
  todo: '',
};

/**
 * The strip of stages: Learn's five (Fix, Walkthrough, Approve, Review, Merged), Contribute's four. Done stages have a
 * check, the current one is drawn in the main colour with a turning ring while work goes on, an ended pull request
 * greys the stage it stopped at. On a phone only the current stage keeps its name.
 */
export function StageStrip({ page }: { page: Pick<PullRequestPage, 'stages' | 'stage' | 'box' | 'working'> }) {
  const steps = stripOf(page);
  // The stage that keeps its name on a phone: the current one, where it stopped, or the last one once merged.
  const focus =
    steps.find((step) => step.state === 'current' || step.state === 'stopped') ??
    (steps.every((step) => step.state === 'done') ? steps[steps.length - 1] : null);
  const named = (step: StripStep) => step === focus;
  const style = {
    '--cols': `repeat(${steps.length}, minmax(0, 1fr))`,
    '--phone-cols': steps.map((step) => (named(step) ? '1fr' : 'auto')).join(' '),
  } as CSSProperties;
  return (
    <ol
      aria-label="Where this pull request stands"
      className="m-0 grid list-none grid-cols-[var(--phone-cols)] gap-2.5 p-0 sm:grid-cols-[var(--cols)] sm:gap-1.5"
      style={style}
      data-strip=""
    >
      {steps.map((step) => (
        <li
          key={step.stage}
          aria-current={named(step) && step.state !== 'done' ? 'step' : undefined}
          className={cn('flex items-center gap-2 border-b-2 pb-2.5 text-sm', STEP_CLASSES[step.state])}
          data-stage={step.stage}
          data-step-state={step.state}
        >
          <StepMark step={step} />
          <span className={cn(!named(step) && 'max-sm:hidden')}>{step.label}</span>
          <span className="sr-only">{STATE_WORDS[step.state]}</span>
        </li>
      ))}
    </ol>
  );
}
