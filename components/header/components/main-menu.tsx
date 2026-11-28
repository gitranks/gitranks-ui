'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaRegBuilding, FaRegUser } from 'react-icons/fa';
import { FaCode } from 'react-icons/fa6';
import { GoPackage, GoRepo } from 'react-icons/go';
import { GrLocation } from 'react-icons/gr';

import { GrowMenuItem, type GrowSection } from './grow-menu-item';
import { ListItem } from './menu-list-item';
import { mainMenuItemClass } from './menu-styles';
import { PhoneMenu } from './phone-menu';
import { type BuildViewer, useBuildViewer } from '@/components/build/build-viewer';
import { type InterviewsViewer, useInterviewsViewer } from '@/components/interviews/interviews-viewer';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { packageRankingPath } from '@/utils/package-paths';

export type MenuSection = 'rankings' | 'badges' | 'contribute' | 'learn' | 'build' | 'interviews';

const GROW_SECTIONS: ReadonlySet<MenuSection> = new Set<MenuSection>(['learn', 'build', 'contribute', 'interviews']);

/** The section Grow marks: the one the page names, none for a page outside Grow, or (undefined) the path's. */
const growSectionOf = (section: MenuSection | undefined): GrowSection | null | undefined => {
  if (section === undefined) return undefined;
  return GROW_SECTIONS.has(section) ? (section as GrowSection) : null;
};

export function MainMenu({
  className,
  section,
  build: drawn,
  interviews: drawnInterviews,
}: Readonly<{ className?: string; section?: MenuSection; build?: BuildViewer; interviews?: InterviewsViewer }>) {
  // The shared viewport mounts menu content on the client only, so the menu runs without it.
  // `forceMount` puts the links in the server HTML for crawlers (hidden while closed). After
  // hydration it is dropped and the closed menu unmounts as usual: a mounted one keeps its
  // dismiss layer listening and swallows Escape on every page.
  const [hydrated, setHydrated] = useState(false);
  // Whether the person has a build (Grow's "New"), read in the browser since the page is shared.
  const read = useBuildViewer();
  const build = drawn ?? read;
  // Whether Interviews is open to this viewer, read apart: Interviews' own pages reach only people it is open to (the
  // proxy answers 404 to anyone else), so they list it from the start.
  const interviewsRead = useInterviewsViewer();
  const interviews = drawnInterviews ?? { open: interviewsRead.open || section === 'interviews' };

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
      <GrowMenuItem
        section={growSectionOf(section)}
        isNew={build.hasBuild !== true}
        open={{ interviews: interviews.open }}
      />
    </PhoneMenu>
  );
}
