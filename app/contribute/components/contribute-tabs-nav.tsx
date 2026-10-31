'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { ActivityBar, ActivityDot } from './activity';
import { AgentRunsIndicator } from './agent-runs';
import { ChangesProvider } from './live-changes';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import type { ContributeActivity } from '@/lib/contribute/contribute.types';
import { isMaintainersPath } from '@/lib/contribute/contribute-path';
import { isAsVisitor } from '@/lib/contribute/contribute-state';

/** The line under the header where there are no tabs, across the page as the home page draws one. */
export function HeaderLine() {
  return <div className="border-b" />;
}

/**
 * Whether Contribute's tabs show: only to an onboarded user. Not on the maintainers page (open to everyone), and not
 * under `?as=visitor` on `/contribute`, where a signed-in user sees the landing as a visitor would.
 */
export function contributeTabsShown(pathname: string, as: string | null, onboarded: boolean): boolean {
  const asVisitor = pathname.replace(/\/+$/, '') === '/contribute' && isAsVisitor(as);
  return onboarded && !asVisitor && !isMaintainersPath(pathname);
}

/**
 * Contribute's tabs under the header, as a profile's are, or the header's line when they do not show; with them, a dot
 * on each tab with work in progress, the agent runs at the end, the bar for the current tab's, and Contribute's one
 * poll (`ChangesProvider`). It reads the path and the query, so it renders inside a Suspense boundary.
 */
export function ContributeTabsNav({
  onboarded,
  activity = null,
  version = null,
}: {
  onboarded: boolean;
  activity?: ContributeActivity | null;
  version?: string | null;
}) {
  const pathname = usePathname();
  const as = useSearchParams().get('as');
  if (!contributeTabsShown(pathname, as, onboarded)) return <HeaderLine />;

  // An attempt's review belongs to My contributions, the connect flow to the overview.
  const attempt = pathname.startsWith('/contribute/attempts/');
  return (
    <ChangesProvider version={version} activity={activity}>
      <TabsBar>
        <Tab href="/contribute" pathnames={['/contribute', '/contribute/connect']}>
          Overview
          <ActivityDot tab="OVERVIEW" />
        </Tab>
        <Tab href="/contribute/issues">
          Issues for you
          <ActivityDot tab="ISSUES" />
        </Tab>
        <Tab href="/contribute/me" pathnames={attempt ? [pathname] : undefined}>
          My contributions
        </Tab>
        <Tab href="/contribute/settings">
          Settings
          <ActivityDot tab="SETTINGS" />
        </Tab>
        {/* The agent runs, on every tab: held at the end, so a phone's scrolled tabs never hide it; as tall as its pill, so
            the bar's line runs on under it. */}
        <li className="sticky right-0 ms-auto flex shrink-0 self-start ps-3 pe-1 max-sm:bg-background empty:hidden">
          <AgentRunsIndicator />
        </li>
      </TabsBar>
      <ActivityBar />
    </ChangesProvider>
  );
}
