'use client';

import { type ReactNode, useState } from 'react';

import { InsightsPanel } from './insights-panel';
import { LessonFeedback } from './lesson-feedback';
import { LessonStripEnd } from './lesson-strip-end';
import { lessonPlace } from '@/components/learn/player/places';
import { type PlayerCrumb, PlayerStrip } from '@/components/learn/player/player-strip';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import type { HighlightedCode } from '@/lib/learn/code-tokens';
import type { LearnAnswerState } from '@/lib/learn/learn-answer';
import type { LearnPicked } from '@/lib/learn/learn-question';
import {
  deeperOf,
  depthLineOf,
  type InsightId,
  insightRowsOf,
  isGroupFinished,
  isLastOfGroup,
  isRightAnswer,
  type LearnDepth,
  type LearnGroupLesson,
  type LearnLesson,
  type LearnLessonMine,
  lessonPlaceOf,
  mainLabelOf,
  storedAnswerOf,
} from '@/lib/learn/lesson-page';
import { coursePath, LEARN_HOME_PATH, learnFactPath } from '@/lib/learn/paths';
import { useExampleLanguage } from '@/lib/learn/use-example-language';
import { useKeyHints } from '@/lib/learn/use-key-hints';

/** A signed-in person's side: the lesson's, and the depth of each lesson of the group (by slug). */
export type LessonViewer = { mine: LearnLessonMine; depths: Readonly<Record<string, LearnDepth>> };

/** What the page does: grade (the engine tells it each graded pick), go on, sign in, rate, comment. */
export type LessonCalls = {
  /** Each pick the page graded: the page saves a right one for a member. */
  onGraded?: (graded: { picked: LearnPicked; right: boolean; tries: number; language: string | null }) => void;
  /** The main button after a right answer, for a member: the next lesson, or the end of the group. */
  onNext: () => void;
  /** The main button after a right answer, for a visitor. */
  onSignIn: () => void;
  onRate: (good: boolean) => void;
  onComment: (comment: string, good: boolean) => void;
};

/** A state the catalogue draws: the answer, the rows shown without answering, the row open, the comment box. */
export type LessonDrawn = {
  answer?: LearnAnswerState;
  shown?: boolean;
  open?: InsightId | null;
  comment?: boolean;
};

/** The depth dots: how many of three are filled. */
function DepthDots({ filled }: { filled: number }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Depth ${filled} of 3`}>
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={`inline-block size-[9px] rounded-full border-[1.5px] border-primary ${dot <= filled ? 'bg-primary' : 'bg-transparent'}`}
        />
      ))}
    </span>
  );
}

/**
 * A lesson's page, its living part: the strip, the two columns (one on a phone), and the aside's question, depth line
 * and insights, which all follow the one answer. The article and what follows it come drawn (`article`, `more`), so
 * the lesson's text renders where the page renders it.
 */
export function LessonPlayer({
  lesson,
  group,
  viewer,
  questionCodes,
  mainLanguage,
  article,
  more,
  calls,
  drawn = {},
  hints: hintsGiven,
  now,
  timeZone,
}: {
  lesson: LearnLesson;
  group: readonly LearnGroupLesson[];
  viewer: LessonViewer | null;
  questionCodes?: readonly HighlightedCode[];
  mainLanguage?: string | null;
  article: ReactNode;
  more: ReactNode;
  calls: LessonCalls;
  drawn?: LessonDrawn;
  hints?: boolean;
  /** The clock and time zone the review's day is counted in; the browser's otherwise. */
  now?: Date;
  timeZone?: string;
}) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const member = viewer !== null;
  const mine = viewer?.mine ?? null;
  const exampleLanguages = (
    lesson.examples.find((example) => example.name === 'main') ?? lesson.examples[0]
  )?.codes.map((code) => code.language);
  const [language] = useExampleLanguage(exampleLanguages ?? [], mainLanguage);
  const stored = member ? storedAnswerOf(lesson.question, mine, language) : null;
  const start = drawn.answer ?? stored ?? undefined;
  // Opened again after it was learned: fixed when the page is drawn, not by an answer given on it.
  const [opened] = useState(() => !!stored && !drawn.answer);

  const firstPlace = lessonPlaceOf(group, lesson.slug, null);
  const last = isLastOfGroup(firstPlace);
  const answer = useLearnAnswer({
    question: lesson.question,
    language,
    verdict: true,
    start,
    onGraded: calls.onGraded,
    onDone: member ? calls.onNext : calls.onSignIn,
  });
  const right = isRightAnswer(answer.state);
  // A right answer makes the lesson Learned at once; the saved depth, when it comes, is never lower.
  const depth = right ? deeperOf(mine?.depth ?? 'NONE', 'LEARNED') : (mine?.depth ?? 'NONE');
  const place = lessonPlaceOf(group, lesson.slug, viewer ? { depths: viewer.depths, current: depth } : null);

  const rows = insightRowsOf(lesson);
  const [shown, setShown] = useState(drawn.shown ?? false);
  const [open, setOpen] = useState<InsightId | null | undefined>(drawn.open);
  const unlocked = right || shown;
  const openRow = open === undefined ? (rows[0]?.id ?? null) : open;

  const line = member
    ? depthLineOf({
        depth,
        dueAt: mine?.dueAt ?? null,
        now: now ?? new Date(),
        timeZone,
        groupFinished: right && !opened && last && isGroupFinished(place),
      })
    : null;

  let below: ReactNode;
  if (right && line) {
    below = (
      <div className="flex min-h-8 items-center gap-2 text-sm" data-depth-line="">
        <DepthDots filled={line.dots} />
        <span>
          <b className="font-semibold">{line.lead}</b>
          {line.tail ? <span className="text-muted-foreground"> {line.tail}</span> : null}
        </span>
      </div>
    );
  } else if (right && !member) {
    below = (
      <div className="flex min-h-8 items-center text-sm text-muted-foreground" data-visitor-line="">
        Your answer is not saved without an account.
      </div>
    );
  }

  const crumbs: PlayerCrumb[] = [
    { label: 'Learn', href: LEARN_HOME_PATH },
    { label: lesson.course.title, href: coursePath(lesson.course.slug) },
    { label: lesson.group.title },
  ];

  return (
    <>
      <PlayerStrip crumbs={crumbs} end={<LessonStripEnd place={place} />} />
      <main
        className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 lg:pt-8 max-[499px]:[&_[data-key-line]]:hidden max-[499px]:[&_kbd]:hidden"
        data-lesson=""
      >
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:grid-rows-[auto_1fr] lg:gap-10">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">{article}</div>
          <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <AnswerPart
              question={lesson.question}
              answer={answer}
              place={lessonPlace(mainLabelOf({ member, last, next: lesson.next }))}
              hints={hints}
              highlighted={questionCodes}
              pill={opened ? 'You answered this' : undefined}
              below={below}
            />
            <InsightsPanel
              lesson={lesson}
              rows={rows}
              unlocked={unlocked}
              keys={answer.state.phase === 'done'}
              hints={hints}
              open={openRow}
              onOpen={setOpen}
              onShow={() => setShown(true)}
              factPath={learnFactPath(lesson.slug)}
              footer={
                member && right ? (
                  <LessonFeedback
                    good={mine?.feedbackGood ?? null}
                    onRate={calls.onRate}
                    onComment={calls.onComment}
                    commentOpen={drawn.comment}
                  />
                ) : null
              }
            />
            {!member && !right ? (
              <p className="m-0 text-xs text-muted-foreground" data-visitor-note="">
                Sign in with GitHub to save your progress.
              </p>
            ) : null}
          </aside>
          <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-2 lg:gap-10">{more}</div>
        </div>
      </main>
    </>
  );
}
