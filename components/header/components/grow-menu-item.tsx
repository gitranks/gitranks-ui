'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { mainMenuItemClass } from './menu-styles';
import { Pill } from '@/components/pill/pill';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { BUILD_HOME_PATH, isBuildPath } from '@/lib/build/paths';
import { INTERVIEWS_HOME_PATH, isInterviewsPath } from '@/lib/interviews/paths';
import { isLearnPath, LEARN_PATH } from '@/lib/learn/learn-path';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { isContributePath } from '@/lib/workspace/paths';

/** The sections Grow lists, in their order everywhere. */
export type GrowSection = 'learn' | 'build' | 'contribute' | 'interviews';

type GrowEntry = {
  section: GrowSection;
  name: string;
  line: string;
  href: Route;
  source?: ReturnType<typeof contributeSource>;
};

/** Grow's entries: each section's name and one line on what it is. A section is listed only once it is open. */
export const GROW_ENTRIES: readonly GrowEntry[] = [
  {
    section: 'learn',
    name: 'Learn',
    line: 'Short lessons, one idea at a time',
    href: LEARN_PATH,
    source: contributeSource('learn_menu'),
  },
  { section: 'build', name: 'Build', line: 'Build a real thing with your agent, step by step', href: BUILD_HOME_PATH },
  {
    section: 'contribute',
    name: 'Contribute',
    line: 'Fix real issues in open source',
    href: '/contribute' as Route,
    source: contributeSource('main_menu'),
  },
  {
    section: 'interviews',
    name: 'Interviews',
    line: 'Prepare for the interview at the company you want',
    href: INTERVIEWS_HOME_PATH,
  },
];

/**
 * The sections Grow lists for a viewer: Learn and Contribute always, Build and Interviews each only once it is open to
 * them. Left out, Learn, Build and Contribute.
 */
export type GrowOpen = { build: boolean; interviews: boolean };

const TODAY_OPEN: GrowOpen = { build: true, interviews: false };

/** Whether Grow lists a section for a viewer. */
const listed = (section: GrowSection, open: GrowOpen) =>
  section === 'build' ? open.build : section === 'interviews' ? open.interviews : true;

/**
 * The section a path belongs to: Learn's, Build's, Contribute's or Interviews' own pages (never the workspace's under
 * `/my`).
 */
export function growSectionOfPath(pathname: string): GrowSection | null {
  if (isBuildPath(pathname)) return 'build';
  if (isInterviewsPath(pathname)) return 'interviews';
  if (isLearnPath(pathname)) return 'learn';
  if (isContributePath(pathname)) return 'contribute';
  return null;
}

const ENTRY_CLASS = 'flex-col items-stretch gap-0.5 rounded-md p-3 data-active:bg-accent/50';

/** One entry: the name ("New" beside Build until the person starts a build) and its line. */
function GrowLink({ entry, current, isNew }: Readonly<{ entry: GrowEntry; current: boolean; isNew: boolean }>) {
  return (
    <li>
      <NavigationMenuLink className={ENTRY_CLASS} active={current} asChild>
        <Link href={entry.href} prefetch={false} aria-current={current ? 'page' : undefined} {...entry.source}>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {entry.name}
            {entry.section === 'build' && isNew ? (
              <Pill tone="violet" size="small">
                New
              </Pill>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{entry.line}</span>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

/**
 * Grow's entries open to the viewer as list items, the current section's marked: under Grow's button, in the phone's
 * panel, on a board.
 */
export function GrowList({
  current,
  isNew,
  open = TODAY_OPEN,
}: Readonly<{ current: GrowSection | null; isNew: boolean; open?: GrowOpen }>) {
  return GROW_ENTRIES.filter((entry) => listed(entry.section, open)).map((entry) => (
    <GrowLink key={entry.section} entry={entry} current={entry.section === current} isNew={isNew} />
  ));
}

/**
 * Grow, drawn for a section: from `sm` up an item of the row whose list opens under it, as Rankings' does, marked on
 * any page of a section; below `sm`, in the menu's panel, its entries open from the start under a small label, so a
 * section is one tap away. The section's entry is marked in both.
 */
function GrowItems({
  current,
  isNew,
  open,
}: Readonly<{ current: GrowSection | null; isNew: boolean; open?: GrowOpen }>) {
  return (
    <>
      <NavigationMenuItem className="max-sm:hidden" data-grow-menu="">
        <NavigationMenuTrigger className={mainMenuItemClass} data-active={current ? '' : undefined}>
          Grow
        </NavigationMenuTrigger>
        <NavigationMenuContent className="absolute right-0 left-auto z-50 w-auto">
          <ul className="w-[300px]">
            <GrowList current={current} isNew={isNew} open={open} />
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem className="sm:hidden" data-grow-panel="">
        <span className="block px-3 pt-2.5 pb-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Grow
        </span>
        <ul>
          <GrowList current={current} isNew={isNew} open={open} />
        </ul>
      </NavigationMenuItem>
    </>
  );
}

function GrowItemsByPath({ isNew, open }: Readonly<{ isNew: boolean; open?: GrowOpen }>) {
  return <GrowItems current={growSectionOfPath(usePathname())} isNew={isNew} open={open} />;
}

/**
 * Grow, in the place of Learn and Contribute, for a viewer Build or Interviews is open to. `section`: the section the
 * page belongs to; left out (null), the path says, as Learn's and Contribute's items do. `isNew`: "New" beside Build.
 * `open`: which of Build and Interviews it lists; left out, Build alone.
 */
export function GrowMenuItem({
  section,
  isNew,
  open,
}: Readonly<{ section?: GrowSection | null; isNew: boolean; open?: GrowOpen }>) {
  if (section !== undefined) return <GrowItems current={section} isNew={isNew} open={open} />;
  // The path is known only per request on a page with an unknown segment: unmarked until then.
  return (
    <Suspense fallback={<GrowItems current={null} isNew={isNew} open={open} />}>
      <GrowItemsByPath isNew={isNew} open={open} />
    </Suspense>
  );
}
