'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * One in-page view: its name, its address, an optional count, and the end of the paths that show it (`/lesson`); the
 * first view without one shows on every other path.
 */
export type ViewTab = { key: string; label: string; href: Route; count?: number; pathEnds?: string };

/**
 * In-page tabs as links (W1 §11): the pull request's two views, a progress page's views. The tab whose path end the
 * browser's path has is the current one. A row of links, never a tablist: each view has its own address.
 */
export function ViewTabs({ tabs, label, className }: { tabs: ViewTab[]; label: string; className?: string }) {
  const pathname = usePathname();
  const path = pathname.replace(/\/+$/, '');
  const current =
    tabs.find((tab) => tab.pathEnds && path.endsWith(tab.pathEnds))?.key ?? tabs.find((tab) => !tab.pathEnds)?.key;
  return (
    <nav
      aria-label={label}
      data-view-tabs=""
      className={cn(
        '-mx-4 flex gap-5 overflow-x-auto px-4 shadow-[inset_0_-1px_0_var(--color-border)] sm:mx-0 sm:px-0',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.key === current;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            prefetch={false}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            data-view={tab.key}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent text-sm whitespace-nowrap text-muted-foreground hover:text-foreground',
              active && 'border-foreground font-medium text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-muted px-1.5 font-mono text-[11px] text-foreground/70 tabular-nums">
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
