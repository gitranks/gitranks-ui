'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { FC, ReactNode } from 'react';
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

export function MainMenu({ className }: { className?: string }) {
  return (
    <NavigationMenu className={className}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent">Rankings</NavigationMenuTrigger>
          <NavigationMenuContent>
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
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), 'bg-transparent')} asChild>
            <Link href="/badge/gallery">Badges</Link>
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
        >
          <div className="flex gap-2 items-center">{children}</div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};
