'use client';

import { type FC, useEffect, useRef } from 'react';

import { revealSideways } from '@/components/tabs/reveal-sideways';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import type { RegistryId } from '@/lib/packages/registries';
import { REGISTRY_ICONS } from '@/lib/packages/registry-icons';

/** One registry's tab: where it leads, its name as written, and whether its ranking is the one shown. */
export type PackageRegistryTab = { registry: RegistryId; href: string; label: string; active: boolean };

/**
 * The package rankings' registries as the page's tab row, each with its mark. Nine fit side by side only at a desktop's
 * width (no gap between tabs): narrower, the row scrolls sideways with a faded edge and the current registry is
 * scrolled into sight. Every registry stays a link in the page.
 */
export const PackageRegistryTabs: FC<{ tabs: readonly PackageRegistryTab[] }> = ({ tabs }) => {
  const bar = useRef<HTMLElement>(null);
  const current = tabs.find(({ active }) => active)?.registry ?? null;
  useEffect(() => {
    if (!current) return;
    const tab = bar.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const list = tab?.closest('ul');
    if (!tab || !list) return;
    revealSideways(list, tab);
    // The list's box changes once the fonts are in, or when a phone is turned: the tab is shown again then.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => revealSideways(list, tab));
    observer.observe(list);
    return () => observer.disconnect();
  }, [current]);

  return (
    <nav ref={bar} aria-label="Registry">
      <TabsBar scrollsBelow="lg">
        {tabs.map(({ registry, href, label, active }) => {
          const Icon = REGISTRY_ICONS[registry];
          return (
            <Tab key={registry} href={href} active={active} className="sm:me-0">
              <span className="inline-flex items-center gap-1.5">
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
              </span>
            </Tab>
          );
        })}
      </TabsBar>
    </nav>
  );
};
