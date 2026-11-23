import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A key as the boards draw it: a small keycap, its bottom edge thicker. `onPrimary` sits inside the main button. */
export function Kbd({
  children,
  onPrimary,
  className,
}: {
  children: ReactNode;
  onPrimary?: boolean;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        'inline-grid h-[22px] min-w-[22px] place-items-center rounded-[5px] border border-b-2 px-[5px] font-mono text-[11px] leading-none',
        onPrimary
          ? 'border-primary-foreground/40 bg-transparent text-primary-foreground'
          : 'bg-card text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

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
