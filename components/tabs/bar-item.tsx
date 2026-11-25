import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { formatFull } from '@/badge/v3/format';
import { cn } from '@/lib/utils';

/*
 * The quiet items at a bar's right edge (`TabsBar`'s `end`), shared by Learn's bar and the workspace's: what waits for
 * the person, and the door into the other product.
 */

/** A 44px tall target on a phone, the drawn item unchanged. */
export const PHONE_TARGET = "after:absolute after:inset-x-0 after:-inset-y-[9px] after:content-[''] sm:after:hidden";

/** An item's count: a small pill, with words after it for screen readers alone. Drawn only above zero. */
export function BarCount({ count, label }: { count: number; label: string }) {
  if (!(count > 0)) return null;
  return (
    <>
      {' '}
      <span className="rounded-full bg-brand-soft px-1.5 font-mono text-[11px] font-semibold tabular-nums text-brand-soft-foreground">
        {formatFull(count)}
      </span>
      <span className="sr-only"> {label}</span>
    </>
  );
}

/**
 * One quiet outlined item: a dashed edge, or a solid one while it is the current place; its count when above zero.
 * `countSlot` takes the count's place for a count read later, in the browser: the item draws it as given.
 */
export function BarItem({
  href,
  current,
  count = 0,
  countLabel = '',
  countSlot,
  item,
  children,
}: {
  href: Route;
  current: boolean;
  count?: number;
  countLabel?: string;
  countSlot?: ReactNode;
  /** The item's name in `data-learn-bar-item`. */
  item: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={current ? 'page' : undefined}
      data-learn-bar-item={item}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap text-foreground',
        PHONE_TARGET,
        current ? 'border-foreground' : 'border-dashed',
      )}
    >
      {children}
      {countSlot ?? <BarCount count={count} label={countLabel} />}
    </Link>
  );
}
