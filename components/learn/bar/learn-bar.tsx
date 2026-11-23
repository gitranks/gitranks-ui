'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef } from 'react';

import { formatFull } from '@/badge/v3/format';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { revealSideways } from '@/components/workspace/workspace-tabs-nav';
import {
  LEARN_BAR_LINKS,
  LEARN_BAR_TABS,
  type LearnBarPlace,
  type LearnBarState,
  learnBarTabsOf,
} from '@/lib/learn/learn-bar';
import { cn } from '@/lib/utils';

/**
 * Learn's bar, as page 7's board draws it: the tabs on the left, the current one marked; on the right, quiet outlined
 * items for what waits for the person ("Pull requests", "Review" with how many) or "Set up Learn". A count shows only
 * when there is something to count. On a phone the tabs scroll sideways under the right side, which stays at the edge,
 * and the current tab is scrolled into sight.
 */
export function LearnBar({ state, place }: { state: LearnBarState; place: LearnBarPlace | null }) {
  const bar = useRef<HTMLDivElement>(null);
  const tabs = learnBarTabsOf(state);
  // Progress and Settings appear once the person's bar is read: the current tab may only then be there to show.
  const shown = tabs.find((tab) => tab === place) ?? null;
  useEffect(() => {
    if (!shown) return;
    const tab = bar.current?.querySelector<HTMLElement>(`ul [data-learn-tab="${shown}"]`);
    const list = tab?.closest('ul');
    if (tab && list) revealSideways(list, tab);
  }, [shown]);

  return (
    <div ref={bar} data-learn-bar={state.kind}>
      <TabsBar end={barEndOf(state, place)}>
        {tabs.map((tab) => (
          <Tab key={tab} href={LEARN_BAR_TABS[tab].href} active={place === tab} data={{ 'data-learn-tab': tab }}>
            {LEARN_BAR_TABS[tab].label}
          </Tab>
        ))}
      </TabsBar>
    </div>
  );
}

/** The right side: nothing for a visitor, "Set up Learn" before setup, a learner's items when they have something. */
function barEndOf(state: LearnBarState, place: LearnBarPlace | null): ReactNode {
  if (state.kind === 'visitor') return null;
  if (state.kind === 'setup') {
    return (
      <Link
        href={LEARN_BAR_LINKS.setup}
        prefetch={false}
        aria-current={place === 'setup' ? 'page' : undefined}
        data-learn-bar-item="setup"
        className="relative inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary after:absolute after:inset-x-0 after:-inset-y-[9px] after:content-[''] sm:after:hidden bg-brand-soft px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-brand-soft-foreground shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_22%,transparent)]"
      >
        <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-primary" />
        Set up Learn
      </Link>
    );
  }
  const items: ReactNode[] = [];
  if (state.pullRequests) {
    items.push(
      <BarItem
        key="pull-requests"
        href={LEARN_BAR_LINKS.pullRequests}
        current={place === 'pull-requests'}
        count={state.pullRequestsNeedYou}
        countLabel="need you"
        item="pull-requests"
      >
        Pull requests
      </BarItem>,
    );
  }
  if (state.due > 0) {
    items.push(
      <BarItem
        key="review"
        href={LEARN_BAR_LINKS.review}
        current={place === 'review'}
        count={state.due}
        countLabel={state.due === 1 ? 'lesson due' : 'lessons due'}
        item="review"
      >
        Review
      </BarItem>,
    );
  }
  return items.length ? items : null;
}

/** One quiet outlined item: a dashed edge, or a solid one while it is the current place; its count when above zero. */
function BarItem({
  href,
  current,
  count,
  countLabel,
  item,
  children,
}: {
  href: Route;
  current: boolean;
  count: number;
  countLabel: string;
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
        // A 44px tall target on a phone, the drawn item unchanged.
        "after:absolute after:inset-x-0 after:-inset-y-[9px] after:content-[''] sm:after:hidden",
        current ? 'border-foreground' : 'border-dashed',
      )}
    >
      {children}
      {count > 0 ? (
        <>
          {' '}
          <span className="rounded-full bg-brand-soft px-1.5 font-mono text-[11px] font-semibold tabular-nums text-brand-soft-foreground">
            {formatFull(count)}
          </span>
          <span className="sr-only"> {countLabel}</span>
        </>
      ) : null}
    </Link>
  );
}
