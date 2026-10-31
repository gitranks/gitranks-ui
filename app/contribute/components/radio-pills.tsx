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
  return (value: T) => {
    clearTimeout(timer.current);
    waiting.current = { value };
    timer.current = setTimeout(() => {
      waiting.current = null;
      latest.current(value);
    }, ms);
  };
}

/** Choices as pills: native radios, so arrows move between them and the group is read as one. */
export function RadioPills<T extends string>({
  legend,
  legendClassName,
  options,
  value,
  onChange,
  className,
}: {
  legend: ReactNode;
  legendClassName?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
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
