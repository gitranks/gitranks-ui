import type { ReactElement, ReactNode } from 'react';

import type { Screen } from '../registry';
import { CourseShareCard, LearnShareCard } from '@/components/learn/share/course-cards';
import { FixShareCard } from '@/components/learn/share/fix-cards';
import { FactCard, LessonCard } from '@/components/learn/share/lesson-cards';
import { SkillsShareCard } from '@/components/skills/skills-share-card';
import { algorithmsCourse, courseCards } from '@/lib/learn/__fixtures__/course';
import { longFix, mergedFix, noLessonFix, openFix } from '@/lib/learn/__fixtures__/fix-share';
import { shareLessons } from '@/lib/learn/__fixtures__/lesson-share';
import { coursesCardFiguresOf } from '@/lib/learn/course-share-card';
import { fixPreviewOf } from '@/lib/learn/fix-share-card';
import type { LearnLesson } from '@/lib/learn/lesson-page';
import { learnCourseMetadata, learnCoursesMetadata } from '@/lib/learn/seo/course';
import { learnLessonMetadata } from '@/lib/learn/seo/lesson';
import {
  bothPage,
  contributorPage,
  firstFixPage,
  firstLessonPage,
  learnerPage,
} from '@/lib/skills/__fixtures__/skills';
import { skillsMetadataOf } from '@/lib/skills/seo';
import type { SkillsPage } from '@/lib/skills/skills.types';
import { skillsCardOf } from '@/lib/skills/skills-share-card';

/** A picture at half its size, as a post shows it: 1,200 by 630 drawn at 600 by 315. */
function Half({ children, framed = false }: { children: ReactElement; framed?: boolean }) {
  return (
    <div
      className={framed ? 'overflow-hidden rounded-xl border' : 'overflow-hidden'}
      style={{ width: 600, height: 315 }}
    >
      <div style={{ width: 1200, height: 630, transform: 'scale(.5)', transformOrigin: 'top left' }}>{children}</div>
    </div>
  );
}

/** One case: its name and what it shows above, then the picture. */
function Case({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2" style={{ width: 602 }}>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-sm text-muted-foreground">{caption}</span>
      {children}
    </div>
  );
}

/** A posted link as most sites show one: the picture, then the page's title and description from its metadata. */
function PostOf({ picture, preview }: { picture: ReactElement; preview: { title?: unknown; description?: string } }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card" style={{ width: 602 }}>
      <Half>{picture}</Half>
      <div className="flex flex-col gap-0.5 border-t px-4 py-3">
        <span className="text-xs text-muted-foreground">gitranks.com</span>
        <span className="text-sm font-semibold text-foreground">{String(preview.title ?? '')}</span>
        <span className="text-sm text-muted-foreground">{preview.description}</span>
      </div>
    </div>
  );
}

/** A lesson, or its fact, posted. */
function Post({ lesson, fact = false }: { lesson: LearnLesson; fact?: boolean }) {
  return (
    <PostOf
      picture={fact && lesson.fact ? <FactCard lesson={lesson} fact={lesson.fact} /> : <LessonCard lesson={lesson} />}
      preview={learnLessonMetadata(lesson, { fact }).openGraph ?? {}}
    />
  );
}

/** A course few have learned: its learners are not drawn. */
const newCourse = { ...algorithmsCourse, numbers: { learners: 9, goodShare: null } };

/** A course whose lessons real fixes used: the third number is drawn from 5. */
const fixedCourse = { ...algorithmsCourse, numbers: { ...algorithmsCourse.numbers, issuesFixed: 37 } };

const { lesson: newLesson, longTitle, longFact } = shareLessons;

/** A lesson 14 merged fixes used: the number is drawn from 3. */
const lesson: LearnLesson = { ...newLesson, fixesMerged: 14 };

/** A Skills page's picture, as a reader Learn is open to sees it; nothing when it has nothing to draw. */
function Skills({ page }: { page: Pick<SkillsPage, 'login' | 'numbers'> }) {
  const card = skillsCardOf(page, true);
  return card ? <SkillsShareCard card={card} /> : <div />;
}

/** A long login: the sentence and the address get smaller. */
const longLogin = { ...firstLessonPage, login: 'a-very-long-github-login-of-39-chars-xy' };

/** The pictures a posted link to a lesson, a course or all courses shows, page 21's cases. */
export const LEARN_SHARE_SCREEN: Screen = {
  id: 'learn-share',
  title: 'Learn’s share pictures',
  area: 'learn',
  route: '/learn/lessons/[slug]',
  sources: [
    'components/learn/share/lesson-cards.tsx',
    'components/learn/share/course-cards.tsx',
    'lib/social-card/card-parts.tsx',
    'lib/learn/lesson-share-card.ts',
    'components/learn/share/lesson-card-response.tsx',
    'lib/learn/course-share-card.ts',
    'components/learn/share/course-card-response.tsx',
    'components/learn/share/fix-cards.tsx',
    'lib/learn/fix-share-card.ts',
    'components/learn/share/fix-card-response.tsx',
    'components/skills/skills-share-card.tsx',
    'lib/skills/skills-share-card.ts',
    'components/skills/skills-card-response.tsx',
    'lib/learn/seo/lesson.ts',
    'lib/learn/seo/course.ts',
    'lib/skills/seo.ts',
  ],
  states: [
    {
      id: 'cards',
      title: 'A lesson and its fact, a course and all courses, a fix and a Skills page, each in a post, and long words',
      path: `/learn/lessons/${lesson.slug}`,
      signedOut: true,
      height: 4250,
      render: () => (
        <main className="mx-auto flex w-full flex-col gap-10 px-4 pt-8 pb-16" style={{ maxWidth: 1340 }}>
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight" style={{ margin: 0 }}>
              Learn’s share pictures
            </h1>
            <p className="text-sm text-muted-foreground" style={{ margin: 0, maxWidth: '95ch' }}>
              The picture a link shows when someone posts it, drawn at half size. The real picture is 1,200 by 630, in
              light colours only.
            </p>
          </header>
          <section className="flex flex-wrap items-start" style={{ gap: '44px 32px' }}>
            <Case
              title="A lesson"
              caption="The lesson’s title, then its course and group, and the merged fixes that used it, from 3."
            >
              <Post lesson={lesson} />
            </Case>
            <Case
              title="A fun fact, the lesson’s address with ?fact"
              caption="What Share under “Did you know?” gives: the fact’s title, its first sentences, its lesson."
            >
              <Post lesson={lesson} fact />
            </Case>
          </section>
          <section className="flex flex-col gap-5 border-t pt-6">
            <h2 className="text-lg font-semibold" style={{ margin: 0 }}>
              A course, and all courses
            </h2>
            <div className="flex flex-wrap items-start" style={{ gap: '44px 32px' }}>
              <Case
                title="A course"
                caption="Its name, its kind and languages, its lessons, its learners from 10, the issues fixed from 5."
              >
                <PostOf
                  picture={<CourseShareCard course={fixedCourse} />}
                  preview={learnCourseMetadata(fixedCourse).openGraph ?? {}}
                />
              </Case>
              <Case
                title="All courses, and every other Learn page"
                caption="The headline, then the courses and their lessons."
              >
                <PostOf
                  picture={<LearnShareCard figures={coursesCardFiguresOf(courseCards)} />}
                  preview={learnCoursesMetadata(courseCards, { searched: false }).openGraph ?? {}}
                />
              </Case>
              <Case title="A course under 10 learners" caption="The learners are not drawn until there are 10.">
                <Half framed>
                  <CourseShareCard course={newCourse} />
                </Half>
              </Case>
            </div>
          </section>
          <section className="flex flex-col gap-5 border-t pt-6">
            <h2 className="text-lg font-semibold" style={{ margin: 0 }}>
              A fix, and a Skills page
            </h2>
            <div className="flex flex-wrap items-start" style={{ gap: '44px 32px' }}>
              <Case
                title="A fix, beside How it was made"
                caption="The project and the issue, who fixed it with which agent, its state; its lesson when it has one."
              >
                <PostOf
                  picture={<FixShareCard fix={mergedFix} learnOpen />}
                  preview={fixPreviewOf({ fix: mergedFix, learnOpen: true }) ?? {}}
                />
              </Case>
              <Case
                title="A Skills page"
                caption="One sentence about the person, and the block’s numbers, three at most."
              >
                <PostOf
                  picture={<Skills page={contributorPage} />}
                  preview={skillsMetadataOf(contributorPage, { learnOpen: true }).openGraph ?? {}}
                />
              </Case>
              <Case title="The pull request is still open" caption="Waiting for the project’s review.">
                <Half framed>
                  <FixShareCard fix={openFix} learnOpen />
                </Half>
              </Case>
              <Case title="A fix with no lesson, as most are" caption="The line simply ends after the date.">
                <Half framed>
                  <FixShareCard fix={noLessonFix} learnOpen />
                </Half>
              </Case>
              <Case title="A learner" caption="Lessons learned, mastered, days active.">
                <Half framed>
                  <Skills page={learnerPage} />
                </Half>
              </Case>
              <Case title="Someone who uses both" caption="Fixes merged, lessons learned, days active.">
                <Half framed>
                  <Skills page={bothPage} />
                </Half>
              </Case>
              <Case
                title="After the first merged fix"
                caption="Nobody said it helped yet: the third place names the agent."
              >
                <Half framed>
                  <Skills page={firstFixPage} />
                </Half>
              </Case>
            </div>
          </section>
          <section className="flex flex-col gap-5 border-t pt-6">
            <h2 className="text-lg font-semibold" style={{ margin: 0 }}>
              Long words
            </h2>
            <div className="flex flex-wrap items-start" style={{ gap: '44px 32px' }}>
              <Case
                title="A long lesson title"
                caption="The type gets smaller in two steps, so the title keeps to three lines."
              >
                <Half framed>
                  <LessonCard lesson={longTitle} />
                </Half>
              </Case>
              <Case title="A long fact" caption="Cut at the end of a sentence, at 220 characters at most.">
                {longFact.fact && (
                  <Half framed>
                    <FactCard lesson={longFact} fact={longFact.fact} />
                  </Half>
                )}
              </Case>
              <Case title="A long login" caption="The sentence and the address get smaller, so nothing is cut.">
                <Half framed>
                  <Skills page={longLogin} />
                </Half>
              </Case>
              <Case title="A long fix title" caption="The type gets smaller in two steps; three lines at most.">
                <Half framed>
                  <FixShareCard fix={longFix} learnOpen />
                </Half>
              </Case>
            </div>
          </section>
        </main>
      ),
    },
  ],
};
