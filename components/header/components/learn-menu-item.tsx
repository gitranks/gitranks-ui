'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { mainMenuItemClass } from './menu-styles';
import { Pill } from '@/components/pill/pill';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { isLearnPath, LEARN_PATH } from '@/lib/learn/learn-path';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';

/** "Learn · New", the link drawn alone: for the menu and the catalogue's boards. */
export function LearnMenuLink({ active }: Readonly<{ active?: boolean }>) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink className={cn(mainMenuItemClass, 'gap-1.5')} active={active} asChild>
        <Link href={LEARN_PATH} prefetch={false} {...contributeSource('learn_menu')}>
          Learn
          <Pill tone="violet" size="small">
            New
          </Pill>
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

/** "Learn · New" in the menu, for everyone. Marked when `active`, or with `active` left out, on Learn's own pages. */
export function LearnMenuItem({ active }: Readonly<{ active?: boolean }>) {
  if (active !== undefined) return <LearnMenuLink active={active} />;
  // The path is known only per request on a page with an unknown segment: unmarked until then.
  return (
    <Suspense fallback={<LearnMenuLink active={false} />}>
      <LearnMenuItemByPath />
    </Suspense>
  );
}

function LearnMenuItemByPath() {
  return <LearnMenuLink active={isLearnPath(usePathname())} />;
}
