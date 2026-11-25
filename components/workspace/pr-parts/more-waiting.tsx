'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { onlyYouUrlOf, onlyYouWordsOf } from '@/lib/workspace/pull-request-page';
import type { PullRequestOnlyYou, PullRequestPage } from '@/lib/workspace/pull-request-page.types';

/**
 * The things only the person can do that the box does not show: while the box is about one (`ONLY_YOU`), the others;
 * in any other state, all of them.
 */
export const moreWaitingOf = (page: Pick<PullRequestPage, 'box' | 'onlyYou'>): readonly PullRequestOnlyYou[] =>
  page.box === 'ONLY_YOU' ? page.onlyYou.slice(1) : page.onlyYou;

/**
 * The box's last line: "N more waiting", which opens the rest in place, each a row with its words and its own button.
 * Nothing when none is left. It comes with the box's own read, so it draws with the box and moves nothing under it.
 */
export function MoreWaiting({
  items,
  onOnlyYou,
  initialOpen = false,
}: {
  items: readonly PullRequestOnlyYou[];
  onOnlyYou?: (kind: string, which: 'main' | 'alt') => void;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  if (!items.length) return null;
  return (
    // The box is a live region for where the pull request stands; opening this list is the person's own press, so it
    // is not read out again.
    <div aria-live="off" className="mt-1 flex flex-col gap-2 border-t pt-3" data-more-waiting="">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-link hover:underline sm:min-h-0"
        onClick={() => setOpen((was) => !was)}
      >
        {items.length} more waiting
        <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      <ul id={id} hidden={!open} className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {items.map((item, index) => {
          const words = onlyYouWordsOf(item);
          const external = words.external ? onlyYouUrlOf(item) : null;
          return (
            <li
              // Two items may be of one kind; their place in the list tells them apart.
              key={`${item.kind}-${index}`}
              className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4"
              data-more-waiting-item={item.kind}
            >
              <span className="min-w-0 flex-1 text-sm text-foreground">{item.text}</span>
              {external ? (
                <Button asChild variant="outline" className="h-9 self-start px-4 max-sm:min-h-11 sm:self-center">
                  <a href={external} target="_blank" rel="noopener noreferrer">
                    {words.short} <span aria-hidden="true">↗</span>
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
              ) : onOnlyYou ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 self-start px-4 max-sm:min-h-11 sm:self-center"
                  onClick={() => onOnlyYou(item.kind, 'main')}
                >
                  {words.short}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
