'use client';

import { Check, ChevronDown, ChevronRight, Star } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, type Ref, useId, useState } from 'react';

import { ShareButton } from '@/components/share/share-button';
import { Button } from '@/components/ui/button';
import { LiveStatus } from '@/components/workspace/player/live-status';
import { type PlayerCrumb, PlayerRunEnd, PlayerStrip } from '@/components/workspace/player/player-strip';
import { AnswerPart, type AnswerPartPlace } from '@/components/workspace/question/answer-part';
import type { LearnAnswer } from '@/components/workspace/question/use-learn-answer';
import { BUILD_HOME_PATH, buildProjectPath, buildStepPath } from '@/lib/build/paths';
import {
  type BuildTestAnswerRow,
  type BuildTestBox,
  type BuildTestPill,
  TEST_NAMES,
  testNextLabelOf,
  testNoteOf,
  testRuleOf,
} from '@/lib/build/test';
import type { BuildTest, BuildTestKind } from '@/lib/build/types';
import { cn } from '@/lib/utils';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import type { LearnQuestion } from '@/lib/workspace/learn-question';
import { type PlayerResult, runWordsOf } from '@/lib/workspace/player';

/*
 * The test's screens as the approved designs draw them, from plain data: the strip, one question, the result with what
 * comes now and the answers, and the pages with neither. The live page (`build-test-live.tsx`) moves them; the
 * catalogue draws each state from a fixture.
 */

/** The project a test is of, as its strip and links name it. */
export type BuildTestProject = { slug: string; name: string };

/** The strip's way back: Build, the project, then the test. */
export const testCrumbsOf = (project: BuildTestProject, kind: BuildTestKind): PlayerCrumb[] => [
  { label: 'Build', href: BUILD_HOME_PATH },
  { label: project.name, href: buildProjectPath(project.slug) },
  { label: TEST_NAMES[kind] },
];

/** The strip's right side once every question is answered: ten squares and "10 of 10 answered". */
export function TestDoneEnd({ count }: { count: number }) {
  const results: PlayerResult[] = Array.from({ length: count }, () => 'answered');
  return <PlayerRunEnd squares={results} words={runWordsOf('Question', { at: count, count, results })} />;
}

/**
 * The test's frame: the strip, then a narrow column for a question, or the reading column (860 px) for the result and
 * the pages with no question.
 */
export function TestFrame({
  project,
  kind,
  end,
  layout,
  children,
}: {
  project: BuildTestProject;
  kind: BuildTestKind;
  end?: ReactNode;
  layout: 'question' | 'page';
  children: ReactNode;
}) {
  return (
    <>
      <PlayerStrip crumbs={testCrumbsOf(project, kind)} end={end} />
      {layout === 'question' ? (
        <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:pt-10" data-build-test={kind}>
          <div className="mx-auto flex w-full max-w-[38rem] flex-col gap-4">{children}</div>
        </main>
      ) : (
        <main
          className="mx-auto flex w-full max-w-[860px] flex-col gap-8 px-4 pt-6 pb-16 sm:gap-10 sm:pt-8"
          data-build-test={kind}
        >
          {children}
        </main>
      )}
    </>
  );
}

/** While the test is read or a run starts: the card's place, of its size, so nothing moves when it comes. */
export function TestPending() {
  return (
    <div className="flex flex-col gap-4" data-test-state="pending">
      <LiveStatus className="sr-only" text="Loading your test…" />
      <div className="min-h-5" />
      <div className="h-96 animate-pulse rounded-xl border-2 bg-muted/40 motion-reduce:animate-none" />
    </div>
  );
}

/** Where a test asks: no verdict until the result; "I don't know" is picked like an option; the last one finishes. */
export function testPlace(last: boolean): AnswerPartPlace {
  const label = testNextLabelOf(last);
  return {
    verdict: false,
    extra: 'I don’t know',
    withCode: true,
    labels: { check: label, done: label },
    note: testNoteOf,
  };
}

/** One question of a run: the rule above the card, the card with no right or wrong, and the way out at its foot. */
export function TestQuestion({
  test,
  question,
  answer,
  count,
  last,
  highlighted,
  hints,
  project,
}: {
  test: Pick<BuildTest, 'kind' | 'need'>;
  question: LearnQuestion;
  answer: LearnAnswer;
  count: number;
  last: boolean;
  highlighted?: readonly HighlightedCode[];
  hints?: boolean;
  project: BuildTestProject;
}) {
  const rule = testRuleOf(test, count);
  return (
    <>
      <p className="m-0 text-sm text-muted-foreground" data-test-rule="">
        {rule.lead}
        <span className="font-semibold text-foreground">{rule.mark}</span>
        {rule.tail}
      </p>
      <AnswerPart
        question={question}
        answer={answer}
        place={testPlace(last)}
        highlighted={highlighted}
        hints={hints}
        keyLineEnd={
          <Button asChild variant="ghost" className="min-h-11 text-muted-foreground sm:min-h-9">
            <Link href={buildProjectPath(project.slug)} data-test-leave="">
              Leave and go on later
            </Link>
          </Button>
        }
      />
    </>
  );
}

/** The box under a title: one title, an aside on the right, then what it holds. */
export function TestBox({
  title,
  aside,
  titleRef,
  state,
  children,
}: {
  title: string;
  aside?: string | null;
  titleRef?: Ref<HTMLHeadingElement>;
  state?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
      aria-label="What to do now"
      data-test-box={state ?? ''}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="m-0 text-base font-semibold outline-none">
          {title}
        </h2>
        {aside ? <span className="text-sm text-muted-foreground">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

const MAIN = 'min-h-11 font-semibold sm:min-h-10';

/** A page with no question and no result: one box, its sentence and its way on. */
export function TestMessage({
  state,
  title,
  text,
  titleRef,
  children,
}: {
  state: string;
  title: string;
  text: string;
  titleRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}) {
  return (
    <TestBox title={title} titleRef={titleRef} state={state}>
      <p className="m-0 text-sm text-muted-foreground">{text}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </TestBox>
  );
}

/** "Back to the project", as the box's main button where nothing else can be done. */
export function BackToProject({ project, main = false }: { project: BuildTestProject; main?: boolean }) {
  if (main) {
    return (
      <Button asChild size="lg" className={MAIN}>
        <Link href={buildProjectPath(project.slug)}>Back to the project</Link>
      </Button>
    );
  }
  return (
    <Link href={buildProjectPath(project.slug)} className="font-medium text-link hover:underline">
      Back to the project
    </Link>
  );
}

const PILLS: Record<BuildTestPill, ReactNode> = {
  repeated: (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning-soft-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--warning)_35%,transparent)]"
      data-test-pill="repeated"
    >
      <Star className="size-3.5 fill-current text-warning" aria-hidden="true" />
      Repeated after a week
    </span>
  ),
  'every-step': (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-brand-soft-foreground"
      data-test-pill="every-step"
    >
      <Check className="size-4" aria-hidden="true" />
      Answered every step
    </span>
  ),
};

/** The box's buttons: the main one, then Share or the way back to the project. */
function BoxActions({
  box,
  project,
  goldHref,
  starting,
  onAgain,
}: {
  box: BuildTestBox;
  project: BuildTestProject;
  goldHref: Route;
  starting: boolean;
  onAgain: () => void;
}) {
  const { main } = box;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {main.kind === 'project' ? (
        <Button asChild size="lg" className={MAIN}>
          <Link href={buildProjectPath(project.slug)}>Open the project</Link>
        </Button>
      ) : main.kind === 'gold' ? (
        <Button asChild size="lg" className={MAIN}>
          <Link href={goldHref}>Take the gold test</Link>
        </Button>
      ) : main.ready ? (
        <Button
          type="button"
          size="lg"
          className={MAIN}
          aria-busy={starting || undefined}
          aria-disabled={starting || undefined}
          onClick={starting ? undefined : onAgain}
          data-test-again=""
        >
          {main.label}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn(MAIN, 'cursor-default opacity-55 hover:bg-background')}
          aria-disabled
          data-test-again="later"
        >
          {main.label}
        </Button>
      )}
      {box.share ? (
        <ShareButton href={buildProjectPath(project.slug)} title={project.name} className={MAIN} />
      ) : (
        <BackToProject project={project} />
      )}
    </div>
  );
}

/** One answer of the result: the question, what was picked, the right answer, the reason, and its step. */
function AnswerRow({ row, project }: { row: BuildTestAnswerRow; project: BuildTestProject }) {
  const text = cn(row.mono && 'font-mono');
  return (
    <li
      className="flex flex-col gap-2 border-t p-4"
      data-test-answer={row.number}
      data-right={row.isRight || undefined}
    >
      <div className="flex items-baseline gap-3">
        <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {row.number}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold">{row.prompt}</span>
      </div>
      <div className="flex flex-col gap-1.5 pl-8">
        {row.isRight ? null : (
          <p className="m-0 text-sm" data-test-picked="">
            <span className="text-muted-foreground">{row.picked === null ? 'You said:' : 'You picked:'}</span>{' '}
            <span className={cn('text-destructive', row.picked !== null && text)}>{row.picked ?? 'I don’t know'}</span>
          </p>
        )}
        <p className="m-0 text-sm" data-test-right="">
          <span className="text-muted-foreground">{row.isRight ? 'You picked:' : 'Right:'}</span>{' '}
          <span className={cn('font-medium text-positive', text)}>{row.right}</span>
        </p>
        {row.why ? <p className="m-0 text-sm text-muted-foreground">{row.why}</p> : null}
        <p className="m-0 text-sm">
          <Link href={buildStepPath(project.slug, row.step.slug)} className="font-medium text-link hover:underline">
            Step {row.step.number}: {row.step.title}
          </Link>
        </p>
      </div>
    </li>
  );
}

/** The answers: the wrong ones first and open, the right ones folded into one row that opens in place. */
export function TestAnswers({
  wrong,
  right,
  project,
  openRight = false,
}: {
  wrong: readonly BuildTestAnswerRow[];
  right: readonly BuildTestAnswerRow[];
  project: BuildTestProject;
  /** The right ones opened, for the catalogue. */
  openRight?: boolean;
}) {
  const [open, setOpen] = useState(openRight);
  const titleId = useId();
  const listId = useId();
  return (
    <section className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="m-0 text-xl font-bold tracking-tight">
        Your answers
      </h2>
      {wrong.length ? (
        <div className="flex flex-col rounded-lg border bg-card" data-test-wrong="">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-3">
            <h3 className="m-0 text-base font-semibold">{wrong.length} to look at again</h3>
            <span className="text-sm text-muted-foreground">Each with its reason and the step it comes from</span>
          </div>
          <ol className="m-0 list-none p-0">
            {wrong.map((row) => (
              <AnswerRow key={row.number} row={row} project={project} />
            ))}
          </ol>
        </div>
      ) : null}
      {right.length ? (
        <div className="flex flex-col rounded-lg border bg-card" data-test-right-list="">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((now) => !now)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-3 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="text-muted-foreground">
              {open ? (
                <ChevronDown className="size-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-4" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-base font-semibold">{right.length} you got right</span>
            <span className="text-sm text-muted-foreground">{open ? 'Hide them' : 'Show them'}</span>
          </button>
          <ol id={listId} hidden={!open} className="m-0 list-none p-0">
            {right.map((row) => (
              <AnswerRow key={row.number} row={row} project={project} />
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/** The result, one column: the score and what it means, the box with what comes now, then the answers. */
export function TestResult({
  title,
  passed,
  text,
  box,
  project,
  goldHref,
  wrong,
  right,
  titleRef,
  starting = false,
  startFailed = false,
  onAgain,
  openRight,
}: {
  title: string;
  passed: boolean;
  text: string;
  box: BuildTestBox;
  project: BuildTestProject;
  goldHref: Route;
  wrong: readonly BuildTestAnswerRow[];
  right: readonly BuildTestAnswerRow[];
  titleRef?: Ref<HTMLHeadingElement>;
  starting?: boolean;
  startFailed?: boolean;
  onAgain: () => void;
  openRight?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-5" data-test-state={passed ? 'passed' : 'failed'}>
        <div className="flex flex-col gap-2">
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="m-0 text-3xl font-bold tracking-tight text-balance outline-none"
            data-test-score=""
          >
            {passed ? (
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 shrink-0 text-positive" aria-hidden="true" />
                {title}
              </span>
            ) : (
              title
            )}
          </h1>
          <p className="m-0 text-base leading-relaxed">{text}</p>
        </div>
        <TestBox title={box.title} aside={box.aside}>
          {box.pills.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {box.pills.map((pill) => (
                <span key={pill} className="contents">
                  {PILLS[pill]}
                </span>
              ))}
            </div>
          ) : null}
          {box.text ? <p className="m-0 text-sm text-muted-foreground">{box.text}</p> : null}
          <BoxActions box={box} project={project} goldHref={goldHref} starting={starting} onAgain={onAgain} />
          {startFailed ? (
            <p className="m-0 text-sm text-warning-soft-foreground" role="alert" data-test-start-failed="">
              <b className="font-semibold">It did not start.</b> Try again in a minute.
            </p>
          ) : null}
        </TestBox>
      </div>
      <TestAnswers wrong={wrong} right={right} project={project} openRight={openRight} />
    </>
  );
}
