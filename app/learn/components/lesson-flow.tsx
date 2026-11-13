'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import {
  answerLessonQuestion,
  answerWarmup,
  logCopyForAgent,
  markStepShown,
  reportQuestion,
  sendQuestionFeedback,
  startLessonRun,
} from '../actions';
import { LessonBlock, RichText } from './lesson-block';
import { LessonSteps, stepAnchorOf } from './lesson-steps';
import { LessonSummary } from './lesson-summary';
import { QuestionCard } from './question-card';
import { WrittenFor } from './written-for';
import { Box } from '@/app/contribute/components/attempt-status';
import { CopyButton } from '@/app/contribute/components/copy-button';
import { HEADING } from '@/app/contribute/components/primitives';
import { Button } from '@/components/ui/button';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import type {
  LearnStage,
  LessonHead,
  LessonQuestion,
  LessonReportReason,
  LessonRun,
  LessonStep,
  LessonWhy,
} from '@/lib/learn/learn.types';
import { copyPromptOf } from '@/lib/learn/lesson-format';
import { answeredCountOf, isStepDone, partsLabelOf, warmupAnswersOf } from '@/lib/learn/question';

/** The last answer checked on this page: kept to show it graded until the user moves on. */
export type CheckedAnswer = {
  question: LessonQuestion;
  picked: string[];
  correct: boolean;
  why: LessonWhy[];
};

/** What the catalogue draws a flow with: an answer already checked, picks already made, the report form open. */
export type LessonFlowStart = {
  checked?: CheckedAnswer | null;
  picked?: string[];
  warmupPicks?: Record<string, string[]>;
  reportDrawn?: boolean;
};

/** The grid of the lesson's pages: the rail of steps beside the pane from `lg`, above it on a phone. */
export const LESSON_GRID = 'grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]';

/**
 * A step: what it covers, its title, and its blocks. `copy` names a second drawing of it on the page (the details'
 * Lesson tab), so its anchor and its diagrams' ids stay the step's own.
 */
export function StepArticle({
  step,
  index,
  count,
  copy,
}: {
  step: LessonStep;
  index: number;
  count: number;
  copy?: string;
}) {
  return (
    <article
      id={copy ? undefined : stepAnchorOf(step)}
      className="flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-5"
      data-step-article={step.id}
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs text-muted-foreground">
          Step {index + 1} of {count} · {partsLabelOf(step)}
        </span>
        <h2 className={`${HEADING.section} text-balance`}>{step.title}</h2>
      </div>
      {step.blocks.map((block, at) => (
        // Blocks never move within a step: the index is the block.
        <LessonBlock key={at} block={block} id={`${copy ?? ''}${step.id}-${at}`} />
      ))}
    </article>
  );
}

/** Where the flow is, from the run as it stands. */
type Phase = 'starting' | 'warmup' | 'step' | 'blocked' | 'done' | 'static';

/**
 * The flow's phase: a right answer stays on its step until the user moves on (`rightShown`), even the one that passed
 * the lesson, so its why lines are read before the summary.
 */
export function phaseOf(stage: LearnStage, run: LessonRun | null, rightShown = false): Phase {
  if (stage === 'PR_OPEN' || stage === 'HAND_PR' || stage === 'ENDED') return 'static';
  if (!run) return 'starting';
  if (rightShown) return 'step';
  if (run.passedAt) return 'done';
  if (run.blocked) return 'blocked';
  if (run.warmup.length) return 'warmup';
  return 'step';
}

/**
 * The user's lesson, beside its steps: the warm-up, then one step at a time with its question (a wrong answer shows a
 * hint and asks the step's other question), then the summary. `pane` is what the page adds under it: the pull
 * request's form once the lesson is passed, the share card once the pull request is open. Every answer is checked by
 * the API, which alone holds the key.
 */
export function LessonFlow({
  attemptId,
  stage,
  head,
  steps,
  run: firstRun,
  pane,
  start,
}: {
  attemptId: string;
  stage: LearnStage;
  head: LessonHead | null;
  steps: readonly LessonStep[];
  run: LessonRun | null;
  pane?: ReactNode;
  start?: LessonFlowStart;
}) {
  const router = useRouter();
  const [run, setRun] = useState<LessonRun | null>(firstRun);
  const [checked, setChecked] = useState<CheckedAnswer | null>(start?.checked ?? null);
  const [picked, setPicked] = useState<string[]>(start?.picked ?? []);
  const [warmupPicks, setWarmupPicks] = useState<Record<string, string[]>>(start?.warmupPicks ?? {});
  const [liked, setLiked] = useState<Map<string, boolean>>(
    () => new Map((firstRun?.liked ?? []).map((like) => [like.questionId, like.liked])),
  );
  const [viewing, setViewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const phase = phaseOf(stage, run, checked?.correct === true);

  // A lesson with no run yet opens one as soon as the page shows: the open one, or a new one. "Try again" asks again.
  const [tries, setTries] = useState(0);
  const starting = useRef(-1);
  useEffect(() => {
    if (phase !== 'starting' || starting.current === tries) return;
    starting.current = tries;
    startLessonRun(attemptId).then((result) => {
      if (result.ok) setRun(result.data);
      else setError(contributeErrorMessage(result.error, result.message));
    });
  }, [phase, attemptId, tries]);

  // The run passed, or two steps had every question reported: once the user has moved on, the page reads the lesson
  // again, which opens the pull request's form, or says the questions need fixing with the send-back.
  const refreshed = useRef(false);
  const wanted = run?.passedAt ? 'READY_TO_APPROVE' : run?.blocked ? 'BLOCKED' : null;
  useEffect(() => {
    if (!wanted || wanted === stage || checked?.correct || refreshed.current) return;
    refreshed.current = true;
    router.refresh();
  }, [wanted, stage, checked?.correct, router]);

  const current = run?.current ?? null;
  // The question on screen: the one just answered right, else the one to answer.
  const shownQuestion = checked?.correct ? checked.question : (current?.question ?? null);
  // The step on screen: the one just answered right (until "Next step"), else the current question's.
  const stepId = checked?.correct ? checked.question.stepId : (current?.question.stepId ?? null);
  const shownId = viewing ?? (phase === 'step' ? stepId : null);
  const stepIndex = steps.findIndex((step) => step.id === shownId);
  const step = stepIndex >= 0 ? steps[stepIndex] : null;

  // The time to an answer counts from when its step shows.
  const shownSteps = useRef(new Set<string>());
  useEffect(() => {
    if (phase !== 'step' || !run || !stepId || checked?.correct || shownSteps.current.has(stepId)) return;
    shownSteps.current.add(stepId);
    void markStepShown(run.id, stepId);
  }, [phase, run, stepId, checked?.correct]);

  const results = run?.steps ?? [];
  const reachable = new Set(
    steps
      .filter((one) => isStepDone(results.find((result) => result.stepId === one.id)) || one.id === stepId)
      .map(({ id }) => id),
  );

  const failed = (result: { error: Parameters<typeof contributeErrorMessage>[0]; message?: string }) =>
    contributeErrorMessage(result.error, result.message);

  const like = useCallback(
    (questionId: string, value: boolean) => {
      if (!run) return;
      setLiked((before) => new Map(before).set(questionId, value));
      void sendQuestionFeedback(run.id, questionId, value);
    },
    [run],
  );

  const report = async (questionId: string, reason: LessonReportReason): Promise<string | null> => {
    if (!run) return 'Your lesson is still opening. Try again in a moment.';
    const result = await reportQuestion(run.id, questionId, reason);
    if (!result.ok) return failed(result);
    setRun(result.data);
    if (checked?.question.id === questionId) setChecked(null);
    setPicked([]);
    return null;
  };

  const check = () => {
    if (!run || !current || !picked.length) return;
    const question = current.question;
    startTransition(async () => {
      setError(null);
      const result = await answerLessonQuestion(run.id, question.id, picked);
      if (!result.ok) {
        setError(failed(result));
        return;
      }
      setChecked({ question, picked, correct: result.data.correct, why: result.data.why });
      setRun(result.data.run);
      setPicked([]);
    });
  };

  const next = () => {
    setChecked(null);
    setViewing(null);
  };

  const startLesson = () => {
    if (!run) return;
    startTransition(async () => {
      setError(null);
      const result = await answerWarmup(run.id, warmupAnswersOf(run.warmup, warmupPicks));
      if (!result.ok) {
        setError(failed(result));
        return;
      }
      setRun(result.data);
    });
  };

  const rail = (
    <div className="flex min-w-0 flex-col gap-4">
      <LessonSteps
        steps={steps}
        results={results}
        shownId={shownId}
        reachable={phase === 'step' || phase === 'done' || phase === 'static' ? reachable : undefined}
        onOpen={(id) => setViewing(id === stepId && phase === 'step' ? null : id)}
      />
      {phase === 'step' && step ? (
        <>
          <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 max-lg:hidden" data-copy-for-agent="">
            <h2 className="text-sm font-semibold">Stuck on a step?</h2>
            <p className="text-xs text-muted-foreground">
              Copy this step as a prompt and ask your agent to explain it another way. Answer here afterwards.
            </p>
            <CopyButton
              text={copyPromptOf(step, step.id === stepId ? shownQuestion : null, head)}
              label="Copy for my agent"
              className="min-h-8 self-start sm:min-h-8"
              onCopy={() => run && void logCopyForAgent(run.id, step.id)}
            />
          </div>
          <WrittenFor writtenFor={head?.writtenFor} className="max-lg:hidden" short />
        </>
      ) : null}
    </div>
  );

  let body: ReactNode = null;
  if (phase === 'starting') {
    body = error ? (
      <Box state="LEARN_START" tone="warn">
        <h2 className={HEADING.card}>Your lesson did not open</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError(null);
              setTries((count) => count + 1);
            }}
            className="max-sm:min-h-11"
          >
            Try again
          </Button>
        </div>
      </Box>
    ) : (
      <Box state="LEARN_START">
        <h2 className={HEADING.card}>Opening your lesson…</h2>
      </Box>
    );
  } else if (viewing && step && run) {
    // A step passed before, read again: its blocks alone.
    body = (
      <>
        <StepArticle step={step} index={stepIndex} count={steps.length} />
        <div>
          <Button type="button" variant="outline" onClick={() => setViewing(null)} className="max-sm:min-h-11">
            {phase === 'step' ? 'Back to your step' : 'Back'}
          </Button>
        </div>
      </>
    );
  } else if (phase === 'warmup' && run) {
    const answered = answeredCountOf(warmupPicks, run.warmup);
    body = (
      <>
        <Box state="LEARN_WARMUP">
          <h2 className={HEADING.card}>The fix is ready. First, {run.warmup.length} quick questions</h2>
          <p className="text-sm text-muted-foreground">
            They show what you already know, so the lesson can skip it. A wrong answer or “I don't know yet” costs
            nothing.
          </p>
          <p className="text-sm text-muted-foreground">
            The pull request will link to your result. Per step it says whether you knew it, passed first try or needed
            more tries. It never lists the wrong answers you picked.
          </p>
        </Box>
        {run.warmup.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            label={`Warm-up ${index + 1} of ${run.warmup.length}`}
            warmup
            picked={warmupPicks[question.id] ?? []}
            onPick={(next) => setWarmupPicks((before) => ({ ...before, [question.id]: next }))}
            liked={liked.get(question.id) ?? null}
            onLike={(value) => like(question.id, value)}
            onReport={(reason) => report(question.id, reason)}
          />
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={startLesson}
            disabled={pending}
            className="h-10 px-6 font-semibold max-sm:min-h-11"
          >
            {pending ? 'Starting…' : 'Start the lesson'}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {answered} of {run.warmup.length} answered
          </span>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
        </div>
      </>
    );
  } else if (phase === 'step' && run && step) {
    const wrong = checked && !checked.correct ? checked : null;
    const right = checked?.correct ? checked : null;
    body = (
      <>
        <StepArticle step={step} index={stepIndex} count={steps.length} />
        {right ? (
          <QuestionCard
            question={right.question}
            label="Question"
            picked={right.picked}
            graded={right}
            current
            onNext={next}
            nextLabel={run.passedAt ? 'See your result' : 'Next step'}
            liked={liked.get(right.question.id) ?? null}
            onLike={(value) => like(right.question.id, value)}
            onReport={(reason) => report(right.question.id, reason)}
          />
        ) : (
          <>
            {wrong ? (
              <QuestionCard
                question={wrong.question}
                label="Question"
                picked={wrong.picked}
                graded={wrong}
                liked={liked.get(wrong.question.id) ?? null}
                onLike={(value) => like(wrong.question.id, value)}
                onReport={(reason) => report(wrong.question.id, reason)}
              />
            ) : current?.hint.length ? (
              <HintLines hint={current.hint} />
            ) : null}
            {current ? (
              <QuestionCard
                key={current.question.id}
                question={current.question}
                label={current.label}
                picked={picked}
                onPick={setPicked}
                current
                onCheck={check}
                checking={pending}
                error={error}
                liked={liked.get(current.question.id) ?? null}
                onLike={(value) => like(current.question.id, value)}
                onReport={(reason) => report(current.question.id, reason)}
                reportDrawn={start?.reportDrawn}
              />
            ) : null}
          </>
        )}
      </>
    );
  } else if (phase === 'blocked') {
    body = (
      <Box state="LEARN_BLOCKED" tone="warn">
        <h2 className={HEADING.card}>The questions need fixing</h2>
        <p className="text-sm text-muted-foreground">
          You reported every question of two steps, so this lesson cannot check what you learned. Send it back to your
          agent to write better questions; you keep the steps you passed.
        </p>
      </Box>
    );
  } else if (phase === 'done' && run) {
    body = <LessonSummary run={run} head={head} steps={steps} />;
  }

  return (
    <div className={LESSON_GRID} data-lesson-phase={phase}>
      {rail}
      <div className="flex min-w-0 flex-col gap-4">
        {body}
        {pane}
      </div>
    </div>
  );
}

/** After a reload, the hint of the last wrong answer: why the picks were not right, never which is. */
function HintLines({ hint }: { hint: readonly LessonWhy[] }) {
  return (
    <section
      className="flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning-soft p-4.5 text-sm text-warning-soft-foreground"
      data-hint=""
    >
      <span className="text-xs font-semibold tracking-wider uppercase">Your last answer</span>
      {hint.map((line) => (
        <p key={line.optionId}>
          <RichText text={line.why} />
        </p>
      ))}
    </section>
  );
}
