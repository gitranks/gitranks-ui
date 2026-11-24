import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { CourseView } from '@/components/learn/course/course-view';
import { LearnHomeView } from '@/components/learn/home/learn-home-view';
import { LearnLandingView } from '@/components/learn/landing/learn-landing-view';
import { LessonRealWorld } from '@/components/learn/lesson/lesson-real-world';
import { LessonView, type LessonViewProps } from '@/components/learn/lesson/lesson-view';
import { algorithmsCourse, courseCards, doneMine, otherCourses, progressMine } from '@/lib/learn/__fixtures__/course';
import { learnFixes } from '@/lib/learn/__fixtures__/issues';
import { HOME_NOW, homeDay, homeSetup, tryLessons } from '@/lib/learn/__fixtures__/learn-home-page';
import {
  LESSON_NOW,
  mineLearned,
  setAnswerRight,
  setDepths,
  setExampleCodes,
  setGroup,
  setLesson,
} from '@/lib/learn/__fixtures__/lesson-page';
import {
  homeFixMerged,
  homeFixOpen,
  homeFixWorking,
  homeRealFix,
  homeRealFixAt,
  homeRealIssues,
  homeRealMerged,
  homeRealNone,
  landingFixes,
  lessonRealIssues,
  lessonRealWithFix,
} from '@/lib/learn/__fixtures__/real-issues';
import { learnLessonMarkdownPath, lessonMistakeHref } from '@/lib/learn/paths';
import type { LessonRealMine } from '@/lib/learn/real-issues';

/**
 * Real issues where Learn's pages meet them (step 14): "In the real world" under a lesson with "Fix a real issue" after
 * a right answer, Learn home's third box and "Real issues" rows, a course's third box and its merged fixes' count, and
 * the landing's merged fixes. From fixtures. Held back from the export (`exported: false`): the export is at its file
 * limit.
 */

const SOURCES = [
  'components/learn/lesson/lesson-real-world.tsx',
  'components/learn/lesson/lesson-player.tsx',
  'components/learn/home/home-real-issues.tsx',
  'components/learn/home/learn-home-view.tsx',
  'components/learn/course/course-boxes.tsx',
  'components/learn/course/course-header.tsx',
  'components/learn/landing/learn-landing-view.tsx',
  'lib/learn/real-issues.ts',
];

const noop = () => {};
const saved = async () => true;

/** A lesson's page after a right answer, with what its real side adds. */
function Lesson({ mine, ...props }: Partial<LessonViewProps> & { mine: LessonRealMine | null }) {
  return (
    <LessonView
      lesson={setLesson}
      examples={[{ name: 'main', codes: setExampleCodes }]}
      group={setGroup}
      viewer={{ mine: mineLearned, depths: setDepths }}
      mainLanguage="python"
      links={{ markdown: learnLessonMarkdownPath(setLesson.slug), report: lessonMistakeHref(setLesson.title) }}
      calls={{ onNext: noop, onSignIn: noop, onRate: saved, onComment: saved }}
      drawn={{ answer: setAnswerRight }}
      hints
      now={LESSON_NOW}
      timeZone="UTC"
      real={mine?.real ?? null}
      realWorld={<LessonRealWorld slug={setLesson.slug} fixes={null} mine={mine} />}
      {...props}
    />
  );
}

/** A part of a page, alone: the section a state adds. */
const Part = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">{children}</div>
);

const courseWithFixes = { ...algorithmsCourse, numbers: { ...algorithmsCourse.numbers, issuesFixed: 212 } };

export const LEARN_REAL_ISSUES_SCREENS: Screen[] = [
  {
    id: 'learn-real-issues',
    title: 'Real issues on Learn pages',
    area: 'learn',
    route: '/learn/lessons/[slug]',
    exported: false,
    sources: SOURCES,
    states: [
      {
        id: 'lesson-fix-one',
        title: 'A lesson after a right answer: "Fix a real issue", fixes that used it, issues of your list',
        path: `/learn/lessons/${setLesson.slug}`,
        height: 3000,
        render: () => <Lesson mine={lessonRealIssues} />,
      },
      {
        id: 'lesson-your-fix',
        title: 'A lesson with your fix that uses it, its pull request open',
        path: `/learn/lessons/${setLesson.slug}`,
        height: 3000,
        render: () => <Lesson mine={lessonRealWithFix} />,
      },
      {
        id: 'lesson-visitor',
        title: 'A visitor: the merged fixes alone',
        path: `/learn/lessons/${setLesson.slug}`,
        signedOut: true,
        height: 600,
        render: () => (
          <Part>
            <LessonRealWorld slug={setLesson.slug} fixes={learnFixes} mine={null} />
          </Part>
        ),
      },
      {
        id: 'home-fix',
        title: 'Learn home: a fix that needs you is the third box, then the real issues',
        path: '/learn',
        height: 1600,
        render: () => (
          <LearnHomeView home={homeDay} setup={homeSetup} now={HOME_NOW} timeZone={null} hints real={homeRealFix} />
        ),
      },
      {
        id: 'home-issues',
        title: 'Learn home: the open issues that fit you',
        path: '/learn',
        height: 1600,
        render: () => (
          <LearnHomeView home={homeDay} setup={homeSetup} now={HOME_NOW} timeZone={null} hints real={homeRealIssues} />
        ),
      },
      {
        id: 'home-fix-states',
        title: "Learn home's third box following a fix: agent working, pull request open, merged",
        path: '/learn',
        height: 1200,
        render: () => (
          <>
            {(
              [
                [homeFixWorking, 'working'],
                [homeFixOpen, 'open'],
                [homeFixMerged, 'merged'],
              ] as const
            ).map(([row, state]) => (
              <LearnHomeView
                key={state}
                home={homeDay}
                setup={homeSetup}
                now={HOME_NOW}
                timeZone={null}
                hints
                skillsHref="/profile/octocat/skills"
                real={{ ...homeRealFixAt(row, state), issues: [] }}
              />
            ))}
          </>
        ),
      },
      {
        id: 'home-merged',
        title: "Learn home's third box: your fix merged in the last 7 days, its lesson now Mastered",
        path: '/learn',
        height: 1600,
        render: () => (
          <LearnHomeView
            home={homeDay}
            setup={homeSetup}
            now={HOME_NOW}
            timeZone={null}
            hints
            skillsHref="/profile/octocat/skills"
            real={homeRealMerged}
          />
        ),
      },
      {
        id: 'home-none',
        title: 'Learn home: no fix and no open issue, the quiet box with the email',
        path: '/learn',
        height: 900,
        render: () => (
          <LearnHomeView home={homeDay} setup={homeSetup} now={HOME_NOW} timeZone={null} hints real={homeRealNone} />
        ),
      },
      {
        id: 'course-finished',
        title: 'A finished course: where to go next names its open issues',
        path: '/learn/courses/algorithms',
        height: 900,
        render: () => (
          <CourseView
            course={courseWithFixes}
            mine={doneMine}
            person="session"
            others={otherCourses}
            calls={{ onSignIn: noop, onRate: saved }}
            openIssues={3}
            hints
          />
        ),
      },
      {
        id: 'course',
        title: 'A course: its open issues for you, and "212 real issues fixed"',
        path: '/learn/courses/algorithms',
        height: 900,
        render: () => (
          <CourseView
            course={courseWithFixes}
            mine={progressMine}
            person="session"
            others={otherCourses}
            calls={{ onSignIn: noop, onRate: saved }}
            openIssues={2}
            hints
          />
        ),
      },
      {
        id: 'landing',
        title: 'The landing: real issues fixed with Learn',
        path: '/learn',
        signedOut: true,
        height: 4200,
        render: () => (
          <LearnLandingView viewer="visitor" courses={courseCards} lessons={tryLessons} hints fixes={landingFixes} />
        ),
      },
    ],
  },
];
