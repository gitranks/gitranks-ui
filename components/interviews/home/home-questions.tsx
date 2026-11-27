'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { HOME_QUESTIONS } from '@/lib/interviews/home';
import { cn } from '@/lib/utils';

/** The landing's questions: each answer opens in place, under its own line, and the others stay as they are. */
export function HomeQuestions() {
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set());
  const id = useId();
  const toggle = (index: number) =>
    setOpened((now) => {
      const next = new Set(now);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  return (
    <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0">
      {HOME_QUESTIONS.map((entry, index) => {
        const open = opened.has(index);
        const answerId = `${id}-answer-${index}`;
        return (
          <li key={entry.question} className="border-t first:border-t-0">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={answerId}
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              {entry.question}
              <ChevronDown
                className={cn('size-3.5 shrink-0 text-muted-foreground', open && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
            <p id={answerId} hidden={!open} className="m-0 px-3 pb-3 text-sm text-muted-foreground">
              {entry.answer}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
