'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TabProps = {
  href: string;
  children: ReactNode;
  exact?: boolean;
  pathnames?: string[];
};

export const Tab: FC<TabProps> = ({ href, children, exact, pathnames }) => {
  const pathname = usePathname();
  let active = false;

  if (exact) {
    active = pathname === href;
  } else if (pathnames && pathnames.length > 0) {
    active = pathnames.some((path) => pathname === path);
  } else {
    active = pathname.startsWith(href);
  }

  return (
    <li className="me-2">
      <Link
        href={href as Route}
        className={cn('inline-block p-4 pt-0 border-b-2 rounded-t-lg', {
          'border-transparent hover:border-muted-foreground': !active,
          'border-foreground text-foreground font-semibold': active,
        })}
      >
        {children}
      </Link>
    </li>
  );
};
