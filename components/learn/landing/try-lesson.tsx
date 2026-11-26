'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { CodeBox } from '@/components/learn/blocks/code-lines';
import { lessonPlace } from '@/components/learn/player/places';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { QuestionPart } from '@/components/learn/question/question-part';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { Button } from '@/components/ui/button';
import { PHONE_LINK } from '@/components/workspace/phone-link';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { type LandingViewer, type TryLesson, tryLanguagesLineOf } from '@/lib/learn/landing';
import type { LearnAnswerState } from '@/lib/learn/learn-answer';
import { isRightAnswer, type LearnLessonMine, storedAnswerOf } from '@/lib/learn/lesson-page';
import { answerLearnLessonAction } from '@/lib/learn/lesson-page.actions';
import { shortDayWords } from '@/lib/learn/my-progress';
import { coursePath, LEARN_HOME_PATH, LEARN_SETUP_PATH, learnLessonMinePath, learnLessonPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';
import { learnSetupHrefOf } from '@/lib/workspace/paths';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/*
 * The lesson at the top of the landing: a real lesson, answered right there. A visitor's answer is graded here
 * and never kept (the landing is not a lesson, and the sign-in carries no lesson back), then "Start learning" signs
 * them in to Learn's onboarding; a signed-in person's right answer is saved, then "Start learning" opens the
 * onboarding, or "Go to Learn home" for a learner. A lesson a learner learned before opens with their answer.
 */

/** The main button once the answer is right, by who reads the page. */
export const TRY_DONE_LABELS: Record<LandingViewer, string> = {
  visitor: 'Start learning',
  member: 'Start learning',
  learner: 'Go to Learn home',
};

/** A state the catalogue draws: which lesson, the answer, and the line a save or an earlier answer leaves. */
export type TryDrawn = { index?: number; answer?: LearnAnswerState; saved?: boolean; learnedOn?: string };

/** The line under the card once the answer is right. */
function DoneLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center text-sm text-muted-foreground" data-try-line="">
      {children}
    </div>
  );
}

/** "14 Nov", the day a lesson was learned, in UTC; null for a date that does not parse. */
const learnedDayOf = (at: string | null | undefined, now = new Date()) => {
  const when = at ? new Date(at) : null;
  if (!when || Number.isNaN(when.getTime())) return null;
  return shortDayWords(when.toISOString().slice(0, 10), now.toISOString().slice(0, 10));
};

function TryPlayer({
  item,
  viewer,
  drawn,
  hints,
}: {
  item: TryLesson;
  viewer: LandingViewer;
  drawn: TryDrawn;
  hints: boolean;
}) {
  const router = useRouter();
  const { lesson } = item;
  const language = item.code?.language ?? item.questionCodes[0]?.language ?? null;
  const [saved, setSaved] = useState(drawn.saved ?? false);
  const answer = useLearnAnswer({
    question: lesson.question,
    language,
    verdict: true,
    start: drawn.answer,
    onGraded: ({ picked, right, tries, language: given }) => {
      if (!right || viewer === 'visitor') return;
      answerLearnLessonAction({ slug: lesson.slug, question: lesson.question.id, picked, tries, language: given }).then(
        (result) => {
          if (result.ok && result.data) setSaved(true);
        },
        () => {},
      );
    },
    onDone: () => {
      if (viewer === 'visitor') {
        // Through the onboarding, ending on Learn home: a person who has the Learn sign goes straight there.
        signIn(IDENTITY_PROVIDER, { redirectTo: learnSetupHrefOf(LEARN_HOME_PATH) }).catch(() => {});
      } else router.push(viewer === 'member' ? LEARN_SETUP_PATH : LEARN_HOME_PATH);
    },
  });
  const right = isRightAnswer(answer.state);
  let below: ReactNode;
  if (right && drawn.learnedOn) below = <DoneLine>Learned on {drawn.learnedOn}.</DoneLine>;
  else if (right && viewer === 'visitor') below = <DoneLine>Your answer is not saved without an account.</DoneLine>;
  else if (right && saved) below = <DoneLine>Learned. Saved to your account.</DoneLine>;
  const languages = item.code ? tryLanguagesLineOf(item.code.language, item.languages) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        <Link
          href={coursePath(lesson.course.slug)}
          className={cn('self-start text-sm text-muted-foreground hover:underline', PHONE_LINK)}
        >
          {lesson.course.title} · {lesson.group.title}
        </Link>
        <h2 className="m-0 text-xl font-semibold text-balance">
          <Link href={learnLessonPath(lesson.slug)} className={cn('hover:underline', PHONE_LINK)}>
            {lesson.title}
          </Link>
        </h2>
        <p className="m-0 text-sm text-foreground/80">{item.text}</p>
        {item.code ? <CodeBox code={item.code} /> : null}
        {languages ? <p className="m-0 text-xs text-muted-foreground">{languages}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <QuestionPart question={lesson.question} answer={answer} highlighted={item.questionCodes} />
        <AnswerPart
          question={lesson.question}
          answer={answer}
          place={lessonPlace(TRY_DONE_LABELS[viewer])}
          hints={hints}
          highlighted={item.questionCodes}
          pill={drawn.learnedOn ? 'You answered this' : undefined}
          below={below}
        />
      </div>
    </div>
  );
}

/** A JSON answer of one of the person's routes; null on any failure. */
async function readMine(slug: string): Promise<LearnLessonMine | null> {
  try {
    const res = await fetch(learnLessonMinePath(slug), { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as { mine?: LearnLessonMine | null }).mine ?? null;
  } catch {
    return null;
  }
}

/**
 * The card: which lesson of how many, "Another lesson", and the lesson with its question. For a learner the lesson's
 * own side is read once the page is up; a lesson learned before is drawn again with its answer, while it is untouched.
 */
export function TryLessonCard({
  lessons,
  viewer,
  drawn = {},
  hints: hintsGiven,
}: {
  lessons: readonly TryLesson[];
  viewer: LandingViewer;
  drawn?: TryDrawn;
  hints?: boolean;
}) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const [index, setIndex] = useState(drawn.index ?? 0);
  const [earlier, setEarlier] = useState<{ slug: string; answer: LearnAnswerState; on: string | undefined } | null>(
    null,
  );
  const touched = useRef(false);
  const item = lessons[index % Math.max(1, lessons.length)];
  const slug = item?.lesson.slug;

  useEffect(() => {
    if (viewer !== 'learner' || !slug || !item) return;
    let live = true;
    readMine(slug).then((mine) => {
      if (!live || touched.current || !mine) return;
      const language = item.code?.language ?? null;
      const answer = storedAnswerOf(item.lesson.question, mine, language);
      if (answer) setEarlier({ slug, answer, on: learnedDayOf(mine.learnedAt) ?? undefined });
    });
    return () => {
      live = false;
    };
  }, [viewer, slug, item]);

  if (!item) return null;
  const opened = earlier && earlier.slug === item.lesson.slug ? earlier : null;
  const shown: TryDrawn = opened
    ? { answer: opened.answer, learnedOn: opened.on ?? '' }
    : index === (drawn.index ?? 0)
      ? drawn
      : {};
  const touch = () => {
    touched.current = true;
  };
  return (
    <figure
      id="try-a-lesson"
      aria-label="Try a lesson"
      className="m-0 flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
      data-try-lesson={viewer}
      onPointerDownCapture={touch}
      onKeyDownCapture={touch}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Lesson {index + 1} of {lessons.length}
        </span>
        {lessons.length > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="max-sm:min-h-11"
            onClick={() => {
              touched.current = true;
              setIndex((at) => (at + 1) % lessons.length);
            }}
            data-try-another=""
          >
            Another lesson
          </Button>
        ) : null}
      </div>
      <TryPlayer
        key={`${item.lesson.slug}:${opened ? 'mine' : 'new'}`}
        item={item}
        viewer={viewer}
        drawn={shown}
        hints={hints}
      />
    </figure>
  );
}
