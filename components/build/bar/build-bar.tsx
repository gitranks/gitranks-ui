'use client';

import { useEffect, useRef } from 'react';

import { BarItem } from '@/components/tabs/bar-item';
import { revealSideways } from '@/components/tabs/reveal-sideways';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { BUILD_BAR_TABS, BUILD_BAR_TEST_HREF, type BuildBarTab, type BuildBarView } from '@/lib/build/build-bar';

/** Build's pages are one reading column of 860px, and the bar's row is as wide. */
export const BUILD_BAR_WIDTH = 'max-w-[860px]';

/**
 * Build's bar, as the approved designs draw it: the tabs on the left, the current one marked; on the right one quiet
 * outlined item, "Test" with how many, only when a test waits. On a phone the tabs scroll sideways under "Test", which
 * stays at the edge, and the current tab is scrolled into sight.
 */
export function BuildBar({ view, place }: { view: BuildBarView; place: BuildBarTab | null }) {
  const bar = useRef<HTMLDivElement>(null);
  // My builds and Settings appear once the person's bar is read: the current tab may only then be there to show.
  const shown = view.tabs.find((tab) => tab === place) ?? null;
  useEffect(() => {
    if (!shown) return;
    const tab = bar.current?.querySelector<HTMLElement>(`ul [data-build-tab="${shown}"]`);
    const list = tab?.closest('ul');
    if (!tab || !list) return;
    revealSideways(list, tab);
    // "Test" comes in once the bar is read and narrows the list: the tab is shown again then, and on a phone turned.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => revealSideways(list, tab));
    observer.observe(list);
    return () => observer.disconnect();
  }, [shown]);

  const end =
    view.tests === null ? null : (
      <BarItem
        href={BUILD_BAR_TEST_HREF}
        current={false}
        count={view.tests}
        countLabel={view.tests === 1 ? 'test waits' : 'tests wait'}
        item="build-test"
      >
        Test
      </BarItem>
    );

  return (
    <div ref={bar} data-build-bar={view.tabs.length > 2 ? 'builder' : 'visitor'}>
      <TabsBar end={end} width={BUILD_BAR_WIDTH}>
        {view.tabs.map((tab) => (
          <Tab key={tab} href={BUILD_BAR_TABS[tab].href} active={place === tab} data={{ 'data-build-tab': tab }}>
            {BUILD_BAR_TABS[tab].label}
          </Tab>
        ))}
      </TabsBar>
    </div>
  );
}
