'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';

import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { ActivityBar, ActivityDot, useWorkspaceLive } from '@/components/workspace/activity';
import { ChangesProvider } from '@/components/workspace/changes-provider';
import { HeaderLine } from '@/components/workspace/header-line';
import { scrollToHash } from '@/components/workspace/scroll-to-hash';
import { runsOf, runsTabMarkOf } from '@/lib/workspace/agent-runs';
import type { Audience } from '@/lib/workspace/audience';
import { contributeSource } from '@/lib/workspace/click-tracking';
import type { ContributeActivity } from '@/lib/workspace/contribute.types';
import type { WorkspaceTab } from '@/lib/workspace/gate';
import {
  isSharedSettingsPath,
  lastBarInCookies,
  type ProductBar,
  rememberBar,
  settingsBarOf,
} from '@/lib/workspace/settings-bar';
import { activeTabOf, WORKSPACE_TABS, workspaceTabsShown } from '@/lib/workspace/workspace-tabs';

/** Every tab link's mark: moving between tabs is never counted as a step into Contribute. */
const TAB_MARK = contributeSource('workspace_tab');

/** Learn's bar for Settings, where Learn is open to the person, with what picks it (`settingsBarOf`). */
export type LearnBarChoice = {
  /** Learn's bar. */
  bar: ReactNode;
  audience: Audience;
  /** The server's read of the bar seen last, drawn until the page is up. */
  lastBar: ProductBar | null;
};

const noSubscribe = () => () => {};

/**
 * The workspace's tabs under the header, as a profile's are, or the header's line when they do not show; with them,
 * the one poll (`ChangesProvider`) and the bar for the current tab's work. On Settings, Learn's bar takes the tabs'
 * place where Learn opened the page (`settingsBarOf`: the link's `?from=learn`, else the bar seen last, read from the
 * browser's cookie on each move, else the product the person uses); the poll and the work's bar stay under it. It
 * reads the path and the query, so it renders inside a Suspense boundary.
 */
export function WorkspaceTabsNav({
  tabs,
  activity = null,
  version = null,
  needsYou = null,
  learn,
}: {
  tabs: readonly WorkspaceTab[];
  activity?: ContributeActivity | null;
  version?: string | null;
  needsYou?: number | null;
  /** Given only where Learn is open to the person. */
  learn?: LearnBarChoice;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const seenLast = useSyncExternalStore(
    noSubscribe,
    () => lastBarInCookies(document.cookie),
    () => learn?.lastBar ?? null,
  );
  const showLearn =
    !!learn &&
    isSharedSettingsPath(pathname) &&
    settingsBarOf({ from: search.get('from'), lastBar: seenLast, audience: learn.audience, learnOpen: true }) ===
      'learn';
  // Learn's bar arrives after the screen, as the tabs do: a link's jump to a section is made again under it.
  useEffect(() => {
    if (showLearn) scrollToHash();
  }, [showLearn]);
  if (!workspaceTabsShown(pathname, search.get('as'), tabs)) return showLearn ? learn.bar : <HeaderLine />;
  return (
    <ChangesProvider version={version} activity={activity} needsYou={needsYou}>
      {showLearn ? learn.bar : <WorkspaceTabsBar tabs={tabs} active={activeTabOf(pathname, search)} />}
      <ActivityBar />
    </ChangesProvider>
  );
}

/**
 * The tabs, the current one marked: Contribute and Settings with a dot while work for them runs, Pull requests with
 * the count of what needs the user, Agent with a spinner and the number of agents at work. On a phone the bar scrolls
 * sideways, and the current tab is scrolled into sight.
 */
export function WorkspaceTabsBar({ tabs, active }: { tabs: readonly WorkspaceTab[]; active: WorkspaceTab | null }) {
  const { activity, needsYou } = useWorkspaceLive();
  const bar = useRef<HTMLDivElement>(null);
  // The bar streams in on its own. Arriving after the screen, it pushes the section a link landed on (`#email`) down by
  // its height; browsers without scroll anchoring (Safari) leave the view where it was, so the link's jump is made
  // again. Before the screen is there, the id names nothing and the screen's own jump follows.
  useEffect(scrollToHash, []);
  // The bar seen last, for Settings to show again (`settings-bar.ts`): Contribute's, but on the old Learn tab.
  useEffect(() => {
    if (active !== 'learn') rememberBar('contribute');
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const tab = bar.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const list = tab?.closest('ul');
    if (tab && list) revealSideways(list, tab);
  }, [active]);

  return (
    <div ref={bar} data-workspace-tabs="">
      <TabsBar>
        {tabs.map((tab) => {
          const { label, href } = WORKSPACE_TABS[tab];
          const count = tab === 'pull-requests' && needsYou ? needsYou : undefined;
          return (
            <Tab
              key={tab}
              href={href}
              active={active === tab}
              count={count}
              tone="brand"
              countLabel={count ? 'need you' : undefined}
              data={{ ...TAB_MARK, 'data-workspace-tab': tab }}
            >
              {label}
              {tab === 'contribute' ? <ActivityDot tab={['OVERVIEW', 'ISSUES']} /> : null}
              {tab === 'settings' ? <ActivityDot tab="SETTINGS" /> : null}
              {tab === 'agent' ? <AgentMark activity={activity} /> : null}
            </Tab>
          );
        })}
      </TabsBar>
    </div>
  );
}

/**
 * Scrolls `list` sideways just enough to show `item`, and nothing else. `scrollIntoView` would also scroll the page up
 * to the bar: a link to a section further down (`/my/settings#email`) lands there, then the bar's late render took the
 * page back to the top.
 */
export function revealSideways(list: HTMLElement, item: HTMLElement): void {
  const shown = list.getBoundingClientRect();
  const box = item.getBoundingClientRect();
  if (box.left < shown.left) list.scrollLeft -= shown.left - box.left;
  else if (box.right > shown.right) list.scrollLeft += box.right - shown.right;
}

/** While agents work: a spinner and their number ("2 at work" for screen readers). Queued or waiting runs show nothing. */
export function AgentMark({ activity }: { activity: ContributeActivity | null }) {
  const { working } = runsTabMarkOf(runsOf(activity));
  if (!working) return null;
  return (
    <span className="ms-1.5 inline-flex items-center gap-1.5 align-middle" data-agent-runs="working">
      <span
        aria-hidden="true"
        className="size-3 flex-none rounded-full border-2 border-primary/20 border-t-primary motion-safe:animate-spin"
      />
      <span
        aria-hidden="true"
        className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-soft px-1.5 font-mono text-[11px] font-semibold tabular-nums text-brand-soft-foreground"
      >
        {working}
      </span>
      <span className="sr-only"> {working} at work</span>
    </span>
  );
}
