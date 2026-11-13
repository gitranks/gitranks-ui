import { Pill } from '@/app/contribute/components/primitives';
import { Badge } from '@/components/ui/badge';
import type { LessonStep, LessonStepResult } from '@/lib/learn/learn.types';
import { isStepDone, partsLabelOf, STEP_BADGES } from '@/lib/learn/question';
import { cn } from '@/lib/utils';

/** A step's anchor on the page. */
export const stepAnchorOf = (step: Pick<LessonStep, 'id'>) => `step-${step.id}`;

function StepBadge({ result }: { result: LessonStepResult | undefined }) {
  if (!result || result.state === 'OPEN') return null;
  const badge = STEP_BADGES[result.state];
  return badge.tone === 'neutral' ? (
    <Badge variant="secondary">{badge.label}</Badge>
  ) : (
    <Pill tone={badge.tone}>{badge.label}</Pill>
  );
}

/**
 * The lesson's steps beside it (in a row that scrolls on a phone): each with what it covers, its title and how it went.
 * The step being shown is ringed. A step the user has reached opens when clicked (`onOpen`); the ones ahead wait.
 */
export function LessonSteps({
  steps,
  results,
  shownId,
  reachable,
  onOpen,
}: {
  steps: readonly LessonStep[];
  results: readonly LessonStepResult[];
  /** The step being shown; none on the warm-up and the summary. */
  shownId?: string | null;
  /** The steps the user may open: the ones passed and the current one. */
  reachable?: ReadonlySet<string>;
  onOpen?: (stepId: string) => void;
}) {
  const byStep = new Map(results.map((result) => [result.stepId, result]));
  const passed = steps.filter((step) => isStepDone(byStep.get(step.id))).length;
  return (
    <nav aria-label="Lesson steps" className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Lesson</h2>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {passed} of {steps.length} passed
        </span>
      </div>
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {steps.map((step, index) => {
          const result = byStep.get(step.id);
          const shown = step.id === shownId;
          const open = !!onOpen && (reachable?.has(step.id) ?? false);
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={cn('text-sm font-semibold', !isStepDone(result) && !shown && 'text-muted-foreground')}>
                  {index + 1} · {partsLabelOf(step)}
                </span>
                <StepBadge result={result} />
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{step.title}</span>
            </>
          );
          const box = cn(
            'flex min-w-0 flex-col gap-1 rounded-xl border px-3 py-2.5 text-start text-foreground',
            shown && 'border-primary bg-brand-soft/40 ring-1 ring-primary',
          );
          return (
            <li key={step.id} className="w-56 shrink-0 lg:w-auto" data-step={step.id} data-state={result?.state}>
              {open ? (
                <a
                  href={`#${stepAnchorOf(step)}`}
                  aria-current={shown ? 'step' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onOpen?.(step.id);
                  }}
                  className={cn(box, 'hover:border-primary/40')}
                >
                  {body}
                </a>
              ) : (
                <div className={box} aria-current={shown ? 'step' : undefined}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
