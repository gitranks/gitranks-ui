'use client';

import { useEffect, useRef } from 'react';

import { INTERVIEWS_BAR_WIDTH } from '../column';
import { revealSideways } from '@/components/tabs/reveal-sideways';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { INTERVIEWS_BAR_TABS, type InterviewsBarTab, type InterviewsBarView } from '@/lib/interviews/interviews-bar';

/**
 * Interviews' bar, as the approved designs draw it: the tabs, the current one marked. On a phone the tabs scroll
 * sideways, and the current tab is scrolled into sight.
 */
export function InterviewsBar({ view, place }: { view: InterviewsBarView; place: InterviewsBarTab | null }) {
  const bar = useRef<HTMLDivElement>(null);
  // My interviews appears once the person's bar is read: the current tab may only then be there to show.
  const shown = view.tabs.find((tab) => tab === place) ?? null;
  useEffect(() => {
    if (!shown) return;
    const tab = bar.current?.querySelector<HTMLElement>(`ul [data-interviews-tab="${shown}"]`);
    const list = tab?.closest('ul');
    if (tab && list) revealSideways(list, tab);
  }, [shown]);

  return (
    <div ref={bar} data-interviews-bar={view.tabs.includes('mine') ? 'mine' : 'visitor'}>
      <TabsBar width={INTERVIEWS_BAR_WIDTH}>
        {view.tabs.map((tab) => (
          <Tab
            key={tab}
            href={INTERVIEWS_BAR_TABS[tab].href}
            active={place === tab}
            data={{ 'data-interviews-tab': tab }}
          >
            {INTERVIEWS_BAR_TABS[tab].label}
          </Tab>
        ))}
      </TabsBar>
    </div>
  );
}
