import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { MY_PROGRESS_SOURCES, MyProgressPhone } from './learn-progress';
import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { CourseGoneView } from '@/components/learn/course/course-gone';
import { CourseView, type CourseViewProps } from '@/components/learn/course/course-view';
import { CoursesView, type CoursesViewProps } from '@/components/learn/courses/courses-view';
import {
  algorithmsCourse,
  algorithmsCoursePaused,
  allKnownMine,
  checkSavedMine,
  checkUnfinishedMine,
  courseCards,
  coursesMine,
  coursesMineAllLearned,
  coursesMineChecked,
  djangoCourse,
  doneMine,
  donePausedMine,
  freshMine,
  goCourse,
  groupDoneMine,
  knownLaterMine,
  lessonAt,
  lessonDepths,
  lessonList,
  otherCourses,
  progressMine,
} from '@/lib/learn/__fixtures__/course';
import { courseGoneTextOf, LEARN_MISSING_TEXT } from '@/lib/learn/course-gone';
import type { LearnBarState } from '@/lib/learn/learn-bar';

/*
 * A course's page and all courses (pages 2 and 24). Each board draws every state of one screen, one under the other,
 * each cut to the part that state changes, so the comparison needs few boards.
 */

const noop = () => {};
const saved = async () => true;
const learnerBar = (due = 0): LearnBarState => ({ kind: 'learner', due, pullRequests: false, pullRequestsNeedYou: 0 });

/** One state on a board: its name, then the page as its route draws it, cut at `height`. */
function Frame({ title, height, children }: { title: string; height: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-sm font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border bg-background" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

/** The site's header and Learn's bar, as the layout draws them. */
function Site({ bar, children }: { bar: LearnBarState; children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      <LearnBar state={bar} place="courses" />
      {children}
    </>
  );
}

function Course({ bar = learnerBar(), ...props }: Partial<CourseViewProps> & { bar?: LearnBarState }) {
  return (
    <Site bar={bar}>
      <CourseView
        course={algorithmsCourse}
        mine={null}
        others={otherCourses}
        calls={{ onSignIn: noop, onRate: saved }}
        hints
        {...props}
      />
    </Site>
  );
}

function Courses({ bar = learnerBar(6), ...props }: Partial<CoursesViewProps> & { bar?: LearnBarState }) {
  return (
    <Site bar={bar}>
      <CoursesView courses={courseCards} lessons={lessonList} mine={null} depths={null} hints {...props} />
    </Site>
  );
}

/** A board: its heading, then its frames. */
function Board({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full flex-col gap-8 px-4 pt-8 pb-16" style={{ maxWidth: 1340 }}>
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="m-0 text-sm text-muted-foreground" style={{ maxWidth: '95ch' }}>
          {intro}
        </p>
      </header>
      {children}
    </main>
  );
}

const visitor: LearnBarState = { kind: 'visitor' };
const COURSE_PATH = `/learn/courses/${algorithmsCourse.slug}`;

const COURSE_SOURCES = [
  'components/learn/course/course-view.tsx',
  'components/learn/course/course-header.tsx',
  'components/learn/course/course-boxes.tsx',
  'components/learn/course/course-lessons.tsx',
  'components/learn/course/course-marks.tsx',
  'components/learn/course/use-course-keys.ts',
  'components/learn/course/course-gone.tsx',
  'lib/learn/course.ts',
  'lib/learn/course-gone.ts',
  'lib/learn/course-gate.ts',
];

const COURSES_SOURCES = [
  'components/learn/courses/courses-view.tsx',
  'components/learn/courses/course-card.tsx',
  'components/learn/course/use-course-keys.ts',
  'lib/learn/course.ts',
];

/** A course's page, every state of page 2's boards on one board. */
export const LEARN_COURSE_SCREEN: Screen = {
  id: 'learn-course',
  title: 'A course',
  area: 'learn',
  route: '/learn/courses/[slug]',
  sources: COURSE_SOURCES,
  states: [
    {
      id: 'states',
      title: 'Every state, one under the other',
      path: COURSE_PATH,
      height: 22600,
      render: () => (
        <Board
          title="A course, in every state"
          intro="One page for a visitor and for a learner. A short head: the name, what the course is about and one row of facts. A learner's own side changes the lessons count in that row, the three boxes and the squares in place; the lessons, their groups and the footer are the same for everyone."
        >
          <Frame title="1 · Not signed in: the course, the first lesson, the check behind signing in" height={1500}>
            <Course bar={visitor} />
          </Frame>
          <Frame title="2 · Signed in, nothing learned: the first lesson next, the check offered" height={900}>
            <Course mine={freshMine} />
          </Frame>
          <Frame title="3 · In progress: the learner's line, four lessons due, the review box" height={1100}>
            <Course mine={progressMine} bar={learnerBar(4)} />
          </Frame>
          <Frame title="4 · A group just finished: it says Done, the next group starts" height={1100}>
            <Course mine={groupDoneMine} bar={learnerBar(4)} />
          </Frame>
          <Frame
            title="5 · Every lesson learned: the rating, the review lit while lessons are due, where to go next"
            height={760}
          >
            <Course mine={doneMine} bar={learnerBar(5)} />
          </Frame>
          <Frame title="6 · Not started, for an experienced developer: the check takes the highlight" height={620}>
            <Course mine={freshMine} checkFirst />
          </Frame>
          <Frame title="7 · The check left in the middle: it takes the highlight" height={620}>
            <Course mine={checkUnfinishedMine} />
          </Frame>
          <Frame title="8 · The check saved: lessons marked as known in grey, counted apart" height={1100}>
            <Course mine={checkSavedMine} />
          </Frame>
          <Frame title="9 · Later: two lessons learned since the check" height={760}>
            <Course mine={knownLaterMine} />
          </Frame>
          <Frame title="10 · Finding a lesson: the groups found, the match marked, N of M shown" height={1180}>
            <Course mine={progressMine} bar={learnerBar(4)} drawn={{ query: 'search' }} />
          </Frame>
          <Frame title="11 · The Squares view, a square pointed at: its card lies over the page" height={1240}>
            <Course
              mine={progressMine}
              bar={learnerBar(4)}
              drawn={{ view: 'squares', openCard: lessonAt('3-4').slug }}
            />
          </Frame>
          <Frame title="12 · Finding a lesson in the Squares view: the other squares fade, nothing moves" height={1170}>
            <Course mine={progressMine} bar={learnerBar(4)} drawn={{ view: 'squares', query: 'search' }} />
          </Frame>
          <Frame title="13 · A paused lesson keeps its place, says so, and is not a link" height={1500}>
            <Course course={algorithmsCoursePaused} mine={progressMine} bar={learnerBar(4)} />
          </Frame>
          <Frame title="14 · A language course: one language, no picker" height={760}>
            <Course course={goCourse} bar={visitor} />
          </Frame>
          <Frame
            title="15 · Finished with a paused lesson never answered: the box counts what the line counts"
            height={760}
          >
            <Course course={algorithmsCoursePaused} mine={donePausedMine} bar={learnerBar(5)} />
          </Frame>
          <Frame
            title="16 · Every lesson left marked as known: the first of them, to learn it by answering"
            height={660}
          >
            <Course mine={allKnownMine} />
          </Frame>
          <Frame title="17 · The Squares view with nothing due: the same words and the way back" height={1210}>
            <Course mine={freshMine} drawn={{ view: 'squares', filter: 'due' }} />
          </Frame>
          <Frame
            title="18 · Signed in, no side came (a failed read, or Learn not open yet): no sign-in, the first lesson lit"
            height={760}
          >
            <Course person="session" />
          </Frame>
          <Frame title="19 · A paused course (503): the same for everyone, the way to all courses" height={400}>
            <Site bar={visitor}>
              <CourseGoneView text={courseGoneTextOf('PAUSED', { title: algorithmsCourse.name })} state="paused" />
            </Site>
          </Frame>
          <Frame title="20 · A removed course (410)" height={400}>
            <Site bar={visitor}>
              <CourseGoneView text={courseGoneTextOf('REMOVED', { title: algorithmsCourse.name })} state="removed" />
            </Site>
          </Frame>
          <Frame title="21 · A course that is not there, or a draft (404): naming nothing" height={400}>
            <Site bar={visitor}>
              <CourseGoneView text={LEARN_MISSING_TEXT} state="missing" />
            </Site>
          </Frame>
          <Frame
            title="22 · No learners and no real issues fixed yet: the row keeps the kind, the lessons and the language"
            height={760}
          >
            <Course
              course={{ ...algorithmsCourse, numbers: { learners: null, goodShare: null, issuesFixed: null } }}
              bar={visitor}
            />
          </Frame>
          <Frame title="23 · Real issues fixed with the course: the count links to them" height={760}>
            <Course
              course={{ ...algorithmsCourse, numbers: { ...algorithmsCourse.numbers, issuesFixed: 212 } }}
              bar={visitor}
            />
          </Frame>
          <Frame
            title="24 · A repository course: who wrote it under what it is about, then the row with the project's links"
            height={760}
          >
            <Course course={djangoCourse} others={[]} projectIssues={9} bar={visitor} />
          </Frame>
        </Board>
      ),
    },
  ],
};

/** All courses, every state of page 24's boards on one board; and both pages on a phone. */
export const LEARN_COURSES_SCREEN: Screen = {
  id: 'learn-courses',
  title: 'All courses',
  area: 'learn',
  route: '/learn/courses',
  sources: [...COURSES_SOURCES, ...MY_PROGRESS_SOURCES],
  states: [
    {
      id: 'states',
      title: 'Every state, one under the other',
      path: '/learn/courses',
      height: 6000,
      render: () => (
        <Board
          title="All courses, in every state"
          intro="A course keeps its three lines and its size in every state. What a learner did changes the third line in place and draws a bar on the bottom edge. The search filters as it is typed: courses by name or kind, then lessons by name."
        >
          <Frame title="1 · Not signed in: two kinds, every course a link to its page" height={1080}>
            <Courses bar={visitor} />
          </Frame>
          <Frame
            title="2 · A learner with two courses started: their figures in place, a bar on the edge"
            height={1080}
          >
            <Courses mine={coursesMine} />
          </Frame>
          <Frame title="3 · Every lesson learned, and a course after the check: known lessons apart" height={900}>
            <Courses mine={[coursesMineAllLearned, coursesMineChecked]} />
          </Frame>
          <Frame title="4 · “go” typed: the course by its name, then lessons by name" height={760}>
            <Courses mine={coursesMine} depths={lessonDepths} query="go" />
          </Frame>
          <Frame title="5 · “hash”, not signed in: no course matches, so only lessons show" height={480}>
            <Courses bar={visitor} query="hash" />
          </Frame>
          <Frame title="6 · “sort”, a learner: the first six lessons, then the rest in place" height={620}>
            <Courses mine={coursesMine} depths={lessonDepths} query="sort" />
          </Frame>
          <Frame title="7 · Nothing found: one button back to the full list" height={420}>
            <Courses mine={coursesMine} query="haskell" />
          </Frame>
        </Board>
      ),
    },
    {
      id: 'phone',
      title: 'All courses, a course, and My progress, on a phone',
      path: '/learn/courses',
      width: 390,
      height: 10790,
      render: () => (
        <div className="flex flex-col gap-8 px-2 pt-4 pb-10">
          <Frame title="All courses, a learner: one column" height={3000}>
            <Courses mine={coursesMine} hints={false} />
          </Frame>
          <Frame title="A course, in progress: the List view only, the boxes one above the other" height={3800}>
            <Course mine={progressMine} bar={learnerBar(4)} drawn={{ view: 'squares' }} hints={false} />
          </Frame>
          <MyProgressPhone />
        </div>
      ),
    },
  ],
};
