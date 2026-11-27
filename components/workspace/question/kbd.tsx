import { Fragment } from 'react';

import { Kbd } from '@/components/workspace/kbd';
import { cn } from '@/lib/utils';

/** One group of the line of keys: its keys, then what they do. */
export type KeyLineItem = { keys: string[]; does: string };

/**
 * The line of keys under a question: each group's keys, then what they do. It keeps its height without hints, so the
 * page below it does not move when the first key is pressed.
 */
export function KeyLine({ items, hints, className }: { items: KeyLineItem[]; hints: boolean; className?: string }) {
  return (
    <div
      className={cn('flex min-h-8 flex-wrap items-center gap-2 text-xs text-muted-foreground', className)}
      data-key-line=""
    >
      {hints
        ? items.map((item) => (
            <Fragment key={item.does}>
              {item.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
              <span>{item.does}</span>
            </Fragment>
          ))
        : null}
    </div>
  );
}
