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
  /**
   * Up to which width the tabs scroll sideways with the faded edge: `sm` (phones) by default, `lg` for a bar whose tabs
   * fit only a desktop's width (the package rankings' registries).
   */
  scrollsBelow?: 'sm' | 'lg';
  /** How wide the tabs' row is: the site's width by default; a section with a narrower reading column passes its own. */
  width?: string;
};

/**
 * On a phone the tabs scroll sideways: their right edge fades out, so a tab cut by the edge reads as more to scroll to,
 * not as a cut word; a blank as wide as the fade ends the list, so the last tab scrolls clear of it.
 */
const PHONE_SCROLL =
  "max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] max-sm:after:w-8 max-sm:after:shrink-0 max-sm:after:content-['']";
const TABLET_SCROLL =
  "max-lg:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] max-lg:after:w-8 max-lg:after:shrink-0 max-lg:after:content-['']";

export const TabsBar: FC<TabsBarProps> = ({ children, className, end, scrollsBelow = 'sm', width = 'max-w-7xl' }) => {
  const scroll = scrollsBelow === 'lg' ? TABLET_SCROLL : PHONE_SCROLL;
  if (!end) {
    return (
      <div className={cn('text-sm text-center text-muted-foreground border-b', className)}>
        <ul className={cn('mx-auto flex w-full', width, '-mb-px overflow-x-auto [scrollbar-width:none]', scroll)}>
          {children}
        </ul>
      </div>
    );
  }
  return (
    <div className={cn('text-sm text-center text-muted-foreground border-b', className)}>
      <div className={cn('mx-auto flex w-full', width, 'items-end')}>
        <ul className={cn('flex min-w-0 flex-1 -mb-px overflow-x-auto [scrollbar-width:none]', scroll)}>{children}</ul>
        <div className="relative flex shrink-0 items-center gap-2 bg-background ps-2.5 pe-3 pb-2 max-sm:shadow-[-14px_0_12px_-8px_var(--background)] sm:px-4">
          {end}
        </div>
      </div>
    </div>
  );
};
