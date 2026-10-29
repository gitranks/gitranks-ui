'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';
import { FaRegBuilding, FaRegUser } from 'react-icons/fa';
import { FaCode } from 'react-icons/fa6';
import { GoRepo } from 'react-icons/go';
import { GrLocation } from 'react-icons/gr';

import { ContributeMenuItem } from './contribute-menu-item';
import { mainMenuItemClass } from './menu-styles';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

const LIST_ID = 'main-menu-list';

export function MainMenu({ className }: Readonly<{ className?: string }>) {
  // The shared viewport mounts menu content on the client only, so the menu runs without it.
  // `forceMount` puts the links in the server HTML for crawlers (hidden while closed). After
  // hydration it is dropped and the closed menu unmounts as usual: a mounted one keeps its
  // dismiss layer listening and swallows Escape on every page.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Below `sm` the same list is a panel under a menu button: one markup, laid out by the breakpoint's classes.
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new page closes the panel.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <NavigationMenu
      ref={root}
      // Radix wraps the list in a `position: relative` div; below `sm` the panel is placed against the root instead.
      className={cn('max-sm:[&>div]:static!', className)}
      viewport={false}
    >
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md hover:bg-accent sm:hidden"
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>
      <NavigationMenuList
        id={LIST_ID}
        className={cn(
          'max-sm:absolute max-sm:top-full max-sm:right-0 max-sm:z-50 max-sm:mt-2 max-sm:w-64 max-sm:flex-col max-sm:items-stretch max-sm:gap-0.5 max-sm:rounded-lg max-sm:border max-sm:bg-popover max-sm:p-1.5 max-sm:text-popover-foreground max-sm:shadow-md',
          !open && 'max-sm:hidden',
        )}
      >
        <NavigationMenuItem>
          <NavigationMenuTrigger className={mainMenuItemClass}>Rankings</NavigationMenuTrigger>
          <NavigationMenuContent
            forceMount={hydrated ? undefined : true}
            // In the panel the rankings open in place, under their trigger.
            className="absolute w-auto z-50 data-[state=closed]:hidden max-sm:static max-sm:mt-0 max-sm:border-0 max-sm:p-0 max-sm:pl-2 max-sm:shadow-none"
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
          <NavigationMenuLink className={mainMenuItemClass} asChild>
            {/* Not prefetched: the header is on every page, so a prefetch cost a request on every page view. */}
            <Link href="/badge/gallery" prefetch={false}>
              Badges
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <ContributeMenuItem />
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
