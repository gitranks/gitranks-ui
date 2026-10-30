'use client';

import type { Route } from 'next';
import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { FC, ReactNode } from 'react';

import { useReportPendingNavigation } from '@/components/navigation-progress/navigation-progress';
import { cn } from '@/lib/utils';

type TabProps = {
  href: string;
  children: ReactNode;
  exact?: boolean;
  pathnames?: string[];
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

export const Tab: FC<TabProps> = ({ href, children, exact, pathnames }) => {
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
    <li className="shrink-0 sm:me-2">
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
        <TabPendingHint />
      </Link>
    </li>
  );
};
