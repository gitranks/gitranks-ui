'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TabProps = {
  href: string;
  children: ReactNode;
  active?: boolean;
};

export const Tab: FC<TabProps> = ({ href, children }) => {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <li className="me-2">
      <Link
        href={href}
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
