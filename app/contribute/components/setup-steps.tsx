import { cn } from '@/lib/utils';

export const SETUP_STEPS = ['Claude key', 'Limits', 'GitHub access', 'What you like to work on'] as const;

/** The connect flow's four steps; `current` is 1-based, past the last when all are done. */
export function SetupSteps({ current }: { current: number }) {
  return (
    <ol aria-label="Setup steps" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {SETUP_STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-col gap-2">
            <span className={cn('h-1 rounded-sm', done || active ? 'bg-primary' : 'bg-border')} />
            <span
              className={cn(
                'text-sm',
                active ? 'font-semibold text-violet-700 dark:text-violet-300' : 'text-muted-foreground',
              )}
            >
              {step} · {label}
              {done ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
