'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { InsightsPanel } from './insights-panel';
import { LessonFeedback } from './lesson-feedback';
import { LessonStripEnd } from './lesson-strip-end';
import { lessonPlace } from '@/components/learn/player/places';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { Kbd } from '@/components/learn/question/kbd';
import { QuestionPart } from '@/components/learn/question/question-part';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { useHydrated } from '@/components/pulse/use-hydrated';
import { Button } from '@/components/ui/button';
import { type PlayerCrumb, PlayerStrip } from '@/components/workspace/player/player-strip';
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
  storedLanguageOf,
} from '@/lib/learn/lesson-page';
import { coursePath, LEARN_HOME_PATH, learnFactPath } from '@/lib/learn/paths';
import { FIX_A_REAL_ISSUE, FIX_ON_ITS_WAY_TAIL, fixOnItsWay, type LessonReal } from '@/lib/learn/real-issues';
import { useExampleLanguage } from '@/lib/learn/use-example-language';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import { issuePageHrefOf } from '@/lib/workspace/masked-issue';

/** The key of a lesson's player: another lesson, or a changed question, starts a new answer. */
export const lessonPlayerKeyOf = (lesson: Pick<LearnLesson, 'slug' | 'question'>) =>
  `${lesson.slug}:${lesson.question.id}`;

/** A signed-in person's side: the lesson's, and the depth of each lesson of the group (by slug). */
export type LessonViewer = { mine: LearnLessonMine; depths: Readonly<Record<string, LearnDepth>> };

/** What the page does: grade (the engine tells it each graded pick), go on, sign in, rate, comment. */
export type LessonCalls = {
  /** Each pick the page graded: the page saves a right one for a member. */
  onGraded?: (graded: { picked: LearnPicked; right: boolean; tries: number; language: string | null }) => void;
  /** The main button after a right answer, for a member or a signed-in person: the next lesson, or the end of the group. */
  onNext: () => void;
  /** The main button after a right answer, for a visitor. */
  onSignIn: () => void;
  /** Saves the rating: true once it is saved. */
  onRate: (good: boolean) => Promise<boolean>;
  /** Sends the comment: true once it is sent. */
  onComment: (comment: string, good: boolean) => Promise<boolean>;
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

/** Fields and dialogs that take Shift + Enter themselves. */
const TYPES_SHIFT_ENTER =
  'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="combobox"]';

/**
 * "Fix a real issue" on the right of the line under the card: the page of one issue. Shift + Enter follows it, caught
 * in the capture phase so the answer's own Enter (the next step, bound on the way up) sees it handled.
 */
function FixRealIssue({ href, hints }: { href: string; hints: boolean }) {
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !event.shiftKey || event.defaultPrevented || event.repeat || event.isComposing)
        return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(TYPES_SHIFT_ENTER) || target?.isContentEditable) return;
      event.preventDefault();
      link.current?.click();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return (
    <Button asChild variant="outline" className="h-8 shrink-0 gap-1.5 px-2.5 text-[13px] max-sm:min-h-11">
      <Link ref={link} href={href as never} prefetch={false} data-fix-real-issue="">
        {FIX_A_REAL_ISSUE}
        {hints ? (
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            <Kbd>⇧</Kbd>
            <Kbd>⏎</Kbd>
          </span>
        ) : null}
      </Link>
    </Button>
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
  openFact = false,
  signedIn = false,
  note,
  hints: hintsGiven,
  now,
  timeZone,
  real = null,
  realWorld = null,
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
  /** Opened from a shared fact: the insights start shown, with "Did you know?" open. */
  openFact?: boolean;
  /**
   * A person with a session whose side has not come (still being read, or not read): never asked to sign in. Their
   * main button goes on, as a member's; the page saves their answer.
   */
  signedIn?: boolean;
  /** A line under the card after a right answer, when there is no depth line to show (the page's word on the save). */
  note?: ReactNode;
  hints?: boolean;
  /**
   * The clock and time zone the review's day is counted in. With both given, the server draws the review's words; with
   * either missing, the browser's are used, and the words show once the page runs, so both draw the same first HTML.
   */
  now?: Date;
  timeZone?: string;
  /** The person's real issues for the lesson: their fix that uses it, and the first issue of their list for it. */
  real?: LessonReal | null;
  /** "In the real world", drawn after the lesson and before previous and next. */
  realWorld?: ReactNode;
}) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const member = viewer !== null;
  // Asked to sign in only without a session; a person with one goes on as a member does.
  const goesOn = member || signedIn;
  const mine = viewer?.mine ?? null;
  // The main example's languages; a lesson with none reads its question's code, else has no tab.
  const exampleLanguages = (
    lesson.examples.find((example) => example.name === 'main')?.codes ?? lesson.question.codes
  ).map((code) => code.language);
  const [tab] = useExampleLanguage(exampleLanguages, mainLanguage);
  const stored = member ? storedAnswerOf(lesson.question, mine, tab) : null;
  const start = drawn.answer ?? stored ?? undefined;
  // Opened again after it was learned: fixed when the page is drawn, not by an answer given on it.
  const [opened] = useState(() => !!stored && !drawn.answer);
  // An answer given before shows in the language it was given in; a new one in the tab the person reads.
  const language = opened ? storedLanguageOf(lesson.question, mine, tab) : tab;

  const firstPlace = lessonPlaceOf(group, lesson.slug, null);
  const last = isLastOfGroup(firstPlace);
  const answer = useLearnAnswer({
    question: lesson.question,
    language,
    verdict: true,
    start,
    onGraded: calls.onGraded,
    onDone: goesOn ? calls.onNext : calls.onSignIn,
  });
  const right = isRightAnswer(answer.state);
  // A right answer makes the lesson Learned at once; the saved depth, when it comes, is never lower.
  const depth = right ? deeperOf(mine?.depth ?? 'NONE', 'LEARNED') : (mine?.depth ?? 'NONE');
  const place = lessonPlaceOf(group, lesson.slug, viewer ? { depths: viewer.depths, current: depth } : null);

  const rows = insightRowsOf(lesson);
  const factFirst = openFact && rows.some((row) => row.id === 'fact');
  const [shown, setShown] = useState(drawn.shown ?? factFirst);
  const [open, setOpen] = useState<InsightId | null | undefined>(drawn.open ?? (factFirst ? 'fact' : undefined));
  const unlocked = right || shown;
  const openRow = open === undefined ? (rows[0]?.id ?? null) : open;

  // The review's day: in the page's clock and zone when it gives both, else in the browser's once the page runs.
  const hydrated = useHydrated();
  const clock = now && timeZone ? { now, timeZone } : hydrated ? { now: now ?? new Date(), timeZone } : null;
  const line = member
    ? depthLineOf({
        depth,
        dueAt: clock ? (mine?.dueAt ?? null) : null,
        now: clock?.now ?? new Date(0),
        timeZone: clock?.timeZone,
        // Right after the answer that finished the group, on whichever of its lessons.
        groupFinished: right && !opened && isGroupFinished(place),
      })
    : null;

  // A fix of the person's that uses the lesson, not merged yet: the lesson becomes Mastered with it.
  const tail =
    line && fixOnItsWay(real?.fix) && (depth === 'LEARNED' || depth === 'PRACTISED') ? FIX_ON_ITS_WAY_TAIL : line?.tail;
  // "Fix a real issue": after a right answer, for a person whose list has an issue for the lesson and no fix of theirs.
  const fixIssueHref = member && right && real?.fixAnIssue ? issuePageHrefOf(real.fixAnIssue.issue.id, 'learn') : null;

  let below: ReactNode;
  if (right && line) {
    below = (
      <div className="flex min-h-8 items-center justify-between gap-3 text-sm" data-depth-line="">
        <span className="flex min-w-0 items-center gap-2">
          <DepthDots filled={line.dots} />
          <span>
            <b className="font-semibold">{line.lead}</b>
            {tail ? <span className="text-muted-foreground"> {tail}</span> : null}
          </span>
        </span>
        {fixIssueHref ? <FixRealIssue href={fixIssueHref} hints={hints} /> : null}
      </div>
    );
  } else if (right && note) {
    below = (
      <div className="flex min-h-8 items-center text-sm text-muted-foreground" data-answer-note="">
        {note}
      </div>
    );
  } else if (right && !goesOn) {
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
            <QuestionPart question={lesson.question} answer={answer} highlighted={questionCodes} />
            <AnswerPart
              question={lesson.question}
              answer={answer}
              place={lessonPlace(mainLabelOf({ member: goesOn, last, next: lesson.next }))}
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
            {!goesOn && !right ? (
              <p className="m-0 text-xs text-muted-foreground" data-visitor-note="">
                Sign in with GitHub to save your progress.
              </p>
            ) : null}
          </aside>
          <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-2 lg:gap-10">
            {realWorld}
            {more}
          </div>
        </div>
      </main>
    </>
  );
}
