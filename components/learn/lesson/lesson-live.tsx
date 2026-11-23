'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type ReactNode, useEffect, useState } from 'react';

import { type LessonCalls, LessonPlayer, type LessonViewer, lessonPlayerKeyOf } from './lesson-player';
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
import { coursePath, learnCourseMinePath, learnLessonMinePath, learnLessonPath } from '@/lib/learn/paths';
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

/** The signed-in person's side of a lesson and the depth of each lesson of its course; null when there is none. */
export async function readLessonViewer(lesson: {
  slug: string;
  course: { slug: string };
}): Promise<LessonViewer | null> {
  const [lessonAnswer, courseAnswer] = await Promise.all([
    readJson<{ mine?: LearnLessonMine | null }>(learnLessonMinePath(lesson.slug)),
    readJson<{ course?: { lessons?: LearnCourseLessonMine[] } | null }>(learnCourseMinePath(lesson.course.slug)),
  ]);
  const mine = lessonAnswer?.mine;
  if (!mine) return null;
  const depths: Record<string, LearnDepth> = {};
  for (const row of courseAnswer?.course?.lessons ?? []) depths[row.slug] = row.depth;
  return { mine: { ...mine, language: mine.language ?? null }, depths };
}

/** Where the person stands: not known yet, a visitor (or a person Learn is not open to), or a member with their side. */
type Personal = { kind: 'pending' } | { kind: 'visitor' } | { kind: 'member'; viewer: LessonViewer };

/**
 * A lesson's page as it lives in the browser. The page is the same for everyone and comes drawn (`article`, `more`);
 * once it is up, a person with a session reads their side of the lesson and of its course, and a visitor asks for
 * nothing. The player is drawn again once, when the person's side first arrives, so a lesson learned before opens as
 * answered. A right answer is saved for a member; the rating and its comment too.
 */
export function LessonLive({
  lesson,
  group,
  questionCodes,
  mainLanguage,
  article,
  more,
  openFact = false,
}: {
  lesson: LearnLesson;
  group: readonly LearnGroupLesson[];
  questionCodes?: readonly HighlightedCode[];
  mainLanguage?: string | null;
  article: ReactNode;
  more: ReactNode;
  openFact?: boolean;
}) {
  const router = useRouter();
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  const { slug } = lesson;
  const course = lesson.course.slug;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    readLessonViewer({ slug, course: { slug: course } }).then((viewer) => {
      if (live) setPersonal(viewer ? { kind: 'member', viewer } : { kind: 'visitor' });
    });
    return () => {
      live = false;
    };
  }, [slug, course]);

  const viewer = personal.kind === 'member' ? personal.viewer : null;
  const setMine = (mine: LearnLessonMine) =>
    setPersonal((now) => (now.kind === 'member' ? { kind: 'member', viewer: { ...now.viewer, mine } } : now));

  const last = isLastOfGroup(lessonPlaceOf(group, lesson.slug, null));
  const calls: LessonCalls = {
    onGraded: ({ picked, right, tries, language }) => {
      if (!right || !viewer) return;
      answerLearnLessonAction({ slug: lesson.slug, question: lesson.question.id, picked, tries, language }).then(
        (result) => {
          if (result.ok && result.data) setMine({ ...result.data.mine, language });
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
    <LessonPlayer
      // Drawn again once, when the person's side first arrives: an answer given before starts the answer.
      key={`${lessonPlayerKeyOf(lesson)}:${personal.kind === 'member' ? 'mine' : 'public'}`}
      lesson={lesson}
      group={group}
      viewer={viewer}
      questionCodes={questionCodes}
      mainLanguage={mainLanguage}
      article={article}
      more={more}
      calls={calls}
      openFact={openFact}
      pending={personal.kind === 'pending'}
    />
  );
}
