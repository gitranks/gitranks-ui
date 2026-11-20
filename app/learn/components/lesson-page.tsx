import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LessonEyebrow, LessonMeta } from './lesson-header';
import { LessonStubScreen } from './lesson-stub';
import { PracticeContext } from './practice-context';
import { SharedLesson } from './shared-lesson';
import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnViewReport } from '@/components/learn/learn-view-report';
import type { LessonFlowStart } from '@/components/learn/lesson-flow';
import { LessonIntro, ReadLesson, SignInToTake } from '@/components/learn/lesson-read';
import { HEADING } from '@/components/workspace/primitives';
import { LearnSetupRefresh } from '@/components/workspace/setup-refresh';
import { loadLearnOpen, loadLearnProfile, loadLearnSetup } from '@/lib/learn/learn.data';
import type { LearnGoalView, LessonPage, LessonRun, PracticeNext } from '@/lib/learn/learn.types';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { goalViewOf } from '@/lib/learn/learn-home';
import { LEARN_PATH, lessonPath } from '@/lib/learn/learn-path';
import { LEARN_SETTING_UP_TEXT } from '@/lib/learn/lesson-format';
import { isAuthorOf, passesShown } from '@/lib/learn/lesson-public';
import { loadLessonPage, loadMyLessonRun } from '@/lib/learn/lesson-public.data';
import { lessonJsonLd } from '@/lib/learn/lesson-seo';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/** A page's own container, as the lesson pages draw it. */
export const LESSON_MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

/**
 * Who looks at a shared lesson: a visitor once Learn is open to everyone (reads it, signs in to answer), a guest (a
 * visitor before then: reads it, asked nothing), a signed-in reader Learn is not open to (reads it), a taker whose new
 * GitRanks account is still being set up (reads it, refreshes), or a taker (answers it, in their own run).
 */
export type LessonViewer =
  | { kind: 'visitor' }
  /** A visitor while Learn is not open to everyone: reads it, and is asked nothing. */
  | { kind: 'guest' }
  | { kind: 'reader'; login: string }
  | { kind: 'setup'; login: string }
  | {
      kind: 'taker';
      login: string;
      run: LessonRun | null;
      /** The taker's own Learn goal, for "who also wanted to learn"; null without one, or unread. */
      goal?: LearnGoalView | null;
      /** What the passed card offers next, when already read (the catalogue). */
      next?: PracticeNext | null;
    };

const INTRO_TEXT: Record<Exclude<LessonViewer['kind'], 'taker'>, string> = {
  visitor: 'Reading is free. Answering needs a GitHub account, so a pass counts a real person.',
  guest: 'Reading is open to everyone.',
  // An account Learn is not open to (only while it is not open to everyone): told nothing of Learn's list.
  reader: 'Reading is open to everyone.',
  setup: LEARN_SETTING_UP_TEXT,
};

/**
 * A shared lesson (`/learn/lessons/<slug>`): its title, who created it with which agent, the issue and the pull
 * request, the language and how many passed it (from 2), then the lesson. Anyone reads every step; answering needs the
 * GitHub sign-in, and Learn open to the viewer, and a visitor is offered the sign-in only once Learn is open to
 * everyone. To a learner who did not write it, it is a practice lesson: the way back
 * to Learn home, its context (the issue, who it was made for, when, what it teaches), an intro that leads past it to
 * their own issue, and, once passed, their own lesson next.
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
  const practice = viewer.kind === 'taker' && !isAuthorOf(head, viewer.login);
  return (
    <main
      className={LESSON_MAIN}
      data-lesson-page={head.slug}
      data-viewer={viewer.kind}
      data-practice={practice || undefined}
    >
      <LearnViewReport source="lesson_opened" lesson={head.slug} />
      {practice ? (
        <Link
          href={LEARN_PATH}
          prefetch={false}
          className="self-start text-sm font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
        >
          ← Learn home
        </Link>
      ) : null}
      <header className="flex flex-col gap-3">
        <LessonEyebrow tag={practice ? 'Practice lesson · optional' : 'Lesson'} text="GitRanks Learn" />
        <h1 className={HEADING.page}>{head.title}</h1>
        <LessonMeta head={head}>
          {passesShown(head.passes) ? (
            <span>
              <span className="font-mono font-semibold text-foreground tabular-nums">{head.passes}</span> people passed
              it
            </span>
          ) : null}
        </LessonMeta>
        {practice ? (
          <PracticeContext head={head} goal={viewer.kind === 'taker' ? (viewer.goal ?? null) : null} />
        ) : null}
      </header>
      {viewer.kind === 'taker' ? (
        <SharedLesson
          head={head}
          steps={steps}
          run={viewer.run}
          login={viewer.login}
          start={start}
          practice={practice}
          next={viewer.next}
        />
      ) : (
        <>
          <LessonIntro
            steps={steps.length}
            text={INTRO_TEXT[viewer.kind]}
            action={
              viewer.kind === 'visitor' ? (
                <SignInToTake returnTo={path} />
              ) : viewer.kind === 'setup' ? (
                <LearnSetupRefresh className="shrink-0 max-sm:w-full" />
              ) : undefined
            }
          />
          <ReadLesson head={head} steps={steps} signInTo={viewer.kind === 'visitor' ? path : undefined} />
        </>
      )}
    </main>
  );
}

/**
 * The page's reads: the lesson, the same for everyone; signed in, whether Learn is open to the viewer and their run.
 * An unknown or hidden lesson is a 404 (`not-found.tsx`); a removed or held one its stub.
 */
export async function LessonPageView({ slug }: { slug: string }) {
  const answer = await loadLessonPage(slug);
  if (!answer || (answer.kind === 'stub' && answer.visibility === 'HIDDEN')) notFound();
  if (answer.kind === 'stub') return <LessonStubScreen visibility={answer.visibility} />;
  const frontDoorOpen = await learnOpenToEveryone();
  const viewer = await lessonViewerOf(answer.value, frontDoorOpen);
  return (
    <>
      <JsonLd payloads={lessonJsonLd(answer.value, { frontDoorOpen })} />
      <LessonPageScreen page={answer.value} viewer={viewer} />
    </>
  );
}

/**
 * Who looks at the lesson: signed out (asked to sign in to answer only once Learn is open to everyone), Learn not open
 * to them, their account being set up, or a taker and their run.
 */
async function lessonViewerOf(page: LessonPage, openToEveryone: boolean): Promise<LessonViewer> {
  const login = await viewerLogin();
  if (!login) return openToEveryone ? { kind: 'visitor' } : { kind: 'guest' };
  if (!(await loadLearnOpen())) return { kind: 'reader', login };
  // The taker's goal says whether the lesson's was the same ("also"); the author's own page needs none.
  const [settingUp, run, profile] = await Promise.all([
    loadLearnSetup(),
    loadMyLessonRun(page.head.slug),
    isAuthorOf(page.head, login) ? null : loadLearnProfile().catch(() => null),
  ]);
  if (settingUp) return { kind: 'setup', login };
  return { kind: 'taker', login, run, goal: goalViewOf(profile) };
}
