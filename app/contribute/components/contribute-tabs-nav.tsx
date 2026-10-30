'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
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
 * Contribute's tabs under the header, as a profile's are, or the header's line when they do not show. It reads the
 * path and the query, so it renders inside a Suspense boundary.
 */
export function ContributeTabsNav({ onboarded }: { onboarded: boolean }) {
  const pathname = usePathname();
  const as = useSearchParams().get('as');
  if (!contributeTabsShown(pathname, as, onboarded)) return <HeaderLine />;

  // An attempt's review belongs to My contributions, the connect flow to the overview.
  const attempt = pathname.startsWith('/contribute/attempts/');
  return (
    <TabsBar>
      <Tab href="/contribute" pathnames={['/contribute', '/contribute/connect']}>
        Overview
      </Tab>
      <Tab href="/contribute/issues">Issues for you</Tab>
      <Tab href="/contribute/me" pathnames={attempt ? [pathname] : undefined}>
        My contributions
      </Tab>
      <Tab href="/contribute/settings">Settings</Tab>
    </TabsBar>
  );
}
