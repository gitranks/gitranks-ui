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
import { PlayerRunEnd } from '@/components/learn/player/player-strip';
import { useEnter, useFocusOnShow } from '@/components/learn/player/use-page-keys';
import { usePlayer } from '@/components/learn/player/use-player';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import { learnReviewMinePath, learnReviewPath } from '@/lib/learn/paths';
import { runWordsOf } from '@/lib/learn/player';
import type { LearnReviewAnswered, ReviewDone, ReviewItemShown, ReviewSide } from '@/lib/learn/review';
import { answerLearnReviewAction } from '@/lib/learn/review.actions';
import { useExampleLanguage } from '@/lib/learn/use-example-language';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's review from its route; null when there is none (Learn not open to them), and on any failure. */
export async function readReviewSide(course: string | null): Promise<ReviewSide | null> {
  try {
    const res = await fetch(learnReviewMinePath(course), { cache: 'no-store' });
    if (!res.ok) return null;
    const { review } = (await res.json()) as { review?: ReviewSide | null };
    return review && Array.isArray(review.items) ? review : null;
  } catch {
    return null;
  }
}

/** Where the page stands: not known yet, a visitor, a session whose review did not come, or the review. */
type Personal =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'failed' }
  | { kind: 'ready'; side: ReviewSide; sitting: number };

/**
 * The daily review in the browser (page 16). The page is the person's own: once it is up, a person with a session
 * reads today's set, and a visitor is asked to sign in. While the set is on its way, the card's place waits; a set
 * that does not come says so, with a way to try again. The sitting asks each lesson once, then ends with what changed.
 */
export function ReviewLive({ course }: { course: LearnLessonLink | null }) {
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  const scope = course?.slug ?? null;
  const sittings = useRef(0);

  const load = useCallback(async () => {
    setPersonal({ kind: 'pending' });
    const side = await readReviewSide(scope);
    sittings.current += 1;
    setPersonal(side ? { kind: 'ready', side, sitting: sittings.current } : { kind: 'failed' });
  }, [scope]);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    readReviewSide(scope).then((side) => {
      if (!live) return;
      sittings.current += 1;
      setPersonal(side ? { kind: 'ready', side, sitting: sittings.current } : { kind: 'failed' });
    });
    return () => {
      live = false;
    };
  }, [scope]);

  if (personal.kind === 'ready' && personal.side.items.length) {
    return <ReviewSitting key={personal.sitting} course={course} side={personal.side} onReload={load} />;
  }
  return (
    <ReviewFrame course={course}>
      <ReviewStill personal={personal} course={course} onReload={load} />
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
  if (personal.kind === 'visitor') {
    return (
      <ReviewVisitor
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

/** One answered lesson of the sitting: the call's reply, and whether it was "I don't remember". */
type Answered = { reply: LearnReviewAnswered; forgot: boolean };

/**
 * One sitting: the set's lessons one after another, each asked once, then the end. An answer the API refuses as
 * already given or not due (another window answered it) reads the set again.
 */
function ReviewSitting({
  course,
  side,
  onReload,
}: {
  course: LearnLessonLink | null;
  side: ReviewSide;
  onReload: () => void;
}) {
  const { items } = side;
  const player = usePlayer(items.length);
  const [answered, setAnswered] = useState<Answered[]>([]);
  const hints = useKeyHints();
  const router = useRouter();
  const endRef = useFocusOnShow<HTMLHeadingElement>(player.over);
  const cardRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const at = player.run.at;

  // Each new lesson takes the focus, so a screen reader starts at its card; the first one is where the page opened.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the lesson changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    cardRef.current?.focus();
  }, [at]);

  const action = nextActionOf(side.next);
  useEnter(player.over ? (side.more > 0 ? onReload : () => router.push(action.href)) : null);

  const done: ReviewDone[] = answered.map(({ reply }, index) => ({
    lesson: reply.lesson,
    course: items[index].course,
    change: reply.change,
  }));
  const end = <PlayerRunEnd squares={player.squares} words={runWordsOf('Lesson', player.run)} />;

  if (player.over) {
    return (
      <ReviewFrame course={course} end={end}>
        <ReviewEnd done={done} more={side.more} next={side.next} hints={hints} onMore={onReload} titleRef={endRef} />
      </ReviewFrame>
    );
  }
  const item = items[at];
  return (
    <ReviewFrame course={course} end={end}>
      <h1 className="sr-only">Your review</h1>
      <section
        ref={cardRef}
        tabIndex={-1}
        className="flex flex-col gap-4 outline-none"
        aria-label={`Lesson ${at + 1} of ${items.length}`}
      >
        <ReviewQuestion
          key={item.id}
          item={item}
          last={at === items.length - 1}
          answered={answered[at] ?? null}
          onAnswered={(reply, forgot) => {
            setAnswered((list) => (list.length === at ? [...list, { reply, forgot }] : list));
            player.record(reply.right ? 'right' : 'wrong');
          }}
          onConflict={onReload}
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
  answered,
  onAnswered,
  onConflict,
  onNext,
}: {
  item: ReviewItemShown;
  last: boolean;
  answered: Answered | null;
  onAnswered: (reply: LearnReviewAnswered, forgot: boolean) => void;
  onConflict: () => void;
  onNext: () => void;
}) {
  const [language] = useExampleLanguage(item.question.codes.map((code) => code.language));
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
