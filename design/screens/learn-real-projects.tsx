import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { IssuesEndBox, IssuesFilters, IssuesFoot } from '@/components/learn/issues/issues-parts';
import {
  RealFixes,
  RealProjectsEnd,
  RealProjectsGroup,
  RealProjectsTop,
} from '@/components/learn/issues/real-projects';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import {
  issuesNames,
  learnFixes,
  listOutsideForYou,
  personalList,
  views,
  visitorRows,
} from '@/lib/learn/__fixtures__/issues';
import { fixLanguageOf, passedFixes, tenOfMany } from '@/lib/learn/__fixtures__/real-projects';
import { type IssuesChip, type IssuesRow, issuesEndOf, issuesSwitchesOf, type LearnFixes } from '@/lib/learn/issues';
import { learnLessonPath } from '@/lib/learn/paths';
import { FIXED_NONE, OPEN_NONE } from '@/lib/learn/real-projects';
import { looksToday } from '@/lib/workspace/__fixtures__/masked-issue';
import { type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';

/**
 * A lesson in real projects (page 53), from fixtures: the top, the chips, the two groups "Open" then "Fixed" and their
 * ends, and the foot. Held back from the export (`exported: false`) until the page switches to it.
 */

const SLUG = 'find-duplicates-with-a-set';
const PAGE = `/learn/lessons/${SLUG}/real-world`;

/** The chips as the board draws them; the page's own step works them out of the view. */
const CHIPS: IssuesChip[] = [
  { key: 'fixed', label: 'Open and fixed', removeHref: `${PAGE}?open=1` as Route },
  { key: 'lesson', label: `Lesson: ${issuesNames.lesson}`, removeHref: '/learn/issues' as Route },
];

const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

function OpenRows({ rows, visitor, reads }: { rows: readonly IssuesRow[]; visitor: boolean; reads: MaskedListReads }) {
  return (
    <MaskedList from="learn" pageFrom="learn" visitor={visitor} reads={reads} className="gap-3">
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {rows.map((row) => (
          <li key={row.issue.id}>
            {/* A row does not repeat the lesson's name: the page is the lesson's. */}
            <MaskedListRow issue={row.issue} full={visitor ? null : row.full} lesson={null} />
          </li>
        ))}
      </ul>
    </MaskedList>
  );
}

function Fixed({ fixes, passed }: { fixes: LearnFixes; passed: ReadonlySet<string> | null }) {
  return (
    <RealFixes
      rows={fixes.rows}
      total={fixes.total}
      passed={passed}
      languageOf={fixLanguageOf}
      onMore={fixes.next ? () => {} : undefined}
    />
  );
}

const NO_FIXES = <RealProjectsEnd end={FIXED_NONE} kind="fixed-none" />;
const NO_OPEN = <RealProjectsEnd end={OPEN_NONE} kind="open-none" />;

function Page({ visitor = false, open, fixed }: { visitor?: boolean; open: ReactNode; fixed: ReactNode }) {
  const switches = visitor ? [] : issuesSwitchesOf(views.lesson, personalList(), 'lesson');
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16" data-real-projects="">
      <RealProjectsTop backHref={learnLessonPath(SLUG)} name={issuesNames.lesson} />
      <IssuesFilters chips={CHIPS} switches={switches} clearHref={null} />
      <RealProjectsGroup group="open">{open}</RealProjectsGroup>
      <RealProjectsGroup group="fixed">{fixed}</RealProjectsGroup>
      <IssuesFoot markdownHref={`${PAGE}.md`} />
    </main>
  );
}

/** The person's own view is empty while issues wait outside "For you". */
const NARROWED_END = issuesEndOf(views.lesson, listOutsideForYou(), 'lesson') ?? {
  title: '',
  text: '',
  turnOff: null,
  email: false,
};

const member = { looks: looksToday({ limit: 10, left: 9 }), numbers: null } satisfies MaskedListReads;
const fewFixes: LearnFixes = { ...learnFixes, total: learnFixes.rows.length, next: null };

export const LEARN_REAL_PROJECTS_SCREENS: Screen[] = [
  {
    id: 'learn-real-projects',
    title: 'A lesson in real projects: open issues and merged fixes',
    area: 'learn',
    route: '/learn/lessons/[slug]/real-world',
    exported: false,
    sources: ['components/learn/issues/real-projects.tsx', 'lib/learn/real-projects.ts'],
    states: [
      {
        id: 'member',
        title: 'Signed in: both groups, "Passed" on a fix whose walkthrough the reader passed',
        path: PAGE,
        height: 1400,
        render: () => (
          <Page
            open={<OpenRows rows={personalList().rows.slice(0, 3)} visitor={false} reads={member} />}
            fixed={<Fixed fixes={fewFixes} passed={passedFixes} />}
          />
        ),
      },
      {
        id: 'visitor',
        title: 'A visitor: the five for the view, no switches, no "Passed"',
        path: PAGE,
        signedOut: true,
        height: 1500,
        render: () => (
          <Page
            visitor
            open={<OpenRows rows={visitorRows} visitor reads={NO_MASKED_READS} />}
            fixed={<Fixed fixes={fewFixes} passed={null} />}
          />
        ),
      },
      {
        id: 'many-fixes',
        title: 'More than ten fixes: ten, the count and "Show 10 more"',
        path: PAGE,
        height: 1800,
        render: () => (
          <Page
            open={<OpenRows rows={personalList().rows.slice(0, 2)} visitor={false} reads={member} />}
            fixed={<Fixed fixes={{ rows: tenOfMany, total: 23, next: 'c2' }} passed={passedFixes} />}
          />
        ),
      },
      {
        id: 'ends',
        title: 'The ends: each group says it holds nothing in its own place',
        path: PAGE,
        height: 1500,
        render: () => (
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-7 pb-16">
            <Case title="No open issue needs the lesson; fixes are merged">
              <Page open={NO_OPEN} fixed={<Fixed fixes={fewFixes} passed={null} />} />
            </Case>
            <Case title="The person's own view has none while the shared list has some; no fix yet">
              <Page open={<IssuesEndBox end={NARROWED_END} email={null} />} fixed={NO_FIXES} />
            </Case>
          </main>
        ),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: PAGE,
        width: 390,
        height: 2200,
        render: () => (
          <Page
            open={<OpenRows rows={personalList().rows.slice(0, 2)} visitor={false} reads={member} />}
            fixed={<Fixed fixes={fewFixes} passed={passedFixes} />}
          />
        ),
      },
    ],
  },
];
