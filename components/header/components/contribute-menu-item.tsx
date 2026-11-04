'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { mainMenuItemClass } from './menu-styles';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { useContributeAllowed } from '@/lib/contribute/use-contribute-allowed';
import { cn } from '@/lib/utils';

/** "Contribute", shown only to a signed-in user GitRanks Contribute is open to. */
export function ContributeMenuItem({ active }: Readonly<{ active?: boolean }>) {
  const { data: session } = useSession();
  const allowed = useContributeAllowed(session?.user?.githubLogin);

  if (allowed !== true) return null;

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
