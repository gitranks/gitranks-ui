'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Calls `save` once the user stops picking: arrowing through radios picks each one in turn, and only the last is
 * saved. Every pick before it is shown at once by the caller. A pick still waiting when the picker goes away (a step
 * of the switch moving on) is saved then.
 */
export function useSettledPick<T>(save: (value: T) => void, ms = 350) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const waiting = useRef<{ value: T } | null>(null);
  const latest = useRef(save);
  latest.current = save;
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (waiting.current) latest.current(waiting.current.value);
    },
    [],
  );
  const pick = (value: T) => {
    clearTimeout(timer.current);
    waiting.current = { value };
    timer.current = setTimeout(() => {
      waiting.current = null;
      latest.current(value);
    }, ms);
  };
  /** Saves the pick still waiting now (a field left, Enter pressed); nothing when none waits. */
  const flush = () => {
    clearTimeout(timer.current);
    const pending = waiting.current;
    waiting.current = null;
    if (pending) latest.current(pending.value);
  };
  /** Takes the pick still waiting, unsaved, for a caller that sends it in its own save; null when none waits. */
  const cancel = (): { value: T } | null => {
    clearTimeout(timer.current);
    const pending = waiting.current;
    waiting.current = null;
    return pending;
  };
  return Object.assign(pick, { flush, cancel });
}

/** Choices as pills: native radios, so arrows move between them and the group is read as one. */
export function RadioPills<T extends string>({
  legend,
  legendClassName,
  options,
  value,
  onChange,
  className,
  describedBy,
}: {
  legend: ReactNode;
  legendClassName?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** The ids of the group's hint and status, read with it. */
  describedBy?: string;
}) {
  const id = useId();
  return (
    <fieldset className={cn('flex flex-col gap-2', className)} aria-describedby={describedBy}>
      <legend className={cn('float-left mb-2 w-full text-sm font-medium', legendClassName)}>{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={`${id}-${option.value}`}
              data-pill={option.value}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                on
                  ? 'border-primary bg-brand-soft text-brand-soft-foreground'
                  : 'border-dashed text-muted-foreground hover:text-foreground',
              )}
            >
              <input
                id={`${id}-${option.value}`}
                type="radio"
                name={`${id}-pills`}
                value={option.value}
                checked={on}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * One choice of a few, as one segmented control: native radios, so arrows move between them and the group is read as
 * one, with its legend for screen readers only (the row's title says it on screen). Wraps on a phone, each choice 44 px
 * high.
 */
export function SegmentedRadios<T extends string>({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  describedBy,
  className,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** The ids of the group's hint and status, read with it. */
  describedBy?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={describedBy}
      className={cn('m-0 min-w-0 border-0 p-0 disabled:opacity-60', className)}
    >
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap gap-0.75 rounded-lg bg-muted p-0.75">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={`${id}-${option.value}`}
              data-choice={option.value}
              className={cn(
                'flex min-h-8 items-center justify-center rounded-md px-2.5 text-sm font-semibold whitespace-nowrap transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50 max-sm:min-h-11 max-sm:flex-1',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                on ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <input
                id={`${id}-${option.value}`}
                type="radio"
                name={`${id}-choice`}
                value={option.value}
                checked={on}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
