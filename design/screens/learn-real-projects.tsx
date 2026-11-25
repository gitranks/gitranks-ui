import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { type IssuesLayer, IssuesScreen } from '@/components/learn/issues/issues-screen';
import type { FixesLayer } from '@/components/learn/issues/real-projects-screen';
import {
  issuesNames,
  learnFixes,
  listNone,
  listOutsideForYou,
  personalList,
  views,
  visitorRows,
} from '@/lib/learn/__fixtures__/issues';
import { passedFixes, tenOfMany } from '@/lib/learn/__fixtures__/real-projects';
import type { IssuesAt, IssuesView, LearnFixes } from '@/lib/learn/issues';
import { looksToday } from '@/lib/workspace/__fixtures__/masked-issue';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';

/**
 * A lesson in real projects, and a course's view with it, from fixtures: the top, the chips, the two groups
 * "Open" then "Fixed" with their ends, and the foot, as the page draws them.
 */

const PAGE = '/learn/lessons/find-duplicates-with-a-set/real-world';

const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const member = { looks: looksToday({ limit: 10, left: 9 }), numbers: null } satisfies MaskedListReads;
const fewFixes: LearnFixes = { ...learnFixes, total: learnFixes.rows.length, next: null };
const fixed = (fixes: LearnFixes): FixesLayer => ({ kind: 'fixed', fixes });
const noFix = fixed({ rows: [], total: 0, next: null });

const draw = (
  layer: IssuesLayer,
  fixes: FixesLayer | null,
  {
    view = views.lesson,
    at = 'lesson',
    shared = visitorRows.length,
    passed = null,
  }: { view?: IssuesView; at?: IssuesAt; shared?: number; passed?: ReadonlySet<string> | null } = {},
) => (
  <IssuesScreen view={view} at={at} names={issuesNames} layer={layer} fixes={fixes} shared={shared} passed={passed} />
);

const mine = (rows: number) => ({
  kind: 'personal' as const,
  list: { ...personalList(), rows: personalList().rows.slice(0, rows) },
  reads: member,
});

export const LEARN_REAL_PROJECTS_SCREENS: Screen[] = [
  {
    id: 'learn-real-projects',
    title: 'A lesson in real projects: open issues and merged fixes',
    area: 'learn',
    route: '/learn/lessons/[slug]/real-world',
    sources: [
      'components/learn/issues/real-projects-screen.tsx',
      'components/learn/issues/real-projects.tsx',
      'lib/learn/real-projects.ts',
      'lib/learn/issues.ts',
    ],
    states: [
      {
        id: 'member',
        title: 'Signed in: both groups, "Passed" on a fix whose walkthrough the reader passed',
        path: PAGE,
        height: 1400,
        render: () => draw(mine(3), fixed(fewFixes), { passed: passedFixes }),
      },
      {
        id: 'visitor',
        title: 'A visitor: the five for the view, no switches, no "Passed"',
        path: PAGE,
        signedOut: true,
        height: 1500,
        render: () => draw({ kind: 'visitor', rows: visitorRows }, fixed(fewFixes)),
      },
      {
        id: 'many-fixes',
        title: 'More than ten fixes: ten, the count and "Show 10 more"',
        path: PAGE,
        height: 1800,
        render: () => draw(mine(2), fixed({ rows: tenOfMany, total: 23, next: 'c2' }), { passed: passedFixes }),
      },
      {
        id: 'ends',
        title: 'The ends: each group says it holds nothing in its own place',
        path: PAGE,
        height: 1500,
        render: () => (
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-7 pb-16">
            <Case title="No open issue needs the lesson; fixes are merged">
              {draw({ kind: 'personal', list: listNone(), reads: member }, fixed(fewFixes), { shared: 0 })}
            </Case>
            <Case title="The person's own view has none while the shared list has some; no fix yet">
              {draw({ kind: 'personal', list: listOutsideForYou(), reads: member }, noFix)}
            </Case>
          </main>
        ),
      },
      {
        id: 'course',
        title: "A course's view: the same top and groups, each row naming its lesson",
        path: '/learn/courses/algorithms/real-world',
        height: 1400,
        render: () =>
          draw(mine(3), fixed(fewFixes), { view: { ...views.course, learned: false, show: 'both' }, at: 'course' }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: PAGE,
        width: 390,
        height: 2200,
        render: () => draw(mine(2), fixed(fewFixes), { passed: passedFixes }),
      },
    ],
  },
];
