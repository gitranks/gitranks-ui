'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { WALKTHROUGH_GRID, WALKTHROUGH_MAIN } from './walkthrough-parts';
import { AnsweredLine, FINISH_WALKTHROUGH, WalkthroughArticles } from './walkthrough-player';
import { lessonPlace } from '@/components/learn/player/places';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { Button } from '@/components/ui/button';
import { type PlayerCrumb, PlayerRunEnd, PlayerStrip } from '@/components/workspace/player/player-strip';
import { HEADING } from '@/components/workspace/primitives';
import { Box } from '@/components/workspace/status-box';
import { answerLessonQuestion, answerWarmup, markStepShown, startLessonRun } from '@/lib/learn/actions';
import type { LessonRun, LessonRunQuestion } from '@/lib/learn/learn.types';
import { callVerdictOf, pickedIdsOf, playerQuestionOf } from '@/lib/learn/walkthrough';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { type PlayerResult, type PlayerRun, runWordsOf, squaresOf } from '@/lib/workspace/player';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/** The line under the fixer's title: whose the walkthrough is until the pull request opens. */
export const FIXER_SMALL_PRINT =
  'Only you can see this walkthrough now. It becomes public when your pull request opens.';

/** Whether a step of the run is answered (right, known before, or passed by a report). */
const isDone = (run: LessonRun, stepId: string) =>
  (run.steps.find((step) => step.stepId === stepId)?.state ?? 'OPEN') !== 'OPEN';

/**
 * Where the fixer's run stands as the strip draws it: the parts answered so far (in order, the way a run passes
 * them), and the one on screen.
 */
export function fixerRunOf(stepIds: readonly string[], run: LessonRun | null, shownStep: string | null): PlayerRun {
  const done = run ? stepIds.findIndex((id) => !isDone(run, id)) : 0;
  const answered = done < 0 ? stepIds.length : done;
  const results: PlayerResult[] = Array.from({ length: answered }, () => 'right');
  const shown = shownStep ? stepIds.indexOf(shownStep) : -1;
  return { at: shown >= 0 ? shown : answered, count: stepIds.length, results };
}

/** The warm-up of a run of version 2, which the walkthrough does not show: every question answered "I don't know". */
const skippedWarmupOf = (run: LessonRun) =>
  run.warmup.map((question) => ({ questionId: question.id, picked: [], dontKnow: true }));

/**
 * The fixer's own walkthrough, before the pull request opens: today's run, graded on the server. The run
 * opens when the page shows (a version 2 run's warm-up answered "I don't know" without showing it); each pick is sent,
 * and the call's verdict shows in the card. A wrong pick shows why and the person picks again; on a version 2 run the
 * call may ask the part's other question instead, which then takes the card with the reason above it. On the last
 * question "Finish the walkthrough" leads to approving the pull request (`finish`).
 */
export function FixerWalkthroughPlayer({
  attemptId,
  crumbs,
  head,
  stepIds,
  articles,
  run: firstRun,
  finish,
  pullRequest,
  hints: hintsGiven,
}: {
  attemptId: string;
  crumbs: readonly PlayerCrumb[];
  head: ReactNode;
  /** The parts' ids, in order, as the run names them. */
  stepIds: readonly string[];
  /** Each part drawn, in the same order. */
  articles: readonly ReactNode[];
  run: LessonRun | null;
  finish: Route;
  /** The pull request's page, where a blocked walkthrough is sent back: never Approve, whatever `finish` is. */
  pullRequest: Route;
  hints?: boolean;
}) {
  const router = useRouter();
  const [run, setRun] = useState<LessonRun | null>(firstRun);
  // The question just answered right, kept on screen until the person goes on.
  const [held, setHeld] = useState<LessonRunQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(0);

  // A run opens as soon as the page shows; a version 2 run's warm-up is answered for the person, unseen.
  const asked = useRef(-1);
  const ready = !!run && !run.warmup.length;
  useEffect(() => {
    if (ready || asked.current === opening) return;
    asked.current = opening;
    (async () => {
      let current = run;
      if (!current) {
        const started = await startLessonRun(attemptId);
        if (!started.ok) return setError(contributeErrorMessage(started.error, started.message));
        current = started.data;
      }
      // The API closes the warm-up for this page (step 19); this is the fallback for a run where it did not.
      if (current.warmup.length) {
        const skipped = await answerWarmup(current.id, skippedWarmupOf(current));
        if (!skipped.ok) return setError(contributeErrorMessage(skipped.error, skipped.message));
        current = skipped.data;
      }
      setRun(current);
    })().catch(() => setError('Your walkthrough did not open. Try again.'));
  }, [ready, run, attemptId, opening]);

  const shown = held ?? run?.current ?? null;
  const shownStep = shown?.question.stepId ?? null;
  const at = shownStep ? Math.max(0, stepIds.indexOf(shownStep)) : 0;
  const player = fixerRunOf(stepIds, run, shownStep);

  // The time to an answer counts from when its part shows.
  const marked = useRef(new Set<string>());
  useEffect(() => {
    if (!run || !ready || held || !shownStep || marked.current.has(shownStep)) return;
    marked.current.add(shownStep);
    void markStepShown(run.id, shownStep).catch(() => {});
  }, [run, ready, held, shownStep]);

  let side: ReactNode;
  if (!ready || !run) {
    side = error ? (
      <Box state="LEARN_START" tone="warn">
        <h2 className={HEADING.card}>Your walkthrough did not open</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div>
          <Button
            type="button"
            variant="outline"
            className="max-sm:min-h-11"
            onClick={() => {
              setError(null);
              setOpening((count) => count + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </Box>
    ) : (
      <Box state="LEARN_START">
        <h2 className={HEADING.card}>Opening your walkthrough…</h2>
      </Box>
    );
  } else if (shown) {
    side = (
      <FixerQuestion
        key={shown.question.id}
        runId={run.id}
        asked={shown}
        answered={player.results.length}
        count={stepIds.length}
        passed={!!run.passedAt}
        hints={hintsGiven}
        onRight={(next) => {
          setHeld(shown);
          setRun(next);
        }}
        onOther={setRun}
        onDone={() => {
          if (run.passedAt) router.push(finish);
          else setHeld(null);
        }}
      />
    );
  } else if (run.passedAt) {
    side = <WalkthroughFinished count={stepIds.length} finish={finish} />;
  } else {
    side = (
      <Box state="LEARN_BLOCKED" tone="warn">
        <h2 className={HEADING.card}>Send it back to your agent</h2>
        <p className="text-sm text-muted-foreground">
          Two parts had every question reported, so the questions need fixing. Send the walkthrough back to your agent
          on your pull request’s page.
        </p>
        <Button asChild variant="outline" className="self-start max-sm:min-h-11">
          <Link href={pullRequest} prefetch={false}>
            Open your pull request
          </Link>
        </Button>
      </Box>
    );
  }

  const end = <PlayerRunEnd squares={squaresOf(player)} words={runWordsOf('Question', player)} />;
  return (
    <>
      <PlayerStrip crumbs={crumbs} end={end} />
      <main
        className={`${WALKTHROUGH_MAIN} max-[499px]:[&_[data-key-line]]:hidden max-[499px]:[&_kbd]:hidden`}
        data-walkthrough="fixer"
      >
        <div className="flex flex-col gap-6">
          {head}
          <div className={WALKTHROUGH_GRID}>
            <WalkthroughArticles articles={articles} at={at} />
            <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
              {side}
              <p className="m-0 text-xs text-muted-foreground" data-small-print="">
                {FIXER_SMALL_PRINT}
              </p>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

/** Every question answered: the way on to approving the pull request. */
export function WalkthroughFinished({ count, finish }: { count: number; finish: Route }) {
  return (
    <Box state="LEARN_WALKTHROUGH_DONE" tone="done">
      <h2 className={HEADING.card}>All {count} answered</h2>
      <p className="text-sm text-muted-foreground">Next: read the change and open the pull request.</p>
      <Button asChild className="min-h-11 self-start px-5 font-semibold max-sm:w-full">
        <Link href={finish} prefetch={false}>
          {FINISH_WALKTHROUGH}
        </Link>
      </Button>
    </Box>
  );
}

/** "Not quite" and why, over a question the call asked in place of the one picked wrong. */
function Hint({ asked }: { asked: LessonRunQuestion }) {
  const why = [...new Set(asked.hint.map((line) => line.why.trim()).filter(Boolean))].join(' ');
  if (!why) return null;
  return (
    <p className="m-0 rounded-lg border bg-card px-4 py-3 text-sm" data-walkthrough-hint="">
      <b className="font-semibold">Not quite.</b> <span className="text-muted-foreground">{why}</span>{' '}
      {asked.label ? <span className="font-medium">{asked.label}.</span> : null}
    </p>
  );
}

/** One part's question, graded by the call: right holds the card until the person goes on. */
function FixerQuestion({
  runId,
  asked,
  answered,
  count,
  passed,
  hints: hintsGiven,
  onRight,
  onOther,
  onDone,
}: {
  runId: string;
  asked: LessonRunQuestion;
  answered: number;
  count: number;
  passed: boolean;
  hints?: boolean;
  onRight: (run: LessonRun) => void;
  onOther: (run: LessonRun) => void;
  onDone: () => void;
}) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const { question: wire } = asked;
  const [question] = useState(() =>
    playerQuestionOf({ id: wire.id, multi: wire.type === 'MULTI', prompt: wire.prompt, options: wire.options }, false),
  );
  const answer = useLearnAnswer({
    question,
    language: null,
    verdict: true,
    send: async ({ picked }) => {
      const ids = pickedIdsOf(wire.options, picked);
      if (!ids.length) return null;
      const result = await answerLessonQuestion(runId, wire.id, ids);
      if (!result.ok) return null;
      const { correct, why, run } = result.data;
      const verdict = callVerdictOf(wire.options, ids, correct, why);
      if (correct) {
        onRight(run);
        return { right: true, why: verdict.why };
      }
      // A run of version 2 may ask the part's other question after a wrong pick: it takes the card.
      if (run.current && run.current.question.id !== wire.id) onOther(run);
      return { right: false, again: verdict };
    },
    onDone,
  });
  const done = answer.state.phase === 'done';
  return (
    <>
      {/* The run's reason for the question it asked instead; once this card has a verdict, only the new reason shows. */}
      {asked.hint.length && !answer.state.shown ? <Hint asked={asked} /> : null}
      <AnswerPart
        question={question}
        answer={answer}
        place={lessonPlace(passed ? FINISH_WALKTHROUGH : 'Next question')}
        hints={hints}
        below={
          done && answer.state.shown?.right ? (
            <AnsweredLine answered={answered} count={count} last="Next: read the change and open the pull request." />
          ) : undefined
        }
      />
    </>
  );
}
