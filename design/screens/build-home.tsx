import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { BuildBar } from '@/components/build/bar/build-bar';
import { BUILD_COLUMN } from '@/components/build/column';
import { LandingProjects } from '@/components/build/home/home-landing';
import { HomeView } from '@/components/build/home/home-view';
import { ProjectCards } from '@/components/build/project-card';
import { ProjectsView } from '@/components/build/projects/projects-view';
import { Header } from '@/components/header/header';
import { barBuilder } from '@/lib/build/__fixtures__/builds';
import {
  buildProjectsFourteen,
  buildProjectsThree,
  projectsMine,
  sideAgentConnected,
  sideAllBuilt,
  sideBuilder,
  sideGoldOpen,
  sideNothingWaits,
  sideTestWaits,
} from '@/lib/build/__fixtures__/home';
import { BUILD_FIXTURE_NOW, buildProjectsFew, buildProjectsMany } from '@/lib/build/__fixtures__/projects';
import { type BuildBarTab, type BuildBarView, buildBarViewOf, VISITOR_BUILD_BAR } from '@/lib/build/build-bar';
import { type BuildHomeSide, homeViewOf, VISITOR_HOME } from '@/lib/build/home';
import { cardPlacesOf } from '@/lib/build/project-card';

/*
 * Build's Home (the landing and a person's home) and Projects, as the approved designs draw them: each board a page
 * as its route draws it, or a frame of the part a state changes.
 */

const NOW = new Date(BUILD_FIXTURE_NOW);
const builderBar = buildBarViewOf(barBuilder);
const testBar: BuildBarView = buildBarViewOf({ hasBuild: true, tests: 1 });

/** The site's header and Build's bar, as the layout draws them. */
function Site({ bar, place, children }: { bar: BuildBarView; place: BuildBarTab; children: ReactNode }) {
  return (
    <>
      <Header />
      <BuildBar view={bar} place={place} />
      {children}
    </>
  );
}

/** Home for what the person's side read. */
const Home = ({
  side,
  bar,
  projects = buildProjectsFew,
}: {
  side: BuildHomeSide | null;
  bar: BuildBarView;
  projects?: typeof buildProjectsFew;
}) => (
  <Site bar={bar} place="home">
    <HomeView view={side ? homeViewOf(side, projects) : VISITOR_HOME} projects={projects} now={NOW} />
  </Site>
);

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
    <main className="mx-auto flex w-full flex-col gap-10 px-4 pt-8 pb-16" style={{ maxWidth: 920 }}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="m-0 text-base text-muted-foreground">{intro}</p>
      </div>
      {children}
    </main>
  );
}

const HOME_SOURCES = [
  'app/(build)/build/page.tsx',
  'app/(build)/build/about/page.tsx',
  'components/build/home/home-live.tsx',
  'components/build/home/home-view.tsx',
  'components/build/home/home-landing.tsx',
  'components/build/home/home-builder.tsx',
  'components/build/project-card.tsx',
  'components/build/step-squares.tsx',
  'components/build/say-row.tsx',
  'lib/build/home.ts',
  'lib/build/project-card.ts',
];

const PROJECTS_SOURCES = [
  'app/(build)/build/projects/page.tsx',
  'components/build/projects/projects-live.tsx',
  'components/build/projects/projects-view.tsx',
  'components/build/project-card.tsx',
  'lib/build/projects.ts',
  'lib/build/project-card.ts',
];

const minePlaces = cardPlacesOf(projectsMine);
const placeOf = (slug: string) => minePlaces.get(slug) ?? null;

/** Build's home: the landing, a builder's home, a test that waits, the other cases, the phone. */
export const BUILD_HOME_SCREEN: Screen = {
  id: 'build-home',
  title: 'Build home',
  area: 'build',
  route: '/build',
  sources: HOME_SOURCES,
  states: [
    {
      id: 'visitor',
      title: 'Not signed in: the landing. What Build is, one button, how it works, the projects, the limits, questions',
      path: '/build',
      signedOut: true,
      height: 1990,
      render: () => <Home side={null} bar={VISITOR_BUILD_BAR} />,
    },
    {
      id: 'builder',
      title: 'Signed in, with builds: the one to go on with first, what else is in progress, what to build next',
      path: '/build',
      height: 900,
      render: () => <Home side={sideBuilder} bar={builderBar} />,
    },
    {
      id: 'test',
      title: 'A test waits: it comes first, above the builds in progress. The bar shows “Test 1”',
      path: '/build',
      height: 900,
      render: () => <Home side={sideTestWaits} bar={testBar} />,
    },
    {
      id: 'cases',
      title: 'The other cases: an agent connected, the gold test open, nothing waits, everything built, many projects',
      path: '/build',
      height: 2700,
      render: () => (
        <Cases
          title="Build home: the other cases"
          intro="Only the part of the page that differs is drawn. Everything under it is as on the full boards."
        >
          <Frame
            title="1 · Signed in, an agent is connected, nothing started"
            note="The landing, with one difference: the main button is “Pick a project”."
          >
            <div className="h-[290px] overflow-hidden">
              <HomeView view={homeViewOf(sideAgentConnected, buildProjectsFew)} projects={buildProjectsFew} />
            </div>
          </Frame>
          <Frame title="2 · A gold test is open" note="It comes first, as any test does. The bar shows “Test 1”.">
            <HomeView view={homeViewOf(sideGoldOpen, buildProjectsFew)} projects={buildProjectsFew} now={NOW} />
          </Frame>
          <Frame
            title="3 · Builds exist, and nothing waits"
            note="The box points at the projects that are left. What was built is on My builds, not here."
          >
            <HomeView view={homeViewOf(sideNothingWaits, buildProjectsFew)} projects={buildProjectsFew} now={NOW} />
          </Frame>
          <Frame title="4 · Every project is built" note="No “Build next”. The box leads to Learn and to real issues.">
            <HomeView view={homeViewOf(sideAllBuilt, buildProjectsFew)} projects={buildProjectsFew} now={NOW} />
          </Frame>
          <Frame
            title="5 · More projects than the page should list"
            note="Home lists six cards at the most, then one link to the Projects page."
          >
            <div className={BUILD_COLUMN}>
              <LandingProjects projects={buildProjectsMany} />
            </div>
          </Frame>
          <Frame
            title="6 · A project card, with what the person has there"
            note="Where a person’s place is known, it shows above the facts, and every card of the list keeps that line."
          >
            <div className={BUILD_COLUMN}>
              <ProjectCards cards={buildProjectsFourteen.slice(0, 6)} placeOf={placeOf} />
            </div>
          </Frame>
        </Cases>
      ),
    },
    {
      id: 'phone',
      title: 'Not signed in · On a phone',
      path: '/build',
      signedOut: true,
      width: 390,
      height: 3000,
      render: () => <Home side={null} bar={VISITOR_BUILD_BAR} />,
    },
  ],
};

/** All projects: five, fourteen in groups, with a person's places, the search, the phone. */
export const BUILD_PROJECTS_SCREEN: Screen = {
  id: 'build-projects',
  title: 'Projects',
  area: 'build',
  route: '/build/projects',
  sources: PROJECTS_SOURCES,
  states: [
    {
      id: 'few',
      title: 'Not signed in, at the start: five projects as cards in two columns. No search and no groups yet',
      path: '/build/projects',
      signedOut: true,
      height: 760,
      render: () => (
        <Site bar={VISITOR_BUILD_BAR} place="projects">
          <ProjectsView projects={buildProjectsFew} mine={null} />
        </Site>
      ),
    },
    {
      id: 'many',
      title: 'Not signed in, later: fourteen projects, grouped by subject, with a search box',
      path: '/build/projects',
      signedOut: true,
      height: 1500,
      render: () => (
        <Site bar={VISITOR_BUILD_BAR} place="projects">
          <ProjectsView projects={buildProjectsFourteen} mine={null} />
        </Site>
      ),
    },
    {
      id: 'yours',
      title: 'Signed in, with builds: the same cards in the same order, your place above the facts of a card',
      path: '/build/projects',
      height: 1650,
      render: () => (
        <Site bar={builderBar} place="projects">
          <ProjectsView projects={buildProjectsFourteen} mine={projectsMine} />
        </Site>
      ),
    },
    {
      id: 'search',
      title: 'The search: typing shortens the list in place, a group with no match is left out, and nothing found',
      path: '/build/projects',
      height: 1500,
      render: () => (
        <Cases
          title="Projects: the search, and an odd number"
          intro="The search box shows from nine projects on. It looks in the name and the line of each project and filters as the person types. The box and the count keep their place."
        >
          <Frame title="1 · “server” typed" note="Two of fourteen match. Groups with no match are left out.">
            <ProjectsView projects={buildProjectsFourteen} mine={null} query="server" />
          </Frame>
          <Frame title="2 · Nothing matches" note="One line, and a way back to the whole list. No empty groups.">
            <ProjectsView projects={buildProjectsFourteen} mine={null} query="kubernetes" />
          </Frame>
          <Frame
            title="3 · An odd number of projects"
            note="The last card stands alone on the left. It keeps the width of the others."
          >
            <ProjectsView projects={buildProjectsThree} mine={null} />
          </Frame>
        </Cases>
      ),
    },
    {
      id: 'phone',
      title: 'Not signed in, fourteen projects · On a phone: the cards in one column',
      path: '/build/projects',
      signedOut: true,
      width: 390,
      height: 3000,
      render: () => (
        <Site bar={VISITOR_BUILD_BAR} place="projects">
          <ProjectsView projects={buildProjectsFourteen} mine={null} />
        </Site>
      ),
    },
  ],
};

export const BUILD_HOME_SCREENS: Screen[] = [BUILD_HOME_SCREEN, BUILD_PROJECTS_SCREEN];
