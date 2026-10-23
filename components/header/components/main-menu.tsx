'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type FC, type ReactNode, useEffect, useState } from 'react';
import { FaRegBuilding } from 'react-icons/fa';
import { FaCode } from 'react-icons/fa6';
import { GrLocation } from 'react-icons/gr';
import { VscGlobe } from 'react-icons/vsc';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

export function MainMenu({ className }: Readonly<{ className?: string }>) {
  // The shared viewport mounts menu content on the client only, so the menu runs without it.
  // `forceMount` puts the links in the server HTML for crawlers (hidden while closed). After
  // hydration it is dropped and the closed menu unmounts as usual: a mounted one keeps its
  // dismiss layer listening and swallows Escape on every page.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <NavigationMenu className={className} viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent">Rankings</NavigationMenuTrigger>
          <NavigationMenuContent
            forceMount={hydrated ? undefined : true}
            className="absolute w-auto z-50 data-[state=closed]:hidden"
          >
            <ul className="w-48">
              <ListItem href="/by/stars/1">
                <VscGlobe /> Global Rankings
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
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'bg-transparent')} asChild>
            {/* Not prefetched: the header is on every page, so a prefetch cost a request on every page view. */}
            <Link href="/badge/gallery" prefetch={false}>
              Badges
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
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
