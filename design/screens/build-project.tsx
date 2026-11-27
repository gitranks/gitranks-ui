import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { BuildBar } from '@/components/build/bar/build-bar';
import { ProjectBox } from '@/components/build/project/project-box';
import { ProjectParts } from '@/components/build/project/project-steps';
import { ProjectView, type ProjectViewProps, WhatNext } from '@/components/build/project/project-view';
import { Header } from '@/components/header/header';
import { barBuilder, barNone } from '@/lib/build/__fixtures__/builds';
import {
  builtOnePart,
  endTestFailedNow,
  jsonParserProject,
  mcpServerFiveParts,
  mineAgentNoBuild,
  mineBuilt,
  mineGoldEarned,
  mineGoldOpen,
  mineInPart,
  mineInPartGoldOpen,
  mineInProgress,
  mineNoAgent,
  mineTestLeft,
  mineTwoBuilds,
  mineTwoBuildsOneBuilt,
  mineTwoBuildsOtherTestLeft,
} from '@/lib/build/__fixtures__/project-page';
import { buildBarViewOf } from '@/lib/build/build-bar';
import { buildProjectPath } from '@/lib/build/paths';
import type { ProjectSide } from '@/lib/build/project';
import type { BuildBar as BuildBarRead, BuildProjectMine, BuildTest } from '@/lib/build/types';

/*
 * A project's page (Build, page 2): a visitor, a build in progress, the test left, built, a small project, the box in
 * every state with the optional parts and "What next", and a phone. The boards are the approved designs' order.
 */

const PATH = buildProjectPath(mcpServerFiveParts.slug);

const SOURCES = [
  'app/(build)/build/[project]/page.tsx',
  'components/build/project/project-live.tsx',
  'components/build/project/project-view.tsx',
  'components/build/project/project-box.tsx',
  'components/build/project/project-steps.tsx',
  'components/build/project/project-say.tsx',
  'components/build/project/project-squares.tsx',
  'lib/build/project.ts',
  'lib/build/project.data.ts',
];

const person = (mine: BuildProjectMine, test: BuildTest | null = null): ProjectSide => ({
  kind: 'person',
  mine,
  test,
});

/** The site's header, Build's bar, then the page. */
function Page({ bar, ...props }: ProjectViewProps & { bar: BuildBarRead }) {
  return (
    <>
      <Header />
      <BuildBar view={buildBarViewOf(bar)} place="projects" />
      <ProjectView {...props} />
    </>
  );
}

/** One state on the board of states: its name and what it shows, then the part that changes. */
function Case({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        {note && <span className="text-sm text-muted-foreground">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="m-0 text-xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

const box = (side: ProjectSide) => <ProjectBox project={mcpServerFiveParts} side={side} />;
const parts = (side: ProjectSide, open: string[] = []) => (
  <ProjectParts
    project={mcpServerFiveParts}
    build={side.kind === 'person' ? (side.mine.builds[0] ?? null) : null}
    openParts={open}
  />
);

export const BUILD_PROJECT_SCREEN: Screen = {
  id: 'build-project',
  title: 'A project',
  area: 'build',
  route: '/build/[project]',
  sources: SOURCES,
  states: [
    {
      id: 'visitor',
      title: 'Not signed in: what it is, how to start, what you will have, the steps, courses that help, what you need',
      path: PATH,
      signedOut: true,
      height: 2350,
      render: () => <Page bar={barNone} project={mcpServerFiveParts} side={{ kind: 'visitor' }} />,
    },
    {
      id: 'progress',
      title: 'Your build is on step 9: the box says how to go on, the list shows your place',
      path: PATH,
      height: 1660,
      render: () => <Page bar={barBuilder} project={mcpServerFiveParts} side={person(mineInProgress)} />,
    },
    {
      id: 'test-left',
      title: 'Every step is done and the test is left: one button, and the optional parts offered beside it',
      path: PATH,
      height: 1680,
      render: () => <Page bar={barBuilder} project={mcpServerFiveParts} side={person(mineTestLeft)} />,
    },
    {
      id: 'built',
      title: 'Built, with one optional part built too and opened: the marks, when the gold test opens, what next',
      path: PATH,
      height: 2180,
      render: () => (
        <Page bar={barBuilder} project={mcpServerFiveParts} side={person(mineBuilt)} openParts={['official-sdk']} />
      ),
    },
    {
      id: 'small',
      title: 'A small one, not signed in: no optional parts, no courses. Those sections are simply not there',
      path: buildProjectPath(jsonParserProject.slug),
      signedOut: true,
      height: 1540,
      render: () => <Page bar={barNone} project={jsonParserProject} side={{ kind: 'visitor' }} />,
    },
    {
      id: 'states',
      title: 'What changes with the person: the box in every state, the optional parts folded and opened, What next',
      path: PATH,
      width: 1000,
      height: 6900,
      render: () => (
        <main className="mx-auto flex w-full max-w-[920px] flex-col gap-10 px-4 pt-8 pb-16">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 text-3xl font-bold tracking-tight">A project: what changes with the person</h1>
            <p className="m-0 text-base text-muted-foreground">
              One box under the title says what to do now, with the same frame in every state. A built project also gets
              What next, with only the doors that lead somewhere.
            </p>
          </div>
          <Part title="The box">
            <Case
              title="1 · Not signed in"
              note="The main button is to connect an agent; the start flow signs in first."
            >
              {box({ kind: 'visitor' })}
            </Case>
            <Case title="2 · Signed in, no agent has ever connected">{box(person(mineNoAgent))}</Case>
            <Case
              title="3 · Signed in, an agent is connected, nothing started"
              note="No button: the sentence is the action."
            >
              {box(person(mineAgentNoBuild))}
            </Case>
            <Case title="4 · A build in progress">{box(person(mineInProgress))}</Case>
            <Case title="5 · Every step done, the test left">{box(person(mineTestLeft))}</Case>
            <Case
              title="6 · The test was not passed"
              note="It can be taken again at once. One link: the test's page opens on the answers and its own Take the test again."
            >
              {box(person(mineTestLeft, endTestFailedNow))}
            </Case>
            <Case title="7 · Built, the gold test not open yet">{box(person(mineBuilt))}</Case>
            <Case title="8 · Built, the gold test open">{box(person(mineGoldOpen))}</Case>
            <Case title="9 · Built and repeated">{box(person(mineGoldEarned))}</Case>
            <Case title="10 · Built, and now in an optional part">{box(person(mineInPart))}</Case>
            <Case
              title="10 · In an optional part, with the gold test open"
              note="A test that waits is the main button; the part's place and the sentence come under it."
            >
              {box(person(mineInPartGoldOpen))}
            </Case>
            <Case title="11 · Two builds of one project" note="The one touched last, and the other in one line.">
              {box(person(mineTwoBuilds))}
            </Case>
            <Case title="11 · Two builds, the other's test left" note="The line leads to that build's test.">
              {box(person(mineTwoBuildsOtherTestLeft))}
            </Case>
            <Case
              title="11 · Two builds, the one touched last built"
              note="The sentence to go on with the other, which is not finished."
            >
              {box(person(mineTwoBuildsOneBuilt))}
            </Case>
          </Part>
          <Part title="The optional parts">
            <Case title="1 · Folded" note="One row for each part. This is how the list opens.">
              {parts({ kind: 'visitor' })}
            </Case>
            <Case title="2 · A part opened, nothing passed" note="Pressing a row opens its steps under it, in place.">
              {parts({ kind: 'visitor' }, ['official-sdk'])}
            </Case>
            <Case title="3 · A part in progress, opened" note="Passed steps have the tick; the row shows 2 of 7.">
              {parts(person(mineInPart), ['http'])}
            </Case>
            <Case title="4 · A built part, opened" note="Every step is ticked, and the row says Built.">
              {parts(person(mineBuilt), ['official-sdk'])}
            </Case>
          </Part>
          <Part title="What next">
            <Case title="1 · Every door" note="The next part of this project, the next project, a course.">
              <WhatNext project={mcpServerFiveParts} build={builtOnePart} />
            </Case>
            <Case title="2 · One door" note="A project with no parts and no course still leads to the next project.">
              <WhatNext project={jsonParserProject} build={builtOnePart} />
            </Case>
          </Part>
        </main>
      ),
    },
    {
      id: 'phone',
      title: 'Not signed in, on a phone: the same column, the same order',
      path: PATH,
      signedOut: true,
      width: 390,
      height: 2730,
      render: () => <Page bar={barNone} project={mcpServerFiveParts} side={{ kind: 'visitor' }} />,
    },
  ],
};

export const BUILD_PROJECT_SCREENS: Screen[] = [BUILD_PROJECT_SCREEN];
