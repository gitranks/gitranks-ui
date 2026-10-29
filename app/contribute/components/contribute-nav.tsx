'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export const CONTRIBUTE_TABS: { href: Route; label: string }[] = [
  { href: '/contribute', label: 'Overview' },
  { href: '/contribute/issues', label: 'Issues for you' },
  { href: '/contribute/me', label: 'My contributions' },
  { href: '/contribute/settings', label: 'Settings' },
];

/** Contribute's own bar, under the site header. */
export function ContributeNav() {
  const pathname = usePathname();
  // The connect flow belongs to the overview.
  const current = CONTRIBUTE_TABS.findLast(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="border-b">
      <nav aria-label="Contribute" className="mx-auto flex max-w-7xl flex-wrap gap-6 px-4 text-sm">
        {CONTRIBUTE_TABS.map(({ href, label }) => {
          const active = current?.href === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'border-b-2 py-3 transition-colors',
                active
                  ? 'border-primary font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
