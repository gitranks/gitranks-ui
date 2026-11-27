'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useId, useState } from 'react';

import { ABOUT_QUESTIONS } from '@/lib/interviews/about';

/**
 * The questions of How it works: each opens its answer in place, under its own line, and the others stay as they
 * are. The answers are in the page as the server renders it, so a search engine and a reader without scripts see
 * the questions and a screen reader is told which is open.
 */
export function AboutQuestions() {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const base = useId();
  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(index)) next.add(index);
      return next;
    });

  return (
    <ul className="m-0 flex list-none flex-col rounded-lg border bg-card p-0" data-interviews-about-questions="">
      {ABOUT_QUESTIONS.map((entry, index) => {
        const expanded = open.has(index);
        const answerId = `${base}-answer-${index}`;
        const Chevron = expanded ? ChevronUp : ChevronDown;
        return (
          <li key={entry.question} className="border-t first:border-t-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={answerId}
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset max-sm:min-h-11"
            >
              {entry.question}
              <span className="text-muted-foreground">
                <Chevron className="size-3.5 shrink-0" aria-hidden="true" />
              </span>
            </button>
            <p id={answerId} hidden={!expanded} className="m-0 max-w-[66ch] px-3 pb-3 text-sm text-muted-foreground">
              {entry.answer}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
