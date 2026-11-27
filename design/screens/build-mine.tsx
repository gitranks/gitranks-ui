import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { BuildBar } from '@/components/build/bar/build-bar';
import { MINE_MAIN_CLASS, MineBody, MineHead } from '@/components/build/mine/mine-parts';
import { Header } from '@/components/header/header';
import {
  MINE_NOW,
  mineBoardEmpty,
  mineBoardFull,
  mineBoardGoldOpensOn,
  mineBoardNoMark,
  mineBoardOne,
  mineBoardOnlyBuilt,
  mineBoardPhone,
  mineBoardRepeated,
  mineBoardTwoInProgress,
  mineMcpInProgress,
} from '@/lib/build/__fixtures__/mine';
import type { BuildBarView } from '@/lib/build/build-bar';
import { mineViewOf } from '@/lib/build/mine';
import type { BuildMineList } from '@/lib/build/types';

/*
 * My builds (Build's page 8), as its route draws it once the person's builds are in, from fixtures and on the boards'
 * own day (26 Nov 2026), its days counted in UTC: someone with several, the usual start, the other cases, the phone.
 */

const removed = async () => 'removed' as const;

const barOf = (tests: number | null): BuildBarView => ({ tabs: ['home', 'projects', 'mine', 'settings'], tests });

/** The page: the header, Build's bar with My builds current, the title and the lists. */
function MinePage({ list, tests = null }: { list: BuildMineList; tests?: number | null }) {
  return (
    <div className="bg-background">
      <Header />
      <BuildBar view={barOf(tests)} place="mine" />
      <main className={MINE_MAIN_CLASS}>
        <MineHead />
        <MineBody view={mineViewOf(list, MINE_NOW, 'UTC')} login="octocat" onRemove={removed} />
      </main>
    </div>
  );
}

/** One of the other cases: its name and why, then only the part of the page that differs. */
function Case({ title, line, children }: { title: string; line: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-sm font-semibold">{title}</h2>
        <p className="m-0 text-sm text-muted-foreground">{line}</p>
      </div>
      <div className="flex flex-col gap-6 rounded-xl border p-5">{children}</div>
    </section>
  );
}

function Lists({ list, asking = null }: { list: BuildMineList; asking?: string | null }) {
  return (
    <div className="flex flex-col gap-10">
      <MineBody view={mineViewOf(list, MINE_NOW, 'UTC')} login="octocat" asking={asking} onRemove={removed} />
    </div>
  );
}

/** The other cases, each drawn by the part that differs. */
function CasesBoard() {
  return (
    <main className="mx-auto flex w-full max-w-[920px] flex-col gap-10 px-4 pt-8 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-bold tracking-tight">My builds: the other cases</h1>
        <p className="m-0 text-base text-muted-foreground">Only the part that differs is drawn.</p>
      </header>
      <Case
        title="1 · “Remove” pressed on a build in progress"
        line="The row asks in its own place, and nothing else moves. Only a build in progress can be removed; a built project stays."
      >
        <Lists list={mineBoardTwoInProgress} asking={mineMcpInProgress.build} />
      </Case>
      <Case
        title="2 · A built project, the gold test not open yet"
        line="The row says when it opens. No button for it yet."
      >
        <Lists list={mineBoardGoldOpensOn} />
      </Case>
      <Case title="3 · A built project with no mark" line="Nothing is shown where a mark would be.">
        <Lists list={mineBoardNoMark} />
      </Case>
      <Case title="4 · Built and repeated" line="Both marks, gold first. The gold test earned: no line on it.">
        <Lists list={mineBoardRepeated} />
      </Case>
      <Case
        title="5 · Only built projects"
        line="No “Waiting for you”, no “In progress”, and no sentence to say. One line leads on. One row a build: a project built in two languages is two rows, each with its own score and gold test (the approved board drew one row for both)."
      >
        <Lists list={mineBoardOnlyBuilt} />
      </Case>
      <Case
        title="6 · Nothing started, and the address opened by hand"
        line="The tab is not in the bar for this person. The page still answers, with one way on."
      >
        <Lists list={mineBoardEmpty} />
      </Case>
    </main>
  );
}

export const BUILD_MINE_SCREENS: Screen[] = [
  {
    id: 'build-mine',
    title: 'My builds',
    area: 'build',
    route: '/build/mine',
    sources: [
      'app/(build)/build/mine/page.tsx',
      'components/build/mine/mine-live.tsx',
      'components/build/mine/mine-parts.tsx',
      'lib/build/mine.ts',
      'lib/build/__fixtures__/mine.ts',
    ],
    states: [
      {
        id: 'full',
        title: 'Someone with several: two tests wait, two builds are in progress, projects are built',
        path: '/build/mine',
        height: 1500,
        render: () => <MinePage list={mineBoardFull} tests={2} />,
      },
      {
        id: 'one',
        title: 'The usual start: one build in progress and nothing else',
        path: '/build/mine',
        height: 720,
        render: () => <MinePage list={mineBoardOne} />,
      },
      {
        id: 'cases',
        title: 'The other cases: removing a build, a built project in each state, only built projects, nothing started',
        path: '/build/mine',
        height: 2000,
        render: () => <CasesBoard />,
      },
      {
        id: 'phone',
        title: 'On a phone: a row’s buttons drop under its text',
        path: '/build/mine',
        width: 390,
        height: 1700,
        render: () => <MinePage list={mineBoardPhone} tests={1} />,
      },
    ],
  },
];
