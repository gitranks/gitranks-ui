import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { SkillsBlock } from '@/components/skills/skills-block';
import { SkillsCourseCard } from '@/components/skills/skills-course-card';
import { SkillsFixRow } from '@/components/skills/skills-fix-row';
import { SkillsMissing } from '@/components/skills/skills-missing';
import { SkillsNumbersBox } from '@/components/skills/skills-numbers-box';
import { SkillsPageView } from '@/components/skills/skills-page-view';
import { SkillsStart } from '@/components/skills/skills-start';
import { SkillsStrip } from '@/components/skills/skills-strip';
import {
  bothNumbers,
  contributorNumbers,
  databasesCourse,
  firstFixNumbers,
  firstLessonCourse,
  hiddenPageFix,
  learnerFixes,
  learnerNumbers,
  longPage,
  openOnlyNumbers,
  repoCourse,
  SKILLS_LOGIN,
  SKILLS_NOW,
  skillsMine,
} from '@/lib/skills/__fixtures__/skills';
import { skillsPath } from '@/lib/skills/paths';
import type { SkillsMine } from '@/lib/skills/skills.types';
import { otherBoxOf } from '@/lib/skills/skills-owner';

/**
 * The parts of the Skills tab and the profile's Skills block, from fixtures, before a page uses them. Held back from
 * the export (`exported: false`) until the profile switches to them: the export is at its file limit.
 */

const noop = () => {};
const TAB_ROUTE = '/profile/[login]/skills';
const TAB_PATH = skillsPath(SKILLS_LOGIN);
const PROFILE_PATH = `/profile/${SKILLS_LOGIN}`;
const HREF = `https://gitranks.com${TAB_PATH}`;

const frame = (children: ReactNode) => (
  <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-7 pb-16">{children}</main>
);

/** A labelled part of a board that shows several states one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const strip = (mine: SkillsMine) => <SkillsStrip mine={mine} href={HREF} onHide={noop} onShow={noop} />;

/** The owner's own page: the strip, the content, and the box about the product they do not use. */
const ownPage = (mine: SkillsMine) =>
  mine.page ? <SkillsPageView now={SKILLS_NOW} page={mine.page} strip={strip(mine)} other={otherBoxOf(mine)} /> : null;

const tab = (id: string, title: string, height: number, render: () => ReactNode, width?: number) => ({
  id,
  title,
  path: TAB_PATH,
  height,
  width,
  render: () => frame(render()),
});

export const SKILLS_PART_SCREENS: Screen[] = [
  {
    id: 'skills-parts',
    title: 'Skills',
    area: 'profile',
    route: TAB_ROUTE,
    exported: false,
    sources: [
      'components/skills/skills-page-view.tsx',
      'components/skills/skills-numbers-box.tsx',
      'components/skills/skills-fixes.tsx',
      'components/skills/skills-fix-row.tsx',
      'components/skills/skills-courses.tsx',
      'components/skills/skills-course-card.tsx',
      'components/skills/skills-strip.tsx',
      'components/skills/skills-start.tsx',
      'components/skills/skills-missing.tsx',
      'lib/skills/skills-figures.ts',
      'lib/skills/skills-fixes.ts',
      'lib/skills/skills-courses.ts',
      'lib/skills/skills-owner.ts',
      'lib/skills/issue-numbers.ts',
    ],
    states: [
      tab('learner', 'A learner, as everyone sees the page', 3000, () => (
        <SkillsPageView now={SKILLS_NOW} page={skillsMine.publicLearner.page ?? longPage} />
      )),
      tab('contributor', 'A contributor, with 20 fixes a page and "Show 20 more"', 1700, () => (
        <SkillsPageView now={SKILLS_NOW} page={longPage} onMore={noop} />
      )),
      tab('both', 'Someone who uses both, on their own page', 3200, () => ownPage(skillsMine.publicBoth)),
      tab('first-fix', 'The first merged fix, on its owner’s page: Learn offered at the end', 1100, () =>
        ownPage(skillsMine.publicFirstFix),
      ),
      tab('first-lesson', 'The first lesson, on its owner’s page: Contribute offered at the end', 1300, () =>
        ownPage(skillsMine.publicFirstLesson),
      ),
      tab('numbers', 'The numbers box, by how many numbers have something in them', 1300, () => (
        <>
          <Case title="Four numbers, the agent last">
            <SkillsNumbersBox numbers={contributorNumbers} />
          </Case>
          <Case title="Three numbers: the agent of the one fix">
            <SkillsNumbersBox numbers={firstFixNumbers} />
          </Case>
          <Case title="Pull requests open, none merged yet">
            <SkillsNumbersBox numbers={openOnlyNumbers} />
          </Case>
          <Case title="Someone who uses both">
            <SkillsNumbersBox numbers={bothNumbers} />
          </Case>
        </>
      )),
      tab('fix-rows', 'A fix’s row: made with Learn, open, and with its page hidden', 1000, () => (
        <div className="flex flex-col gap-3">
          <Case title="Made with Learn, merged, by someone who uses both">
            <SkillsFixRow now={SKILLS_NOW} fix={learnerFixes[0]} namesProduct />
          </Case>
          <Case title="Open, in review">
            <SkillsFixRow now={SKILLS_NOW} fix={learnerFixes[2]} namesProduct />
          </Case>
          <Case title="Its page hidden by its sender: the GitHub links alone">
            <SkillsFixRow now={SKILLS_NOW} fix={hiddenPageFix} />
          </Case>
          <Case title="Made with Learn, read by someone Learn is not open to">
            <SkillsFixRow now={SKILLS_NOW} fix={learnerFixes[1]} learnOpen={false} />
          </Case>
        </div>
      )),
      tab('course-cards', 'A course card: finished, on its first lesson, and about a repository', 1500, () => (
        <>
          <SkillsCourseCard now={SKILLS_NOW} course={databasesCourse} />
          <SkillsCourseCard now={SKILLS_NOW} course={firstLessonCourse} />
          <SkillsCourseCard now={SKILLS_NOW} course={repoCourse} />
        </>
      )),
      tab('strip', 'The owner’s strip in each state: one height in all of them', 700, () => (
        <>
          <Case title="Everyone can see it">{strip(skillsMine.publicLearner)}</Case>
          <Case title="Hidden">{strip(skillsMine.hiddenLearner)}</Case>
          <Case title="Only theirs: nothing public yet">{strip(skillsMine.privateLearner)}</Case>
          <Case title="Empty">{strip(skillsMine.new)}</Case>
        </>
      )),
      tab('new', 'Someone who uses neither product, on their own page', 1300, () => (
        <>
          {strip(skillsMine.new)}
          <SkillsStart mine={skillsMine.new} />
        </>
      )),
      tab('new-learn-closed', 'Someone who uses neither, while Learn is not open to them', 1100, () => (
        <>
          {strip(skillsMine.newLearnClosed)}
          <SkillsStart mine={skillsMine.newLearnClosed} />
        </>
      )),
      tab('nothing-yet', 'Nothing on the page yet: the step for each product used', 1500, () => (
        <>
          <Case title="Uses both">
            <SkillsStart mine={skillsMine.nothingYetBoth} />
          </Case>
          <Case title="Uses Contribute">
            <SkillsStart mine={skillsMine.nothingYetContributor} />
          </Case>
          <Case title="Uses Learn">
            <SkillsStart mine={skillsMine.nothingYetLearner} />
          </Case>
        </>
      )),
      tab('learn-closed', 'Someone who uses both, read by someone Learn is not open to: nothing of Learn', 1100, () => (
        <SkillsPageView now={SKILLS_NOW} page={skillsMine.publicBoth.page ?? longPage} learnOpen={false} />
      )),
      tab('missing', 'No Skills page for this person', 600, () => (
        <>
          <Case title="A login with no Skills page">
            <SkillsMissing login={SKILLS_LOGIN} />
          </Case>
          <Case title="A long login">
            <SkillsMissing login="a-very-long-github-login-name" />
          </Case>
        </>
      )),
      tab(
        'phone',
        'Someone who uses both, on a phone',
        3600,
        () => <SkillsPageView now={SKILLS_NOW} page={skillsMine.publicBoth.page ?? longPage} />,
        390,
      ),
    ],
  },
  {
    id: 'skills-block',
    title: 'The Skills block',
    area: 'profile',
    route: '/profile/[login]',
    exported: false,
    sources: ['components/skills/skills-block.tsx', 'lib/skills/skills-owner.ts'],
    states: [
      {
        id: 'each',
        title: 'The block for a contributor, a learner, someone who uses both, and the first fix',
        path: PROFILE_PATH,
        height: 1400,
        render: () =>
          frame(
            <>
              <SkillsBlock login={SKILLS_LOGIN} numbers={contributorNumbers} id="profile-skills-1" />
              <SkillsBlock login={SKILLS_LOGIN} numbers={learnerNumbers} id="profile-skills-2" />
              <SkillsBlock login={SKILLS_LOGIN} numbers={bothNumbers} id="profile-skills-3" />
              <SkillsBlock login={SKILLS_LOGIN} numbers={firstFixNumbers} id="profile-skills-4" />
            </>,
          ),
      },
      {
        id: 'learn-closed',
        title: 'The block of someone who uses both, read by someone Learn is not open to',
        path: PROFILE_PATH,
        height: 500,
        render: () => frame(<SkillsBlock login={SKILLS_LOGIN} numbers={bothNumbers} learnOpen={false} />),
      },
      {
        id: 'owner',
        title: 'The block its owner sees while the page is hidden, or only theirs',
        path: PROFILE_PATH,
        height: 800,
        render: () =>
          frame(
            <>
              <SkillsBlock login={SKILLS_LOGIN} numbers={learnerNumbers} ownState="HIDDEN" id="profile-skills-5" />
              <SkillsBlock login={SKILLS_LOGIN} numbers={learnerNumbers} ownState="PRIVATE" id="profile-skills-6" />
            </>,
          ),
      },
      {
        id: 'phone',
        title: 'The block on a phone: three numbers, the last on its own row',
        path: PROFILE_PATH,
        width: 390,
        height: 500,
        render: () => frame(<SkillsBlock login={SKILLS_LOGIN} numbers={contributorNumbers} />),
      },
    ],
  },
];
