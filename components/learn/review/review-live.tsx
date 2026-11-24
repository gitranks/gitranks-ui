'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  nextActionOf,
  ReviewCard,
  ReviewEmpty,
  ReviewEnd,
  ReviewFailed,
  ReviewFrame,
  ReviewPending,
  ReviewVisitor,
} from './review-parts';
import { useEnter, useFocusOnShow } from '@/components/learn/player/use-page-keys';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { PlayerRunEnd } from '@/components/workspace/player/player-strip';
import { usePlayer } from '@/components/workspace/player/use-player';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import { learnReviewMinePath, learnReviewPath } from '@/lib/learn/paths';
import type { LearnReviewAnswered, ReviewDone, ReviewItemShown, ReviewSide } from '@/lib/learn/review';
import { answerLearnReviewAction } from '@/lib/learn/review.actions';
import { useExampleLanguage } from '@/lib/learn/use-example-language';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import { useLearnSetupGuess } from '@/lib/learn/use-setup-guess';
import { hasSessionHint } from '@/lib/session-hint';
import { runWordsOf } from '@/lib/workspace/player';

/**
 * The person's review from its route: `'signed-out'` when the session is gone or needs a new sign-in; null when there
 * is none (Learn not open to them), and on any failure.
 */
export async function readReviewSide(course: string | null): Promise<ReviewSide | 'signed-out' | null> {
  try {
    const res = await fetch(learnReviewMinePath(course), { cache: 'no-store' });
    if (!res.ok) return null;
    const { review, signedOut } = (await res.json()) as { review?: ReviewSide | null; signedOut?: boolean };
    if (signedOut === true) return 'signed-out';
    return review && Array.isArray(review.items) ? review : null;
  } catch {
    return null;
  }
}

/** One answered lesson of the sitting: the call's reply, whether it was "I don't remember", and its course. */
type Answered = { reply: LearnReviewAnswered; forgot: boolean; course: LearnLessonLink };

/**
 * Where the page stands: not known yet, a visitor, a session that ended while the page was up, a session whose review
 * did not come, or the review. `kept`: the lessons answered before a refused answer read the set again.
 */
type Personal =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'ended' }
  | { kind: 'failed' }
  | { kind: 'ready'; side: ReviewSide; sitting: number; kept: Answered[] };

/**
 * The daily review in the browser (page 16). The page is the person's own: once it is up, a person with a session
 * reads today's set, and a visitor is asked to sign in. While the set is on its way, the card's place waits; a set
 * that does not come says so, with a way to try again. The sitting asks each lesson once, then ends with what changed.
 */
export function ReviewLive({ course }: { course: LearnLessonLink | null }) {
  useLearnSetupGuess();
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  const scope = course?.slug ?? null;
  const sittings = useRef(0);

  const shownOf = useCallback((side: ReviewSide | 'signed-out' | null, kept: Answered[]): Personal => {
    if (side === 'signed-out') return { kind: 'ended' };
    if (!side) return { kind: 'failed' };
    sittings.current += 1;
    return { kind: 'ready', side, sitting: sittings.current, kept };
  }, []);

  /** Reads the set again: a new sitting, or after a refused answer the same one, with the lessons answered kept. */
  const load = useCallback(
    async (kept: Answered[] = []) => {
      setPersonal({ kind: 'pending' });
      setPersonal(shownOf(await readReviewSide(scope), kept));
    },
    [scope, shownOf],
  );
  const reload = useCallback(() => void load(), [load]);
  const signedOut = useCallback(() => setPersonal({ kind: 'ended' }), []);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    readReviewSide(scope).then((side) => {
      if (live) setPersonal(shownOf(side, []));
    });
    return () => {
      live = false;
    };
  }, [scope, shownOf]);

  if (personal.kind === 'ready' && (personal.side.items.length || personal.kept.length)) {
    return (
      <ReviewSitting
        key={personal.sitting}
        course={course}
        side={personal.side}
        kept={personal.kept}
        // The page opened on the first sitting's card; every later sitting's first card takes the focus.
        focusFirst={personal.sitting > 1}
        onMore={reload}
        onConflict={load}
        onSignedOut={signedOut}
      />
    );
  }
  return (
    <ReviewFrame course={course}>
      <ReviewStill personal={personal} course={course} onReload={reload} />
    </ReviewFrame>
  );
}

/** The pages with no card: waiting, signing in, a read that failed, and nothing due. */
function ReviewStill({
  personal,
  course,
  onReload,
}: {
  personal: Personal;
  course: LearnLessonLink | null;
  onReload: () => void;
}) {
  const hints = useKeyHints();
  const router = useRouter();
  const shown = personal.kind !== 'pending';
  const titleRef = useFocusOnShow<HTMLHeadingElement>(shown);
  const empty = personal.kind === 'ready' ? nextActionOf(personal.side.next) : null;
  useEnter(empty ? () => router.push(empty.href) : null);

  if (personal.kind === 'pending') return <ReviewPending />;
  if (personal.kind === 'visitor' || personal.kind === 'ended') {
    return (
      <ReviewVisitor
        ended={personal.kind === 'ended'}
        titleRef={titleRef}
        onSignIn={() => {
          signIn(IDENTITY_PROVIDER, { redirectTo: learnReviewPath(course?.slug ?? null) }).catch(() => {});
        }}
      />
    );
  }
  if (personal.kind === 'failed') return <ReviewFailed titleRef={titleRef} onReload={onReload} />;
  const { side } = personal;
  return (
    <ReviewEmpty
      nextReviewAt={side.nextReviewAt}
      nextReviewLessons={side.nextReviewLessons}
      next={side.next}
      now={new Date()}
      hints={hints}
      titleRef={titleRef}
    />
  );
}

/**
 * One sitting: the set's lessons one after another, each asked once, then the end. An answer the API refuses as
 * already given or not due (another window answered it) reads the set again, and the lessons answered before it stay
 * on the strip and on the end's list (`kept`). A session that ends on the way asks to sign in.
 */
function ReviewSitting({
  course,
  side,
  kept,
  focusFirst,
  onMore,
  onConflict,
  onSignedOut,
}: {
  course: LearnLessonLink | null;
  side: ReviewSide;
  kept: Answered[];
  focusFirst: boolean;
  onMore: () => void;
  onConflict: (kept: Answered[]) => void;
  onSignedOut: () => void;
}) {
  const { items } = side;
  const player = usePlayer(kept.length + items.length, {
    at: kept.length,
    results: kept.map(({ reply }) => (reply.right ? 'right' : 'wrong')),
  });
  const [answered, setAnswered] = useState<Answered[]>(kept);
  const hints = useKeyHints();
  const router = useRouter();
  const endRef = useFocusOnShow<HTMLHeadingElement>(player.over);
  const cardRef = useRef<HTMLElement>(null);
  const first = useRef(!focusFirst);
  const at = player.run.at;

  // Each new lesson takes the focus, so a screen reader starts at its card; only the page's first card is where the
  // page opened.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the lesson changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    cardRef.current?.focus();
  }, [at]);

  const action = nextActionOf(side.next);
  useEnter(player.over ? (side.more > 0 ? onMore : () => router.push(action.href)) : null);

  const done: ReviewDone[] = answered.map(({ reply, course: from }) => ({
    lesson: reply.lesson,
    course: from,
    change: reply.change,
  }));
  const end = <PlayerRunEnd squares={player.squares} words={runWordsOf('Lesson', player.run)} />;

  if (player.over) {
    return (
      <ReviewFrame course={course} end={end}>
        <ReviewEnd done={done} more={side.more} next={side.next} hints={hints} onMore={onMore} titleRef={endRef} />
      </ReviewFrame>
    );
  }
  const item = items[at - kept.length];
  return (
    <ReviewFrame course={course} end={end}>
      <h1 className="sr-only">Your review</h1>
      <section
        ref={cardRef}
        tabIndex={-1}
        className="flex flex-col gap-4 outline-none"
        aria-label={`Lesson ${at + 1} of ${player.run.count}`}
      >
        <ReviewQuestion
          key={item.id}
          item={item}
          mainLanguage={side.mainLanguage ?? null}
          last={at === player.run.count - 1}
          answered={answered[at] ?? null}
          onAnswered={(reply, forgot) => {
            setAnswered((list) => (list.length === at ? [...list, { reply, forgot, course: item.course }] : list));
            player.record(reply.right ? 'right' : 'wrong');
          }}
          onConflict={() => onConflict(answered)}
          onSignedOut={onSignedOut}
          onNext={player.next}
        />
      </section>
    </ReviewFrame>
  );
}

/** One lesson's question: its answer is sent as the person's, and the call's verdict shows in the card. */
function ReviewQuestion({
  item,
  last,
  mainLanguage,
  answered,
  onAnswered,
  onConflict,
  onSignedOut,
  onNext,
}: {
  item: ReviewItemShown;
  last: boolean;
  mainLanguage: string | null;
  answered: Answered | null;
  onAnswered: (reply: LearnReviewAnswered, forgot: boolean) => void;
  onConflict: () => void;
  onSignedOut: () => void;
  onNext: () => void;
}) {
  // The examples' rule, as a lesson shows code: the main language, else the one last picked, else Python, else the first.
  const [language] = useExampleLanguage(
    item.question.codes.map((code) => code.language),
    mainLanguage,
  );
  const answer = useLearnAnswer({
    question: item.question,
    language,
    extra: true,
    extraAnswers: true,
    verdict: true,
    send: async ({ picked, extra, language: sentIn }) => {
      const result = await answerLearnReviewAction({ item: item.id, picked, forgot: extra, language: sentIn });
      if (!result.ok) {
        // Answered in another window, or no longer due: what is due is read again.
        if (result.error === 'CONFLICT') onConflict();
        // The session ended: trying again cannot help, signing in does.
        if (result.error === 'SIGNED_OUT') onSignedOut();
        return null;
      }
      if (!result.data) return null;
      onAnswered(result.data, extra);
      return { right: result.data.right, question: result.data.question };
    },
    onDone: onNext,
  });
  return (
    <ReviewCard
      item={item}
      answer={answer}
      last={last}
      reply={answered?.reply ?? null}
      forgot={answered?.forgot ?? false}
    />
  );
}
