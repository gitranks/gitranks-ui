'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef } from 'react';

import { formatFull } from '@/badge/v3/format';
import { revealSideways } from '@/components/tabs/reveal-sideways';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import {
  LEARN_BAR_LINKS,
  LEARN_BAR_TABS,
  type LearnBarPlace,
  type LearnBarSetup,
  type LearnBarState,
  learnBarTabsOf,
} from '@/lib/learn/learn-bar';
import { cn } from '@/lib/utils';

/**
 * Learn's bar, as page 7's board draws it: the tabs on the left, the current one marked; on the right, "Set up Learn"
 * until the person saves their setup, then quiet outlined items for what waits for them ("Pull requests", "Review"
 * with how many). A count shows only when there is something to count. On a phone the tabs scroll sideways under the
 * right side, which stays at the edge, and the current tab is scrolled into sight.
 */
export function LearnBar({
  state,
  place,
  signedOut = false,
}: {
  state: LearnBarState;
  place: LearnBarPlace | null;
  /** The session said nobody is signed in: a visitor's bar, whatever the browser's hint says. */
  signedOut?: boolean;
}) {
  const bar = useRef<HTMLDivElement>(null);
  // Until the person's bar is read, a browser holding a session draws a signed-in person's tabs from the first paint
  // (the hint, set before it), so the bar does not grow under the reader when the read comes in.
  const own = learnBarTabsOf(state);
  const tabs = state.kind === 'visitor' && !signedOut ? learnBarTabsOf({ kind: 'learner', ...NOTHING_WAITING }) : own;
  // Progress and Settings appear once the person's bar is read: the current tab may only then be there to show.
  const shown = tabs.find((tab) => tab === place) ?? null;
  useEffect(() => {
    if (!shown) return;
    const tab = bar.current?.querySelector<HTMLElement>(`ul [data-learn-tab="${shown}"]`);
    const list = tab?.closest('ul');
    if (!tab || !list) return;
    revealSideways(list, tab);
    // The right side fills in once the person's bar is read and narrows the list: the tab is shown again then, and
    // whenever else the list's box changes (a phone turned).
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => revealSideways(list, tab));
    observer.observe(list);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div ref={bar} data-learn-bar={state.kind}>
      <TabsBar end={barEndOf(state, place)}>
        {tabs.map((tab) => (
          <Tab
            key={tab}
            href={LEARN_BAR_TABS[tab].href}
            active={place === tab}
            data={{ 'data-learn-tab': tab }}
            className={own.includes(tab) ? undefined : 'hidden [html[data-has-session]_&]:list-item'}
          >
            {LEARN_BAR_TABS[tab].label}
          </Tab>
        ))}
      </TabsBar>
    </div>
  );
}

const NOTHING_WAITING = { due: 0, pullRequests: false, pullRequestsNeedYou: 0 };

/**
 * The right side: nothing for a visitor; before setup, "Set up Learn" first; then what waits for the person: their pull
 * requests and the lessons due. Only the setup tab is highlighted; the rest are quiet notices.
 */
function barEndOf(state: LearnBarState, place: LearnBarPlace | null): ReactNode {
  if (state.kind === 'visitor') return null;
  const items: ReactNode[] = [];
  if (state.kind === 'setup') {
    items.push(<SetupTab key="setup" state={state.setup} current={place === 'setup'} />);
  }
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

/** A 44px tall target on a phone, the drawn item unchanged. */
const PHONE_TARGET = "after:absolute after:inset-x-0 after:-inset-y-[9px] after:content-[''] sm:after:hidden";

/**
 * "Set up Learn", as page 5's board draws it: quiet with a spinner while our guess runs; highlighted with a dot once
 * it is in, with one pulse when it becomes so (on each visit, never a constant blink, and none for people who turned
 * motion off); a plain outline when there is no guess to check; solid while it is the current place.
 */
function SetupTab({ state, current }: { state: LearnBarSetup; current: boolean }) {
  const look = current ? 'current' : state;
  return (
    <Link
      href={LEARN_BAR_LINKS.setup}
      prefetch={false}
      aria-current={current ? 'page' : undefined}
      data-learn-bar-item="setup"
      data-learn-setup-tab={look}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        PHONE_TARGET,
        look === 'current' && 'border-foreground bg-foreground text-background',
        look === 'working' && 'text-muted-foreground',
        look === 'open' && 'text-foreground',
        look === 'guessed' &&
          'border-primary bg-brand-soft text-brand-soft-foreground shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_22%,transparent)] motion-safe:animate-learn-setup-pulse',
      )}
    >
      {look === 'working' ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="size-[13px] shrink-0 motion-safe:animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
      ) : null}
      {look === 'guessed' ? <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-primary" /> : null}
      Set up Learn
      {look === 'working' ? <span className="sr-only">, reading your GitHub profile</span> : null}
      {look === 'guessed' ? <span className="sr-only">, our guess is ready to check</span> : null}
      {look === 'open' ? <span className="sr-only">, nothing to check yet</span> : null}
    </Link>
  );
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
        PHONE_TARGET,
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
