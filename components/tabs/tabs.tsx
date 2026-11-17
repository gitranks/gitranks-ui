'use client';

import type { Route } from 'next';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { FC, ReactNode } from 'react';

import { formatFull } from '@/badge/v3/format';
import { useReportPendingNavigation } from '@/components/navigation-progress/navigation-progress';
import { cn } from '@/lib/utils';

type TabProps = {
  href: string;
  children: ReactNode;
  exact?: boolean;
  pathnames?: string[];
  /** A number after the label, in a small pill: how many the tab holds. */
  count?: number;
  /** Classes for the tab's list item, as one held at the end of the bar. */
  className?: string;
};

/**
 * Underlines the clicked tab at once and shows the progress bar while its page loads: tab pages
 * have no loading.tsx, so the current page stays on screen until the next one is ready. The
 * underline takes the active colour, since the pointer is usually still over the tab and the
 * hover border would hide a muted one.
 */
const TabPendingHint: FC = () => {
  const { pending } = useLinkStatus();
  useReportPendingNavigation(pending);

  return (
    <span
      aria-hidden
      className={cn(
        'absolute inset-x-0 -bottom-0.5 h-0.5 bg-foreground opacity-0 transition-opacity',
        pending && 'opacity-100',
      )}
    />
  );
};

export const Tab: FC<TabProps> = ({ href, children, exact, pathnames, count, className }) => {
  const pathname = usePathname();
  let active = false;

  if (exact) {
    active = pathname === href;
  } else if (pathnames && pathnames.length > 0) {
    active = pathnames.includes(pathname);
  } else {
    active = pathname.startsWith(href);
  }

  return (
    <li className={cn('shrink-0 sm:me-2', className)}>
      <Link
        href={href as Route}
        prefetch={false}
        aria-current={active ? 'page' : undefined}
        className={cn('relative inline-block whitespace-nowrap px-3 pb-4 sm:px-4 border-b-2 rounded-t-lg', {
          'border-transparent hover:border-muted-foreground': !active,
          'border-foreground text-foreground font-semibold': active,
        })}
      >
        {children}
        {/* A real space before the count, so the label and the count are read as two words; the margin tops the gap up. */}
        {count === undefined ? null : (
          <>
            {' '}
            <span
              data-tab-count=""
              className={cn(
                'ms-0.5 rounded-full bg-muted px-1.5 font-mono text-[11px] tabular-nums',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {formatFull(count)}
            </span>
          </>
        )}
        <TabPendingHint />
      </Link>
    </li>
  );
};
