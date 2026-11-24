import type { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TabsBarProps = {
  children: ReactNode;
  className?: string;
  /**
   * What stays at the bar's right edge (quiet items such as a count to act on). The tabs scroll sideways under it on a
   * phone, so it is never scrolled out of sight.
   */
  end?: ReactNode;
};

/**
 * On a phone the tabs scroll sideways: their right edge fades out, so a tab cut by the edge reads as more to scroll to,
 * not as a cut word; a blank as wide as the fade ends the list, so the last tab scrolls clear of it.
 */
const PHONE_SCROLL =
  "max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] max-sm:after:w-8 max-sm:after:shrink-0 max-sm:after:content-['']";

export const TabsBar: FC<TabsBarProps> = ({ children, className, end }) => {
  if (!end) {
    return (
      <div className={cn('text-sm text-center text-muted-foreground border-b', className)}>
        <ul className={cn('mx-auto flex w-full max-w-7xl -mb-px overflow-x-auto [scrollbar-width:none]', PHONE_SCROLL)}>
          {children}
        </ul>
      </div>
    );
  }
  return (
    <div className={cn('text-sm text-center text-muted-foreground border-b', className)}>
      <div className="mx-auto flex w-full max-w-7xl items-end">
        <ul className={cn('flex min-w-0 flex-1 -mb-px overflow-x-auto [scrollbar-width:none]', PHONE_SCROLL)}>
          {children}
        </ul>
        <div className="relative flex shrink-0 items-center gap-2 bg-background ps-2.5 pe-3 pb-2 max-sm:shadow-[-14px_0_12px_-8px_var(--background)] sm:px-4">
          {end}
        </div>
      </div>
    </div>
  );
};
