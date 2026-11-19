'use client';

import Link from 'next/link';

import { mainMenuItemClass } from './menu-styles';
import { Pill } from '@/components/pill/pill';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';

/** "Contribute", shown to everyone. */
export function ContributeMenuItem({ active }: Readonly<{ active?: boolean }>) {
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
