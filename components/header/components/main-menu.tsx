'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type FC, type ReactNode, useEffect, useState } from 'react';
import { FaRegBuilding, FaRegUser } from 'react-icons/fa';
import { FaCode } from 'react-icons/fa6';
import { GoRepo } from 'react-icons/go';
import { GrLocation } from 'react-icons/gr';

import { ContributeMenuItem } from './contribute-menu-item';
import { mainMenuItemClass } from './menu-styles';
import { PhoneMenu } from './phone-menu';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

export type MenuSection = 'rankings' | 'badges' | 'contribute';

export function MainMenu({ className, section }: Readonly<{ className?: string; section?: MenuSection }>) {
  // The shared viewport mounts menu content on the client only, so the menu runs without it.
  // `forceMount` puts the links in the server HTML for crawlers (hidden while closed). After
  // hydration it is dropped and the closed menu unmounts as usual: a mounted one keeps its
  // dismiss layer listening and swallows Escape on every page.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Below `sm` the same list is a panel under a menu button; a closed panel opens again with Rankings folded.
  return (
    <PhoneMenu className={className}>
      <NavigationMenuItem>
        {/* Marked the way Radix marks an active link, so the shared item class styles both. */}
        <NavigationMenuTrigger className={mainMenuItemClass} data-active={section === 'rankings' ? '' : undefined}>
          Rankings
        </NavigationMenuTrigger>
        <NavigationMenuContent
          forceMount={hydrated ? undefined : true}
          // In the panel the rankings open in place, under their trigger.
          className="absolute w-auto z-50 data-[state=closed]:hidden max-sm:static max-sm:mt-0! max-sm:border-0! max-sm:p-0 max-sm:pl-2 max-sm:shadow-none!"
        >
          <ul className="w-52 max-sm:w-full">
            <ListItem href="/by/stars/1">
              <FaRegUser /> Developer Rankings
            </ListItem>
            <ListItem href="/languages/global/score/1">
              <FaCode /> Language Rankings
            </ListItem>
            <ListItem href="/countries/stars/1">
              <GrLocation /> Country Rankings
            </ListItem>
            <ListItem href="/orgs/1">
              <FaRegBuilding /> Org Rankings
            </ListItem>
            <ListItem href="/repos/1">
              <GoRepo /> Repository Rankings
            </ListItem>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink className={mainMenuItemClass} active={section === 'badges'} asChild>
          {/* Not prefetched: the header is on every page, so a prefetch cost a request on every page view. */}
          <Link href="/badge/gallery" prefetch={false}>
            Badges
          </Link>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <ContributeMenuItem active={section === 'contribute'} />
    </PhoneMenu>
  );
}

type ListItemProps = {
  className?: string;
  href: string;
  children: ReactNode;
};

const ListItem: FC<ListItemProps> = ({ className, children, href }) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className,
          )}
          href={href as Route}
          prefetch
        >
          <div className="flex gap-2 items-center">{children}</div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};
