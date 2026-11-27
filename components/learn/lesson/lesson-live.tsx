'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { type LessonCalls, LessonPlayer, type LessonViewer, lessonPlayerKeyOf } from './lesson-player';
import { LessonRealWorldStreamed, type SharedFixes } from './lesson-real-world';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import {
  ANSWER_KEPT_NOTE,
  dropKeptAnswer,
  keptAnswerStepOf,
  readKeptAnswer,
  writeKeptAnswer,
} from '@/lib/learn/kept-answer';
import { learnSignFrom } from '@/lib/learn/learn-sign';
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
  courseHrefOf,
  learnCourseMinePath,
  learnLessonPath,
  learnLessonRealMinePath,
  learnLessonSidePath,
} from '@/lib/learn/paths';
import { fixesOf, type LessonRealMine, lessonRealOf, realRowsOf } from '@/lib/learn/real-issues';
import { MainLanguageContext } from '@/lib/learn/use-example-language';
import { useLearnSetupGuess } from '@/lib/learn/use-setup-guess';
import { hasSessionHint } from '@/lib/session-hint';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import { learnSetupHrefOf } from '@/lib/workspace/paths';

/** A JSON answer of one of the person's routes; null on any failure. */
async function readJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** What a lesson's page reads of the signed-in person. */
export type LessonViewerRead = {
  viewer: LessonViewer | null;
  mainLanguage: string | null;
  /** The Learn sign: true or false; null when it was not read. */
  onboarded: boolean | null;
};

/**
 * The signed-in person's side of a lesson and the depth of each lesson of its course; null when there is none. With
 * it, their setup's main language and the Learn sign, which come with the lesson's side (null when it has none, or
 * they were not read).
 */
export async function readLessonViewer(lesson: { slug: string; course: { slug: string } }): Promise<LessonViewerRead> {
  const [lessonAnswer, courseAnswer] = await Promise.all([
    readJson<{ mine?: LearnLessonMine | null; mainLanguage?: unknown; learnOnboarded?: unknown }>(
      learnLessonSidePath(lesson.slug),
    ),
    readJson<{ course?: { lessons?: LearnCourseLessonMine[] } | null }>(learnCourseMinePath(lesson.course.slug)),
  ]);
  const main = lessonAnswer?.mainLanguage;
  const mainLanguage = typeof main === 'string' && main ? main : null;
  const onboarded = learnSignFrom(lessonAnswer?.learnOnboarded);
  const mine = lessonAnswer?.mine;
  if (!mine) return { viewer: null, mainLanguage, onboarded };
  const depths: Record<string, LearnDepth> = {};
  for (const row of courseAnswer?.course?.lessons ?? []) depths[row.slug] = row.depth;
  return { viewer: { mine: { ...mine, language: mine.language ?? null }, depths }, mainLanguage, onboarded };
}

/**
 * A visitor's right answer kept in this browser, saved once the person is back on its lesson with the Learn sign: only
 * while their side shows the lesson unanswered and the question is the same. The record is removed before the save,
 * so it is made once, and whenever it is out of date. Answers the person's side as the save left it, else as read.
 */
export async function replayKeptAnswer(
  lesson: { slug: string; question: string },
  read: Pick<LessonViewerRead, 'viewer' | 'onboarded'>,
): Promise<LessonViewer | null> {
  const { viewer, onboarded } = read;
  // Without their side, whether the lesson is answered is not known: the record waits.
  if (!viewer) return viewer;
  const kept = readKeptAnswer();
  const step = keptAnswerStepOf({
    kept,
    slug: lesson.slug,
    question: lesson.question,
    answered: viewer.mine.depth !== 'NONE',
    sign: onboarded,
    now: Date.now(),
  });
  if (step === 'keep' || !kept) return viewer;
  dropKeptAnswer();
  if (step === 'drop') return viewer;
  const { question, picked, tries, language } = kept;
  const result = await answerLearnLessonAction({ slug: lesson.slug, question, picked, tries, language }).catch(
    () => null,
  );
  const mine = result?.ok ? result.data?.mine : null;
  return mine ? { ...viewer, mine: { ...mine, language: mine.language ?? language } } : viewer;
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

/**
 * A lesson's page as it lives in the browser. The page is the same for everyone and comes drawn (`article`, `more`);
 * once it is up, a person with a session reads their side of the lesson and of its course, and a visitor asks for
 * nothing. Only a visitor is asked to sign in: their right answer is kept in the browser and saved when they are back
 * with the Learn sign. A person with a session goes on as a member does, and their right answer is saved, whether their
 * side has come or not; without the Learn sign, their main button leads to Learn's onboarding ("Keep your progress").
 * An answer the API saves nothing of (Learn not open to their account yet) is kept in the browser as a visitor's, and
 * the main button leads the same way. When their side first arrives, the player is drawn again so
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
  footer = null,
  openFact = false,
  fixes = null,
}: {
  lesson: LearnLesson;
  group: readonly LearnGroupLesson[];
  questionCodes?: readonly HighlightedCode[];
  mainLanguage?: string | null;
  article: ReactNode;
  more: ReactNode;
  footer?: ReactNode;
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
  // The Learn sign, once their side brings it; null until then, and when it cannot be read.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // A right answer the API saved nothing of: Learn is not open to the account yet, so it goes on through Learn's setup.
  const [unsaved, setUnsaved] = useState(false);
  const main = mainLanguage || mainOfSide;
  const { slug } = lesson;
  const course = lesson.course.slug;
  const question = lesson.question.id;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    setRealMine(null);
    readLessonViewer({ slug, course: { slug: course } })
      .then(async (read) => ({ ...read, viewer: await replayKeptAnswer({ slug, question }, read) }))
      .then(({ viewer, mainLanguage: read, onboarded: sign }) => {
        if (!live) return;
        // Only while the person has not touched the player: an answer started is graded and marked in the code it shows.
        if (!touched.current) setMainOfSide(read);
        setOnboarded(sign);
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
  }, [slug, course, question]);

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
  // A signed-in person without the Learn sign: their answer is saved, and the main button leads to the onboarding. So
  // does a right answer the API saved nothing of: Learn's setup shows where the account's own setup stands.
  const keep = (personal.kind !== 'visitor' && personal.kind !== 'pending' && onboarded === false) || unsaved;
  // The lesson, through Learn's onboarding: where a visitor's sign-in and "Keep your progress" lead.
  const throughSetup = learnSetupHrefOf(learnLessonPath(lesson.slug));
  const calls: LessonCalls = {
    onGraded: ({ picked, right, tries, language }) => {
      if (!right) return;
      // A visitor's answer is kept in the browser for an hour, saved when they are back with the Learn sign; anyone
      // with a session is saved as the session's user, side or not.
      if (personal.kind === 'visitor') {
        writeKeptAnswer({ slug: lesson.slug, question: lesson.question.id, picked, tries, language, at: Date.now() });
        return;
      }
      answerLearnLessonAction({ slug: lesson.slug, question: lesson.question.id, picked, tries, language }).then(
        (result) => {
          if (!result.ok) return;
          if (result.data) {
            setSaved({ ...result.data.mine, language: result.data.mine.language ?? language });
            return;
          }
          // Without their side or the sign, Learn is not open to the account yet: the answer is kept here, as a
          // visitor's, and saved once the person is back with the Learn sign. A person with either has a profile:
          // their setup would send them straight back, so nothing is kept.
          if (personal.kind === 'member' || onboarded === true) return;
          writeKeptAnswer({ slug: lesson.slug, question: lesson.question.id, picked, tries, language, at: Date.now() });
          setUnsaved(true);
          setNote(ANSWER_KEPT_NOTE);
        },
        () => {},
      );
    },
    onNext: () => {
      if (keep) router.push(throughSetup);
      else router.push(last || !lesson.next ? courseHrefOf(lesson.course) : learnLessonPath(lesson.next.slug));
    },
    onSignIn: () => {
      signIn(IDENTITY_PROVIDER, { redirectTo: throughSetup }).catch(() => {});
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
          footer={footer}
          calls={calls}
          openFact={openFact}
          signedIn={personal.kind !== 'visitor'}
          keep={keep}
          note={viewer ? null : note}
          real={realMine?.real ?? null}
          realWorld={<LessonRealWorldStreamed slug={lesson.slug} fixes={fixes} mine={realMine} />}
        />
      </div>
    </MainLanguageContext>
  );
}
