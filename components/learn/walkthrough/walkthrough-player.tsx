'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { partHeadingIdOf, WALKTHROUGH_GRID, WALKTHROUGH_MAIN } from './walkthrough-parts';
import { lessonPlace } from '@/components/learn/player/places';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { type PlayerCrumb, PlayerRunEnd, PlayerStrip } from '@/components/workspace/player/player-strip';
import { usePlayer } from '@/components/workspace/player/use-player';
import type { LearnAnswerState } from '@/lib/learn/learn-answer';
import type { LearnQuestion } from '@/lib/learn/learn-question';
import { isRightAnswer } from '@/lib/learn/lesson-page';
import { finishWalkthroughAction } from '@/lib/learn/walkthrough.actions';
import { hasSessionHint } from '@/lib/session-hint';
import { runWordsOf } from '@/lib/workspace/player';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/** The last question's button, everywhere a walkthrough is played. */
export const FINISH_WALKTHROUGH = 'Finish the walkthrough';

/** The line under the card once a question is answered: how many are, and what comes next after the last. */
export function AnsweredLine({ answered, count, last }: { answered: number; count: number; last: string }) {
  const all = answered >= count;
  return (
    <div className="flex min-h-8 items-center text-sm text-muted-foreground" data-answered-line="">
      <span>
        <b className="font-semibold text-foreground">
          {all ? `All ${count} answered.` : `${answered} of ${count} answered.`}
        </b>{' '}
        {all ? last : 'A wrong pick never counts against you.'}
      </span>
    </div>
  );
}

/**
 * The parts, every one in the page's HTML (for search engines and agents), only the one asked about shown. A new part
 * takes the focus on its heading, so a screen reader starts at it; the page's first part is where the page opened.
 */
export function WalkthroughArticles({ articles, at }: { articles: readonly ReactNode[]; at: number }) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById(partHeadingIdOf(at))?.focus();
  }, [at]);
  return (
    <div className="min-w-0" data-walkthrough-parts="">
      {articles.map((article, index) => (
        // Parts never move: the index is the part.
        <div key={index} hidden={index !== at}>
          {article}
        </div>
      ))}
    </div>
  );
}

/** A state the catalogue draws: the question asked and its answer part way. */
export type WalkthroughDrawn = { at?: number; answered?: number; answer?: LearnAnswerState };

/**
 * A fix's public walkthrough: one part at a time on the left, its question on the right, graded on the page
 * from the key the read carries. A wrong pick shows why, and the person picks again; nothing is stored for a visitor.
 * On the last question "Finish the walkthrough" stores a signed-in person's pass, and leads them to the first issue
 * like this one of their own list; everyone else, and anyone the call does not answer, to the issues like this one
 * everyone sees (`next`).
 */
export function PublicWalkthroughPlayer({
  pr,
  version,
  crumbs,
  head,
  articles,
  questions,
  about,
  next,
  drawn,
  hints: hintsGiven,
}: {
  pr: PrRef;
  version: number;
  crumbs: readonly PlayerCrumb[];
  head: ReactNode;
  articles: readonly ReactNode[];
  /** Each part's question with its key, in the parts' order. */
  questions: readonly LearnQuestion[];
  about: ReactNode;
  next: Route;
  drawn?: WalkthroughDrawn;
  hints?: boolean;
}) {
  const count = questions.length;
  const answeredBefore = drawn?.answered ?? drawn?.at ?? 0;
  const player = usePlayer(count, {
    at: drawn?.at ?? 0,
    results: Array.from({ length: Math.min(answeredBefore, count) }, () => 'right' as const),
  });
  const at = Math.min(player.run.at, count - 1);
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    let target: Route = next;
    if (hasSessionHint(document.cookie)) {
      const answer = await finishWalkthroughAction(pr, version).catch(() => null);
      target = answer?.next ?? next;
    }
    router.push(target);
  }, [finishing, next, pr, version, router]);

  return (
    <>
      <PlayerStrip
        crumbs={crumbs}
        end={<PlayerRunEnd squares={player.squares} words={runWordsOf('Question', player.run)} />}
      />
      <main
        className={`${WALKTHROUGH_MAIN} max-[499px]:[&_[data-key-line]]:hidden max-[499px]:[&_kbd]:hidden`}
        data-walkthrough="public"
      >
        <div className="flex flex-col gap-6">
          {head}
          <div className={WALKTHROUGH_GRID}>
            <WalkthroughArticles articles={articles} at={at} />
            <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
              <PublicQuestion
                key={questions[at].id}
                question={questions[at]}
                last={at === count - 1}
                answered={player.run.results.length}
                count={count}
                start={drawn?.at === at ? drawn.answer : undefined}
                hints={hintsGiven}
                onRight={() => player.record('right')}
                onDone={at === count - 1 ? () => void finish() : player.next}
              />
              {about}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

/** One part's question, graded on the page: right moves the strip on; the main button then goes to the next part. */
function PublicQuestion({
  question,
  last,
  answered,
  count,
  start,
  hints: hintsGiven,
  onRight,
  onDone,
}: {
  question: LearnQuestion;
  last: boolean;
  answered: number;
  count: number;
  start?: LearnAnswerState;
  hints?: boolean;
  onRight: () => void;
  onDone: () => void;
}) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const answer = useLearnAnswer({
    question,
    language: null,
    verdict: true,
    start,
    onGraded: ({ right }) => {
      if (right) onRight();
    },
    onDone,
  });
  const right = isRightAnswer(answer.state);
  return (
    <AnswerPart
      question={question}
      answer={answer}
      place={lessonPlace(last ? FINISH_WALKTHROUGH : 'Next question')}
      hints={hints}
      below={
        right ? (
          <AnsweredLine answered={Math.max(answered, 1)} count={count} last="You know how this fix works." />
        ) : undefined
      }
    />
  );
}
