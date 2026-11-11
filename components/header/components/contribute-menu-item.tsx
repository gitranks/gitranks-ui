'use client';

import Link from 'next/link';

import { mainMenuItemClass } from './menu-styles';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

/** "Contribute", shown to everyone. */
export function ContributeMenuItem({ active }: Readonly<{ active?: boolean }>) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink className={cn(mainMenuItemClass, 'gap-1.5')} active={active} asChild>
        <Link href="/contribute" prefetch={false}>
          Contribute
          <span className="rounded-full bg-brand-soft px-1.5 py-px text-[11px] font-semibold text-brand-soft-foreground">
            Beta
          </span>
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
