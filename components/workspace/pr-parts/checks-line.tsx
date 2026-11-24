'use client';

import { useId, useState } from 'react';

import { cn } from '@/lib/utils';
import { githubUrlOf } from '@/lib/workspace/attempt-format';
import { CHECK_CLASS_WORDS, type CheckChip, checkChipsOf } from '@/lib/workspace/pull-request-page';
import type { PullRequestChecks } from '@/lib/workspace/pull-request-page.types';

const CHIP_CLASSES: Record<CheckChip['key'], string> = {
  pass: 'bg-positive/10 text-positive',
  AGENT_CAN_FIX: 'border text-foreground',
  NEEDS_YOU: 'bg-brand-soft text-brand-soft-foreground',
  NOT_YOURS: 'bg-muted text-muted-foreground',
};

/**
 * The checks, sorted by who can act: one line of counts as chips (pass, your agent can fix, needs you, not yours to
 * fix), and "Show the N that do not pass", which opens a row for each with its name, whose it is, why, and its page
 * on GitHub. Passing checks are counted, never listed.
 */
export function ChecksLine({ checks, initialOpen = false }: { checks: PullRequestChecks; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  const chips = checkChipsOf(checks);
  const failing = checks.rows.length;
  return (
    <div className="flex flex-col gap-2" data-checks="">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className={cn('rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap', CHIP_CLASSES[chip.key])}
            data-check-chip={chip.key}
          >
            {chip.text}
          </span>
        ))}
        {failing ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            className="min-h-11 text-sm font-semibold text-link hover:underline sm:min-h-0"
            onClick={() => setOpen((was) => !was)}
          >
            {open ? `Hide the ${failing} that do not pass` : `Show the ${failing} that do not pass`}
          </button>
        ) : null}
      </div>
      {failing ? (
        <ul id={id} hidden={!open} className="m-0 list-none divide-y overflow-hidden rounded-lg border p-0">
          {checks.rows.map((row) => {
            const url = githubUrlOf(row.url);
            return (
              <li
                key={`${row.name}-${row.class}`}
                className="flex flex-col gap-1 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center sm:gap-3"
                data-check-row={row.class}
              >
                <span className="font-mono text-xs font-semibold text-foreground sm:w-40 sm:shrink-0">{row.name}</span>
                <span className="font-medium whitespace-nowrap text-foreground sm:w-36 sm:shrink-0">
                  {CHECK_CLASS_WORDS[row.class]}
                </span>
                <span className="min-w-0 flex-1 text-muted-foreground">{row.reason}</span>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold whitespace-nowrap text-link hover:underline"
                  >
                    GitHub <span aria-hidden="true">↗</span>
                    <span className="sr-only">(opens {row.name} on GitHub)</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
