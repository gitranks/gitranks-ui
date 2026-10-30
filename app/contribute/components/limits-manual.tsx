'use client';

import {
  type ManualField,
  type ManualLimitsDraft,
  manualLimitsOf,
  manualSummaryOf,
} from '@/lib/contribute/connect-limits';
import type { ContributeConnectPace } from '@/lib/contribute/contribute.types';
import { cn } from '@/lib/utils';

const inputClass =
  'min-h-11 w-full rounded-[10px] border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-red-600 dark:aria-invalid:border-red-400';

const PACES: { pace: ContributeConnectPace; title: string; text: string }[] = [
  {
    pace: 'EVEN',
    title: 'Spread across the month',
    text: "The budget builds up day by day; the last days use what's left",
  },
  { pace: 'FAST', title: 'As fast as the caps allow', text: 'Attempts run back to back until a cap is reached' },
];

const OPTIONAL: { field: Exclude<ManualField, 'month'>; label: string; placeholder?: string }[] = [
  { field: 'week', label: 'Each week', placeholder: 'No cap' },
  { field: 'day', label: 'Each day', placeholder: 'No cap' },
  { field: 'attempt', label: 'Each attempt' },
];

/**
 * "I'll set them myself": the monthly cap (required), the week, day and attempt caps, and the pace, with a live line
 * of what they add up to. The attempt cap may not be above a cap that is set; the line says so as it is typed.
 */
export function LimitsManual({
  id,
  draft,
  onChange,
}: {
  id: string;
  draft: ManualLimitsDraft;
  onChange: (draft: ManualLimitsDraft) => void;
}) {
  const result = manualLimitsOf(draft);
  const refused = result.ok ? null : result.field;
  const set = (field: ManualField) => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...draft, [field]: event.target.value });

  return (
    <div className="flex flex-col gap-4" data-limits="manual">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-month`} className="text-sm font-semibold">
          Each month <span className="font-medium text-muted-foreground">· required</span>
        </label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-[15px] text-muted-foreground">
            $
          </span>
          <input
            id={`${id}-month`}
            inputMode="decimal"
            value={draft.month}
            onChange={set('month')}
            aria-invalid={refused === 'month' || undefined}
            aria-describedby={`${id}-month-hint`}
            className={cn(inputClass, 'w-35 border-2 border-primary px-3 text-[15px] font-semibold')}
          />
        </div>
        <span id={`${id}-month-hint`} className="text-[13px] text-muted-foreground">
          The most the agent may spend from your API credits between two resets.
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2.5">
          {OPTIONAL.map(({ field, label, placeholder }) => (
            <div key={field} className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`${id}-${field}`} className="text-[13px] font-semibold">
                {label}
              </label>
              <input
                id={`${id}-${field}`}
                inputMode="decimal"
                value={draft[field]}
                onChange={set(field)}
                placeholder={placeholder}
                aria-invalid={refused === field || undefined}
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <span className="text-[13px] text-muted-foreground">
          Optional. Leave week and day empty and pacing spreads the month for you. An attempt stops when it reaches its
          cap.
        </span>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-semibold">Pacing</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PACES.map(({ pace, title, text }) => {
            const on = draft.pace === pace;
            return (
              <button
                key={pace}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...draft, pace })}
                className={cn(
                  'flex min-h-16 flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                  on
                    ? 'border-2 border-primary bg-violet-50 dark:bg-violet-950/40'
                    : 'border border-input bg-background hover:bg-accent',
                )}
              >
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-muted-foreground">{text}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div
        role="status"
        data-limits-summary={result.ok ? 'ok' : refused}
        className={cn(
          'rounded-xl px-3.5 py-3 text-sm',
          result.ok
            ? 'bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100'
            : 'bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100',
        )}
      >
        {manualSummaryOf(draft)}
      </div>
    </div>
  );
}
