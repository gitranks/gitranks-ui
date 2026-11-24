'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { type LessonCalls, LessonPlayer, type LessonViewer, lessonPlayerKeyOf } from './lesson-player';
import { LessonRealWorldStreamed, type SharedFixes } from './lesson-real-world';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { HighlightedCode } from '@/lib/learn/code-tokens';
import {
  isLastOfGroup,
  type LearnDepth,
  type LearnGroupLesson,
  type LearnLesson,
  type LearnLessonMine,
  lessonPlaceOf,
} from '@/lib/learn/lesson-page';
import { answerLearnLessonAction, sendLearnFeedbackAction } from '@/lib/learn/lesson-page.actions';
import type { LearnCourseLessonMine } from '@/lib/learn/lesson-page.documents';
import {
  coursePath,
  learnCourseMinePath,
  learnLessonMinePath,
  learnLessonPath,
  learnLessonRealMinePath,
} from '@/lib/learn/paths';
import { fixesOf, type LessonRealMine, lessonRealOf, realRowsOf } from '@/lib/learn/real-issues';
import { MainLanguageContext } from '@/lib/learn/use-example-language';
import { useLearnSetupGuess } from '@/lib/learn/use-setup-guess';
import { hasSessionHint } from '@/lib/session-hint';

/** A JSON answer of one of the person's routes; null on any failure. */
async function readJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in person's side of a lesson and the depth of each lesson of its course; null when there is none. With
 * it, their setup's main language, which comes with the lesson's side (null when it has none, or it was not read).
 */
export async function readLessonViewer(lesson: {
  slug: string;
  course: { slug: string };
}): Promise<{ viewer: LessonViewer | null; mainLanguage: string | null }> {
  const [lessonAnswer, courseAnswer] = await Promise.all([
    readJson<{ mine?: LearnLessonMine | null; mainLanguage?: unknown }>(learnLessonMinePath(lesson.slug)),
    readJson<{ course?: { lessons?: LearnCourseLessonMine[] } | null }>(learnCourseMinePath(lesson.course.slug)),
  ]);
  const main = lessonAnswer?.mainLanguage;
  const mainLanguage = typeof main === 'string' && main ? main : null;
  const mine = lessonAnswer?.mine;
  if (!mine) return { viewer: null, mainLanguage };
  const depths: Record<string, LearnDepth> = {};
  for (const row of courseAnswer?.course?.lessons ?? []) depths[row.slug] = row.depth;
  return { viewer: { mine: { ...mine, language: mine.language ?? null }, depths }, mainLanguage };
}

/**
 * What "In the real world" adds for the signed-in person, from their route; null when none of it is answered (signed
 * out, Learn not open to them, an API that does not know it yet, a failure).
 */
export async function readLessonRealMine(slug: string): Promise<LessonRealMine | null> {
  const answer = await readJson<Record<string, unknown>>(learnLessonRealMinePath(slug));
  if (!answer) return null;
  const real = lessonRealOf(answer.real);
  const rows = realRowsOf({ rows: answer.rows });
  if (!real && !rows) return null;
  const reads = answer.reads && typeof answer.reads === 'object' ? (answer.reads as LessonRealMine['reads']) : null;
  return { real, rows, reads, fixes: fixesOf(answer.fixes) };
}

/**
 * Where the person stands: not known yet (the first render, and a session's read under way), a visitor (no session),
 * a person with a session whose side did not come (a failed read, or Learn not open to them), or a member with
 * their side.
 */
type Personal =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'session' }
  | { kind: 'member'; viewer: LessonViewer };

/** Said under the card when the API saves no answer for the person. */
export const ANSWER_NOT_SAVED_NOTE = 'Your answer was not saved. Try again in a minute.';

/**
 * A lesson's page as it lives in the browser. The page is the same for everyone and comes drawn (`article`, `more`);
 * once it is up, a person with a session reads their side of the lesson and of its course, and a visitor asks for
 * nothing. Only a visitor is asked to sign in: a person with a session goes on as a member does, and their right
 * answer is saved, whether their side has come or not. When their side first arrives, the player is drawn again so
 * a lesson learned before opens as answered, but only while the person has not touched it: an answer started is
 * never drawn over, and the focus stays where it is.
 */
export function LessonLive({
  lesson,
  group,
  questionCodes,
  mainLanguage,
  article,
  more,
  openFact = false,
  fixes = null,
}: {
  lesson: LearnLesson;
  group: readonly LearnGroupLesson[];
  questionCodes?: readonly HighlightedCode[];
  mainLanguage?: string | null;
  article: ReactNode;
  more: ReactNode;
  openFact?: boolean;
  /** The lesson's merged fixes as everyone reads them, or on their way; null when they cannot be read. */
  fixes?: SharedFixes;
}) {
  useLearnSetupGuess();
  const router = useRouter();
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  // The person's side as their last saved answer left it: fresher than any read.
  const [saved, setSaved] = useState<LearnLessonMine | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Whether the person has clicked, typed or moved the focus in the player; a ref, read when their side arrives.
  const touched = useRef(false);
  const [redrawn, setRedrawn] = useState(false);
  // What "In the real world" adds for a person with a session; it fills its places when it comes.
  const [realMine, setRealMine] = useState<LessonRealMine | null>(null);
  // The main language of the person's setup, once their side brings it: the examples and the question switch to it.
  const [mainOfSide, setMainOfSide] = useState<string | null>(null);
  const main = mainLanguage || mainOfSide;
  const { slug } = lesson;
  const course = lesson.course.slug;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    setRealMine(null);
    readLessonViewer({ slug, course: { slug: course } }).then(({ viewer, mainLanguage: read }) => {
      if (!live) return;
      setMainOfSide(read);
      setPersonal(viewer ? { kind: 'member', viewer } : { kind: 'session' });
      if (viewer && !touched.current) setRedrawn(true);
    });
    // Apart from the person's side: it fails alone, and the lesson is then as it was.
    readLessonRealMine(slug).then((read) => {
      if (live) setRealMine(read);
    });
    return () => {
      live = false;
    };
  }, [slug, course]);

  // A member's side, with their last saved answer over it; before their side comes, the saved answer alone.
  const viewer: LessonViewer | null =
    personal.kind === 'member'
      ? saved
        ? { ...personal.viewer, mine: saved }
        : personal.viewer
      : saved
        ? { mine: saved, depths: {} }
        : null;
  const touch = () => {
    touched.current = true;
  };

  const last = isLastOfGroup(lessonPlaceOf(group, lesson.slug, null));
  const calls: LessonCalls = {
    onGraded: ({ picked, right, tries, language }) => {
      // A visitor's answer is not saved; anyone with a session is saved as the session's user, side or not.
      if (!right || personal.kind === 'visitor') return;
      answerLearnLessonAction({ slug: lesson.slug, question: lesson.question.id, picked, tries, language }).then(
        (result) => {
          if (!result.ok) return;
          if (result.data) setSaved({ ...result.data.mine, language: result.data.mine.language ?? language });
          else setNote(ANSWER_NOT_SAVED_NOTE);
        },
        () => {},
      );
    },
    onNext: () => {
      router.push(last || !lesson.next ? coursePath(lesson.course.slug) : learnLessonPath(lesson.next.slug));
    },
    onSignIn: () => {
      signIn(IDENTITY_PROVIDER, { redirectTo: learnLessonPath(lesson.slug) }).catch(() => {});
    },
    onRate: async (good) => {
      const result = await sendLearnFeedbackAction({ lesson: lesson.slug, good });
      return result.ok && result.data;
    },
    onComment: async (comment, good) => {
      const result = await sendLearnFeedbackAction({ lesson: lesson.slug, good, comment });
      return result.ok && result.data;
    },
  };

  return (
    <MainLanguageContext value={main}>
      <div className="contents" onPointerDownCapture={touch} onKeyDownCapture={touch} onFocusCapture={touch}>
        <LessonPlayer
          // Drawn again once, when the person's side first arrives before they touched it.
          key={`${lessonPlayerKeyOf(lesson)}:${redrawn ? 'mine' : 'public'}`}
          lesson={lesson}
          group={group}
          viewer={viewer}
          questionCodes={questionCodes}
          mainLanguage={main}
          article={article}
          more={more}
          calls={calls}
          openFact={openFact}
          signedIn={personal.kind !== 'visitor'}
          note={viewer ? null : note}
          real={realMine?.real ?? null}
          realWorld={<LessonRealWorldStreamed slug={lesson.slug} fixes={fixes} mine={realMine} />}
        />
      </div>
    </MainLanguageContext>
  );
}
