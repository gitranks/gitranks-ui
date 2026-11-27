import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HOME_NOW, homeLearnCourses, homeProducts } from '@/app/components/landing/__fixtures__/products-block';
import { ProductsBlockGrow } from '@/app/components/landing/products-block-grow';
import type { HomeProducts } from '@/app/components/landing/products-block-words';
import type { BuildViewer } from '@/components/build/build-viewer';
import { GrowList, GrowMenuItem, type GrowSection } from '@/components/header/components/grow-menu-item';
import type { MenuSection } from '@/components/header/components/main-menu';
import { Header } from '@/components/header/header';
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from '@/components/ui/navigation-menu';
import {
  buildInPart,
  buildInProgress,
  keyValueDatabaseEndTest,
  keyValueDatabaseInProgress,
  webServerGoldTest,
} from '@/lib/build/__fixtures__/builds';
import { sideNothingWaits } from '@/lib/build/__fixtures__/home';
import type { BuildCardSide } from '@/lib/build/home-card';
import type { BuildHome } from '@/lib/build/types';

/*
 * The site's header with Grow and the home page's block with Build's card, as a viewer Build is open to sees them:
 * the header's row, and the block for each viewer. While Build is closed to the viewer, both are today's.
 */

const NEW_TO_BUILD: BuildViewer = { open: true, hasBuild: false };
const BUILDER: BuildViewer = { open: true, hasBuild: true };

const home = (fields: Partial<BuildHome>): BuildHome => ({ builds: [], tests: [], next: [], ...fields });
const side = (fields: Partial<BuildHome>): BuildCardSide => ({ home: home(fields), builds: [], hasBuild: true });

/** One state on a board: its name, then the part of the page it changes. */
function Frame({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-background">{children}</div>
    </section>
  );
}

/** A board of cases: its heading, then its frames. */
function Cases({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full flex-col gap-10 px-4 pt-8 pb-16" style={{ maxWidth: 1180 }}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="m-0 text-base text-muted-foreground">{intro}</p>
      </div>
      {children}
    </main>
  );
}

const Row = ({ build, section, title }: { build: BuildViewer; section?: MenuSection; title?: string }) => (
  <Header build={build} section={section} title={title} />
);

const block = (build: BuildCardSide | null, products: HomeProducts | null = null, id?: string, contribute = true) => (
  <ProductsBlockGrow
    products={products}
    build={build}
    now={HOME_NOW}
    id={id}
    courses={homeLearnCourses}
    contribute={contribute}
  />
);

/** Grow's list as it opens under its button, at the right of the row. */
const OpenList = ({ current, isNew }: { current: GrowSection | null; isNew: boolean }) => (
  <div className="flex justify-end p-4">
    <NavigationMenu viewport={false} className="max-w-none flex-none">
      <NavigationMenuList>
        <NavigationMenuItem>
          <ul className="w-[300px] rounded-md border bg-popover p-2 text-popover-foreground shadow">
            <GrowList current={current} isNew={isNew} />
          </ul>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
);

/** The phone's open panel, from Grow's label down (Rankings, folded, and Badges sit above it, as today). */
const OpenPanel = ({ section, isNew }: { section: GrowSection | null; isNew: boolean }) => (
  <div className="flex justify-end p-4">
    <NavigationMenu viewport={false} className="max-w-none flex-none">
      <NavigationMenuList className="w-64 flex-col items-stretch gap-0.5 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-md">
        <GrowMenuItem section={section} isNew={isNew} />
      </NavigationMenuList>
    </NavigationMenu>
  </div>
);

const SOURCES = [
  'components/header/components/main-menu.tsx',
  'components/header/components/grow-menu-item.tsx',
  'components/build/build-viewer.ts',
  'components/build/home-card-live.ts',
  'app/components/landing/products-block.tsx',
  'app/components/landing/products-block-grow.tsx',
  'components/build/build-bar-read.ts',
  'app/components/landing/products-block-live.tsx',
  'app/components/landing/products-block-words.ts',
  'lib/build/home-card.ts',
];

export const BUILD_SITE_SCREENS: Screen[] = [
  {
    id: 'build-site',
    title: 'The header with Grow, and the home page with Build',
    area: 'build',
    route: '/',
    sources: SOURCES,
    states: [
      {
        id: 'header',
        title: 'The header: Rankings, Badges, Grow, on a page outside Grow, on a Build page, with a name',
        path: '/',
        height: 560,
        render: () => (
          <Cases
            title="The site's header, with Grow"
            intro="Three items: Rankings, Badges, Grow. Grow opens a list of Learn, Build and Contribute under its button."
          >
            <Frame title="On a page outside Grow" note="The home page, a profile, a ranking.">
              <Row build={NEW_TO_BUILD} />
            </Frame>
            <Frame title="On a page of Build" note="Grow is marked in the row, and Build in its list.">
              <Row build={BUILDER} section="build" />
            </Frame>
            <Frame title="A page with a name in the header" note="A profile keeps its name after the logo.">
              <Row build={BUILDER} title="octocat" />
            </Frame>
          </Cases>
        ),
      },
      {
        id: 'grow-open',
        title: 'Grow\'s list, open: with "New" until the person builds, and Build marked on Build\'s pages',
        path: '/',
        height: 760,
        render: () => (
          <Cases
            title="Grow's list"
            intro="Under Grow's button, at the right of the row: each section's name and one line."
          >
            <Frame title="Someone with no build yet" note={'Build carries "New". Nothing is marked outside Grow.'}>
              <OpenList current={null} isNew />
            </Frame>
            <Frame title="On a page of Build, for someone who builds" note={'Build is marked, and "New" has gone.'}>
              <OpenList current="build" isNew={false} />
            </Frame>
          </Cases>
        ),
      },
      {
        id: 'home',
        title: 'The home page: Learn, Build, Contribute, three cards of one size',
        path: '/',
        height: 420,
        render: () => <main>{block(null)}</main>,
      },
      {
        id: 'viewers',
        title: "The block for each viewer: Build's card is theirs once they build",
        path: '/',
        height: 1650,
        render: () => (
          <main>
            {block({ home: home({}), builds: [], hasBuild: false }, homeProducts.neither, 'grow-neither')}
            {block(side({ builds: [buildInProgress] }), homeProducts.neither, 'grow-builder')}
            {block({ home: home({}), builds: [], hasBuild: false }, homeProducts.both, 'grow-learns-contributes')}
            {block(side({ tests: [keyValueDatabaseEndTest] }), homeProducts.both, 'grow-all-three')}
            {/* Before Contribute is launched, for someone who does not use it: Learn and Build share the row. */}
            {block(null, homeProducts.learner, 'grow-learn-build', false)}
          </main>
        ),
      },
      {
        id: 'build-card',
        title: "What Build's card says to someone with a build, the first that is true",
        path: '/',
        height: 1900,
        render: () => (
          <main>
            {block(side({ tests: [keyValueDatabaseEndTest] }), null, 'grow-test')}
            {block(side({ tests: [webServerGoldTest] }), null, 'grow-gold')}
            {block(side({ builds: [buildInProgress] }), null, 'grow-one')}
            {block(side({ builds: [buildInProgress, keyValueDatabaseInProgress] }), null, 'grow-several')}
            {block({ home: home({}), builds: [buildInPart], hasBuild: true }, null, 'grow-part')}
            {block({ ...sideNothingWaits, hasBuild: true }, null, 'grow-built')}
          </main>
        ),
      },
      {
        id: 'phone',
        title:
          "On a phone: the header with its menu button, the panel open at Grow's entries, the cards one under the other",
        path: '/',
        width: 390,
        height: 1400,
        render: () => (
          <>
            <Row build={NEW_TO_BUILD} />
            <OpenPanel section={null} isNew />
            <main>{block(null)}</main>
          </>
        ),
      },
    ],
  },
];
