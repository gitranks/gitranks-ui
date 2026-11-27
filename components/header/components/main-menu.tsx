'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaRegBuilding, FaRegUser } from 'react-icons/fa';
import { FaCode } from 'react-icons/fa6';
import { GoPackage, GoRepo } from 'react-icons/go';
import { GrLocation } from 'react-icons/gr';

import { ContributeMenuItem } from './contribute-menu-item';
import { GrowMenuItem, type GrowSection } from './grow-menu-item';
import { LearnMenuItem } from './learn-menu-item';
import { ListItem } from './menu-list-item';
import { mainMenuItemClass } from './menu-styles';
import { PhoneMenu } from './phone-menu';
import { type BuildViewer, useBuildViewer } from '@/components/build/build-viewer';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { packageRankingPath } from '@/utils/package-paths';

export type MenuSection = 'rankings' | 'badges' | 'contribute' | 'learn' | 'build';

const GROW_SECTIONS: ReadonlySet<MenuSection> = new Set<MenuSection>(['learn', 'build', 'contribute']);

/** The section Grow marks: the one the page names, none for a page outside Grow, or (undefined) the path's. */
const growSectionOf = (section: MenuSection | undefined): GrowSection | null | undefined => {
  if (section === undefined) return undefined;
  return GROW_SECTIONS.has(section) ? (section as GrowSection) : null;
};

export function MainMenu({
  className,
  section,
  build: drawn,
}: Readonly<{ className?: string; section?: MenuSection; build?: BuildViewer }>) {
  // The shared viewport mounts menu content on the client only, so the menu runs without it.
  // `forceMount` puts the links in the server HTML for crawlers (hidden while closed). After
  // hydration it is dropped and the closed menu unmounts as usual: a mounted one keeps its
  // dismiss layer listening and swallows Escape on every page.
  const [hydrated, setHydrated] = useState(false);
  // Whether Build is open to this viewer, read in the browser since the page is shared: closed, the menu is today's.
  const read = useBuildViewer();
  const build = drawn ?? read;

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
            <ListItem href={packageRankingPath('downloads')}>
              <GoPackage /> Package Rankings
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
      {build.open ? (
        // Grow, in the place of Contribute and Learn.
        <GrowMenuItem section={growSectionOf(section)} isNew={build.hasBuild !== true} />
      ) : (
        <>
          {/* With no section named, the two mark themselves by the path: the workspace's layout reads no path. */}
          <ContributeMenuItem active={section ? section === 'contribute' : undefined} />
          <LearnMenuItem active={section ? section === 'learn' : undefined} />
        </>
      )}
    </PhoneMenu>
  );
}
