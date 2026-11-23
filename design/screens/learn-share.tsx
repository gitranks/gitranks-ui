import type { ReactElement, ReactNode } from 'react';

import type { Screen } from '../registry';
import { CourseShareCard, LearnShareCard } from '@/components/learn/share/course-cards';
import { FactCard, LessonCard } from '@/components/learn/share/lesson-cards';
import { algorithmsCourse, courseCards } from '@/lib/learn/__fixtures__/course';
import { shareLessons } from '@/lib/learn/__fixtures__/lesson-share';
import { coursesCardFiguresOf } from '@/lib/learn/course-share-card';
import type { LearnLesson } from '@/lib/learn/lesson-page';
import { learnCourseMetadata, learnCoursesMetadata } from '@/lib/learn/seo/course';
import { learnLessonMetadata } from '@/lib/learn/seo/lesson';

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

const { lesson, longTitle, longFact } = shareLessons;

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
    'lib/learn/lesson-card.tsx',
    'lib/learn/course-share-card.ts',
    'lib/learn/course-card.tsx',
    'lib/learn/seo/lesson.ts',
    'lib/learn/seo/course.ts',
  ],
  states: [
    {
      id: 'cards',
      title: 'A lesson and its fact, a course and all courses, each inside a post, and long words',
      path: `/learn/lessons/${lesson.slug}`,
      signedOut: true,
      height: 1990,
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
            <Case title="A lesson" caption="The lesson’s title, then its course and group.">
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
              <Case title="A course" caption="Its name, its kind and languages, its lessons and its learners.">
                <PostOf
                  picture={<CourseShareCard course={algorithmsCourse} />}
                  preview={learnCourseMetadata(algorithmsCourse).openGraph ?? {}}
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
            </div>
          </section>
        </main>
      ),
    },
  ],
};
