import type { Route } from 'next';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { CourseBuildLine } from '@/components/build/doors/course-build-line';
import { type GoFurtherParts, GoFurtherRows } from '@/components/build/doors/go-further-rows';
import { IssueBuildLine } from '@/components/build/doors/issue-build-line';
import { BuildRemindersRow } from '@/components/build/settings/build-reminders-row';
import { SettingsGroup, SettingsList } from '@/components/workspace/settings-rows';
import {
  doorsAllBuilt,
  doorsInProgress,
  doorsMany,
  doorsNone,
  doorsOne,
  doorsPlaces,
  doorsTestLeft,
  doorsTwo,
} from '@/lib/build/__fixtures__/doors';
import type { BuildDoors } from '@/lib/build/types';

/*
 * The doors into Build on Learn's and Contribute's pages, for a person Build is open to, and Build's row in Settings.
 * For anyone else the pages are today's.
 */

/** One state on a board: its name and note, then the part of the page it changes. */
function Frame({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{note}</span>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border p-5">{children}</div>
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

/** The course's numbers, as the line above Build's. */
const NUMBERS = <p className="m-0 text-sm text-muted-foreground">10 of 86 learned · 3 practised · 1 mastered</p>;

const line = (doors: BuildDoors) => (
  <>
    {NUMBERS}
    <CourseBuildLine course="algorithms" drawn={doors} />
  </>
);

const NEXT = { name: 'Databases and SQL', href: '/learn/courses/databases' as Route, lessons: 64 };
const ISSUES = { open: 2, href: '/learn/courses/algorithms/real-world' as Route };

/** "Go further" in the box a finished course draws it in. */
const further = (doors: BuildDoors, parts: GoFurtherParts) => (
  <section className="flex max-w-sm min-w-0 flex-col gap-3 rounded-xl border bg-card p-5">
    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Go further</span>
    <GoFurtherRows course="algorithms" parts={parts} today={null} drawn={doors} />
  </section>
);

const LESSON = {
  slug: 'find-duplicates',
  title: 'Find duplicates in one pass with a set',
  href: '/learn/lessons/find-duplicates' as Route,
  learned: false,
};

const SOURCES = [
  'components/build/doors/course-build-line.tsx',
  'components/build/doors/go-further-rows.tsx',
  'components/build/doors/issue-build-line.tsx',
  'components/build/doors/door-marks.tsx',
  'components/build/settings/build-reminders-row.tsx',
  'lib/build/doors.ts',
  'lib/build/settings.ts',
];

export const BUILD_DOORS_SCREENS: Screen[] = [
  {
    id: 'build-doors',
    title: 'The doors into Build, and Build reminders in Settings',
    area: 'build',
    route: '/learn/courses/algorithms',
    sources: SOURCES,
    states: [
      {
        id: 'cases',
        title: 'Every case of the three doors: the line on a course, "Go further", the line on an issue',
        path: '/learn/courses/algorithms',
        height: 2900,
        render: () => (
          <Cases
            title="The doors into Build, in every case"
            intro="Each is read from what a project already names: its courses. A door with nothing behind it is not shown."
          >
            <Frame title="One project names the course" note="Under the course's numbers.">
              {line(doorsOne)}
            </Frame>
            <Frame title="Two projects" note="The things, each to its project.">
              {line(doorsTwo)}
            </Frame>
            <Frame title="Many projects" note={'Three names, then "2 more", which opens the Projects list.'}>
              {line(doorsMany)}
            </Frame>
            <Frame title="The person's place" note="A built project has the tick. A build in progress says its step.">
              {line(doorsPlaces)}
            </Frame>
            <Frame title="The test left" note="Every step of the build is built; only its test is left.">
              {line(doorsTestLeft)}
            </Frame>
            <Frame title="No project names the course" note="The line is not there.">
              {line(doorsNone)}
            </Frame>
            <Frame title="Go further: a course, a project not started, issues" note="Learn, build, fix.">
              {further(doorsOne, { next: NEXT, issues: ISSUES })}
            </Frame>
            <Frame title="Go further: a build in progress" note="The project's row follows the person.">
              {further(doorsInProgress, { next: NEXT, issues: ISSUES })}
            </Frame>
            <Frame title="Go further: every step built, the test left" note="It leads to the test.">
              {further(doorsTestLeft, { next: NEXT, issues: ISSUES })}
            </Frame>
            <Frame title="Go further: no project left" note="The job row takes the free place.">
              {further(doorsAllBuilt, { next: NEXT, issues: ISSUES })}
            </Frame>
            <Frame
              title="Go further: no next course, no project left"
              note="Issues, then the job row in the free place."
            >
              {further(doorsAllBuilt, { next: null, issues: ISSUES })}
            </Frame>
            <Frame title="Go further: nothing else to offer" note="One row, never an empty box.">
              {further(doorsNone, { next: null, issues: null })}
            </Frame>
            <Frame title="An issue: the lesson is new, and a project uses it" note={'After "Not for me".'}>
              <IssueBuildLine lesson={LESSON} drawn={doorsOne} />
            </Frame>
            <Frame title="An issue: the lesson is learned" note="Only the project is offered.">
              <IssueBuildLine lesson={{ ...LESSON, learned: true }} drawn={doorsOne} />
            </Frame>
            <Frame title="An issue: no project uses the lesson, or it is built" note="Only the lesson is offered.">
              <IssueBuildLine lesson={LESSON} drawn={doorsAllBuilt} />
            </Frame>
          </Cases>
        ),
      },
      {
        id: 'settings',
        title: 'Settings: "Build reminders", first under Email from Build\'s bar, on, off, and with no address',
        path: '/my/settings?from=build',
        height: 720,
        render: () => (
          <Cases
            title="Build reminders"
            intro="One switch for both of Build's emails. It changes in place and saves at once."
          >
            <SettingsGroup id="email" title="Email">
              <SettingsList>
                <BuildRemindersRow on />
              </SettingsList>
            </SettingsGroup>
            <SettingsGroup id="email-off" title="Email">
              <SettingsList>
                <BuildRemindersRow on={false} />
              </SettingsList>
            </SettingsGroup>
            <SettingsGroup id="email-no-address" title="Email">
              <SettingsList>
                <BuildRemindersRow on={false} noAddress />
              </SettingsList>
            </SettingsGroup>
          </Cases>
        ),
      },
    ],
  },
];
