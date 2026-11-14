'use client';

import { useId, useState } from 'react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EXAMPLE_LESSON } from '@/lib/learn/example-lesson';
import { cn } from '@/lib/utils';

const { question } = EXAMPLE_LESSON;
const RIGHT = question.options.find((option) => option.correct)?.id ?? '';

/**
 * The example's question, to try: the right answer is picked to start with, and a wrong pick says it is not the
 * cause. It sends nothing anywhere.
 */
export function ExampleQuestion() {
  const [picked, setPicked] = useState<string>(RIGHT);
  const id = useId();
  return (
    <div className="flex flex-col gap-2 border-t bg-muted/40 p-4">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        One question per step
      </span>
      <span id={`${id}-prompt`} className="text-sm font-medium">
        {question.prompt}
      </span>
      <RadioGroup aria-labelledby={`${id}-prompt`} value={picked} onValueChange={setPicked} className="gap-2">
        {question.options.map((option) => {
          const on = picked === option.id;
          return (
            <label
              key={option.id}
              htmlFor={`${id}-${option.id}`}
              data-example-option={option.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm max-sm:min-h-11',
                on && option.correct && 'border-positive/30 bg-positive/10',
                on && !option.correct && 'border-warning/40 bg-warning-soft text-warning-soft-foreground',
              )}
            >
              <RadioGroupItem
                id={`${id}-${option.id}`}
                value={option.id}
                aria-labelledby={`${id}-${option.id}-text`}
                className="mt-0.5"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span id={`${id}-${option.id}-text`}>{option.text}</span>
                {on && !option.correct ? (
                  <span className="text-xs">Not this: the cache kept its entries. Try the other one.</span>
                ) : null}
              </span>
              {on && option.correct ? (
                <span className="ms-auto flex-none font-bold text-positive" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </label>
          );
        })}
      </RadioGroup>
      <span role="status" aria-live="polite" className="sr-only">
        {picked === RIGHT ? 'Right.' : 'Not right yet.'}
      </span>
    </div>
  );
}
