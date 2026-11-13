import { notFound } from 'next/navigation';

import { LearnViewReport } from './learn-view-report';
import type { LessonFlowStart } from './lesson-flow';
import { LessonEyebrow, LessonMeta } from './lesson-header';
import { LessonIntro, ReadLesson, SignInToTake } from './lesson-read';
import { LessonStubScreen } from './lesson-stub';
import { SharedLesson } from './shared-lesson';
import { HEADING } from '@/app/contribute/components/primitives';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import { loadLearnOpen } from '@/lib/learn/learn.data';
import type { LessonPage, LessonRun } from '@/lib/learn/learn.types';
import { lessonPath } from '@/lib/learn/learn-path';
import { passesShown } from '@/lib/learn/lesson-public';
import { loadLessonPage, loadMyLessonRun } from '@/lib/learn/lesson-public.data';

/** A page's own container, as the lesson pages draw it. */
export const LESSON_MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

/**
 * Who looks at a shared lesson: a visitor (reads it, signs in to answer), a signed-in reader Learn is not open to yet
 * (reads it), or a taker (answers it, in their own run).
 */
export type LessonViewer =
  | { kind: 'visitor' }
  | { kind: 'reader'; login: string }
  | { kind: 'taker'; login: string; run: LessonRun | null };

/**
 * A shared lesson (`/learn/lessons/<slug>`): its title, who created it with which agent, the issue and the pull
 * request, the language and how many passed it (from 2), then the lesson. Anyone reads every step; answering needs the
 * GitHub sign-in, and Learn open to the viewer.
 */
export function LessonPageScreen({
  page,
  viewer,
  start,
}: {
  page: LessonPage;
  viewer: LessonViewer;
  start?: LessonFlowStart;
}) {
  const { head, steps } = page;
  const path = lessonPath(head.slug);
  return (
    <main className={LESSON_MAIN} data-lesson-page={head.slug} data-viewer={viewer.kind}>
      <LearnViewReport source="lesson_opened" lesson={head.slug} />
      <header className="flex flex-col gap-3">
        <LessonEyebrow tag="Lesson" text="GitRanks Learn" />
        <h1 className={HEADING.page}>{head.title}</h1>
        <LessonMeta head={head}>
          {passesShown(head.passes) ? (
            <span>
              <span className="font-mono font-semibold text-foreground tabular-nums">{head.passes}</span> people passed
              it
            </span>
          ) : null}
        </LessonMeta>
      </header>
      {viewer.kind === 'taker' ? (
        <SharedLesson head={head} steps={steps} run={viewer.run} login={viewer.login} start={start} />
      ) : (
        <>
          <LessonIntro
            steps={steps.length}
            text={
              viewer.kind === 'visitor'
                ? 'Reading is free. Answering needs a GitHub account, so a pass counts a real person.'
                : 'Reading is open to everyone. Answering is not open to your account yet.'
            }
            action={viewer.kind === 'visitor' ? <SignInToTake returnTo={path} /> : undefined}
          />
          <ReadLesson head={head} steps={steps} signInTo={viewer.kind === 'visitor' ? path : undefined} />
        </>
      )}
    </main>
  );
}

/**
 * The page's reads: the lesson, the same for everyone; signed in, whether Learn is open to the viewer and their run.
 * An unknown lesson is a 404; a removed, hidden or held one its stub.
 */
export async function LessonPageView({ slug }: { slug: string }) {
  const answer = await loadLessonPage(slug);
  if (!answer) notFound();
  if (answer.kind === 'stub') return <LessonStubScreen visibility={answer.visibility} />;

  const login = await viewerLogin();
  if (!login) return <LessonPageScreen page={answer.value} viewer={{ kind: 'visitor' }} />;
  if (!(await loadLearnOpen())) return <LessonPageScreen page={answer.value} viewer={{ kind: 'reader', login }} />;
  const run = await loadMyLessonRun(answer.value.head.slug);
  return <LessonPageScreen page={answer.value} viewer={{ kind: 'taker', login, run }} />;
}
