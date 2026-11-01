'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export type SessionTab = {
  value: string;
  label: string;
  /** A count or a mark beside the label: `12 files`, `✓`. */
  badge?: ReactNode;
  content: ReactNode;
};

/**
 * One session's details, a tab each. Every tab is rendered and the others hidden, so the page's own reads (a refresh,
 * the live submit) reach each part whichever tab is open.
 */
export function SessionTabs({
  tabs,
  defaultValue,
  label,
}: {
  tabs: SessionTab[];
  defaultValue: string;
  label: string;
}) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} className="flex min-w-0 flex-col gap-4" data-session-tabs="">
      <TabsPrimitive.List
        aria-label={label}
        className="-mx-4 flex gap-5 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            data-tab={tab.value}
            className="-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=active]:text-foreground"
          >
            {tab.label}
            {tab.badge ? (
              <span className="rounded-full bg-muted px-1.5 font-mono text-[11px] text-foreground/70 tabular-nums">
                {tab.badge}
              </span>
            ) : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          value={tab.value}
          forceMount
          data-tab-panel={tab.value}
          className="flex min-w-0 flex-col gap-4 outline-none data-[state=inactive]:hidden"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
