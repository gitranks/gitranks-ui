'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { mainMenuItemClass } from './menu-styles';
import { Pill } from '@/components/pill/pill';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { isContributePath } from '@/lib/workspace/paths';

/**
 * "Contribute", shown to everyone; marked when `active`, or with `active` left out, on Contribute's own pages (never
 * on the workspace's under `/my`, which the tabs place).
 */
export function ContributeMenuItem({ active }: Readonly<{ active?: boolean }>) {
  if (active !== undefined) return <ContributeMenuLink active={active} />;
  // The path is known only per request on a page with an unknown segment: unmarked until then.
  return (
    <Suspense fallback={<ContributeMenuLink active={false} />}>
      <ContributeMenuItemByPath />
    </Suspense>
  );
}

function ContributeMenuItemByPath() {
  return <ContributeMenuLink active={isContributePath(usePathname())} />;
}

function ContributeMenuLink({ active }: Readonly<{ active: boolean }>) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink className={cn(mainMenuItemClass, 'gap-1.5')} active={active} asChild>
        <Link href="/contribute" prefetch={false} {...contributeSource('main_menu')}>
          Contribute
          <Pill tone="violet" size="small">
            Beta
          </Pill>
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
