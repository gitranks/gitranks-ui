import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { LearnViewReport } from './learn-view-report';
import { StepArticle } from './lesson-flow';
import { avatarOf, LessonEyebrow, LessonMeta } from './lesson-header';
import { LESSON_MAIN } from './lesson-page';
import { LessonStubScreen } from './lesson-stub';
import { Figure } from './lesson-summary';
import { QuestionCard } from './question-card';
import { ResultReactions } from './result-reactions';
import { GithubAvatar } from '@/app/components/landing/landing-ui';
import { HEADING, Pill } from '@/app/contribute/components/primitives';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { fullDayLabel } from '@/lib/contribute/maintainers-format';
import type {
  LessonQuestion,
  LessonQuestionKeyed,
  LessonReaction,
  LessonResultPage,
  LessonStepResult,
} from '@/lib/learn/learn.types';
import { LEARN_MAINTAINERS_PATH, lessonPath, lessonResultPath, reactionParamOf } from '@/lib/learn/learn-path';
import {
  askedByStepOf,
  isAuthorOf,
  passesShown,
  pullRequestOf,
  resultFiguresOf,
  resultRowsOf,
} from '@/lib/learn/lesson-public';
import { loadLessonResult, loadMyResultReaction } from '@/lib/learn/lesson-public.data';
import { stepResultLabel } from '@/lib/learn/question';
import { hasReactionMark } from '@/lib/learn/react-mark';

const CARD = 'flex flex-col gap-2 rounded-xl border bg-card p-4.5';

/** A step's result as a badge: green for a first try, plain for more tries, grey for known before. */
function ResultBadge({ result }: { result: LessonStepResult }) {
  const label = stepResultLabel(result);
  switch (result.state) {
    case 'FIRST_TRY':
      return <Pill tone="green">{label}</Pill>;
    case 'TRY_N':
      return <Badge variant="outline">{label}</Badge>;
    case 'KNEW':
      return <Badge variant="secondary">{label}</Badge>;
    case 'REPORTED':
      return <Pill tone="amber">{label}</Pill>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

/** Per step: knew it before, passed first try, passed on try N, question reported. Never an option picked. */
function WhatTheyLearned({ result }: { result: LessonResultPage }) {
  const figures = resultFiguresOf(result);
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-result-steps="">
      <div className="flex flex-col gap-1">
        <h2 className={HEADING.card}>What {result.login} learned</h2>
        <p className="text-sm text-muted-foreground">
          One question per step. A step counts as known before when the warm-up question on it was answered right.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Figure value={`${figures.passed} of ${figures.total}`} label="steps passed" />
        <Figure value={String(figures.knew)} label="known before" />
        <Figure value={String(figures.firstTry)} label="passed first try" />
        {figures.moreTries ? (
          <Figure
            value={String(figures.moreTries)}
            label={figures.sameTries ? `needed ${figures.sameTries} tries` : 'needed more tries'}
          />
        ) : null}
        {figures.reported ? (
          <Figure
            value={String(figures.reported)}
            label={figures.reported === 1 ? 'question reported' : 'questions reported'}
          />
        ) : null}
      </dl>
      <ul className="flex flex-col divide-y rounded-lg border">
        {resultRowsOf(result).map((row) => (
          <li
            key={row.stepId}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
            data-step={row.stepId}
            data-state={row.result.state}
          >
            <span className="flex min-w-0 flex-col">
              <span className="font-semibold">
                {row.index + 1} · {row.parts}
              </span>
              <span className="text-xs text-muted-foreground">{row.title}</span>
            </span>
            <ResultBadge result={row.result} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A keyed question as a taker's card draws it after a right answer: every option, the right ones marked, each why. */
function KeyedQuestion({ question, label }: { question: LessonQuestionKeyed; label: string }) {
  const plain: LessonQuestion = {
    ...question,
    options: question.options.map(({ id, text }) => ({ id, text })),
  };
  const right = question.options.filter((option) => option.correct).map((option) => option.id);
  const why = question.options.map((option) => ({ optionId: option.id, correct: option.correct, why: option.why }));
  return <QuestionCard question={plain} label={label} picked={right} graded={{ correct: true, why }} />;
}

/** Every step, and under it the questions this run was asked on it, with their answers. */
function LessonWithAnswers({ result }: { result: LessonResultPage }) {
  const asked = askedByStepOf(result.asked);
  return (
    <>
      <h2 className={`pt-2 ${HEADING.section}`}>
        {result.asked.length ? 'The lesson, with the answers' : 'The lesson'}
      </h2>
      {result.steps.map((step, index) => (
        <div key={step.id} className="flex flex-col gap-4">
          <StepArticle step={step} index={index} count={result.steps.length} />
          {(asked.get(step.id) ?? []).map((question, at, all) => (
            <KeyedQuestion
              key={question.id}
              question={question}
              label={`Question · step ${index + 1}${all.length > 1 ? ` · try ${at + 1}` : ''}`}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function WhatThisPageIs({ result }: { result: LessonResultPage }) {
  const pr = pullRequestOf(result.head);
  const author = isAuthorOf(result.head, result.login);
  const fix = pr ? `the fix in pull request #${pr.number}` : 'the fix';
  return (
    <section className={CARD}>
      <h2 className={HEADING.block}>What this page is</h2>
      <p className="text-sm text-muted-foreground">
        {author
          ? `An AI agent wrote ${fix}. Before ${result.login} could submit it, they took this lesson on the change.`
          : `An AI agent wrote ${fix}, and a lesson on the change. ${result.login} took that lesson and passed it.`}
      </p>
      <p className="text-sm text-muted-foreground">
        The result comes from gitranks.com's own record, tied to {result.login}'s GitHub sign-in.{' '}
        {author ? 'The author cannot edit it.' : 'They cannot edit it.'}
      </p>
      <Link href={LEARN_MAINTAINERS_PATH} prefetch={false} className="text-sm font-semibold text-link hover:underline">
        How GitRanks Learn works
      </Link>
    </section>
  );
}

function TakeItYourself({ result }: { result: LessonResultPage }) {
  const { passes, slug } = result.head;
  return (
    <section className={CARD}>
      <h2 className={HEADING.block}>Take it yourself</h2>
      <p className="text-sm text-muted-foreground">
        {passesShown(passes) ? (
          <>
            <span className="font-mono font-semibold text-foreground tabular-nums">{passes}</span> people passed this
            lesson.
          </>
        ) : (
          'Anyone can read every step. Sign in with GitHub to answer.'
        )}
      </p>
      <Link
        href={lessonPath(slug)}
        prefetch={false}
        className={`${buttonVariants({ variant: 'outline' })} self-start max-sm:min-h-11`}
      >
        Open the lesson
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}

/** What the result page knows of its visitor's reaction: whether they can store one, theirs, and a pick back from the sign-in. */
export type ResultViewer = {
  canReact: boolean;
  mine: LessonReaction | null;
  returned: LessonReaction | null;
  /** The sign-in prompt, drawn open (the catalogue's board). */
  prompt?: LessonReaction | null;
};

/**
 * A result page (`/learn/lessons/<slug>/passes/<login>`, the link in the pull request): the result per step, the lesson
 * with the questions that run was asked and their answers, what the page is, the reactions, and the lesson to take.
 * Its facts come from GitRanks' own record of the run, which the person cannot edit.
 */
export function LessonResultScreen({ result, viewer }: { result: LessonResultPage; viewer: ResultViewer }) {
  const { head } = result;
  return (
    <main className={LESSON_MAIN} data-lesson-result={head.slug} data-login={result.login}>
      <LearnViewReport source="result_opened" lesson={head.slug} />
      <header className="flex flex-col gap-3">
        <LessonEyebrow tag="Passed" text="GitRanks Learn · lesson result" />
        <h1 className={`flex flex-wrap items-center gap-3 ${HEADING.page}`}>
          <GithubAvatar url={avatarOf(result.login)} size={36} className="border" />
          {result.login} passed this lesson
        </h1>
        <Link
          href={lessonPath(head.slug)}
          prefetch={false}
          className="max-w-prose self-start text-lg text-foreground/80 hover:underline"
        >
          {head.title}
        </Link>
        <LessonMeta head={head}>
          <span>
            {fullDayLabel(result.passedAt)} · <span className="font-mono tabular-nums">{result.minutes} min</span> ·
            lesson version {result.version}
          </span>
        </LessonMeta>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <WhatTheyLearned result={result} />
          <LessonWithAnswers result={result} />
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <ResultReactions
            slug={head.slug}
            login={result.login}
            repo={head.subject.repo}
            pr={head.subject.pr}
            reactions={result.reactions}
            canReact={viewer.canReact}
            mine={viewer.mine}
            returned={viewer.returned}
            prompt={viewer.prompt}
          />
          <WhatThisPageIs result={result} />
          <TakeItYourself result={result} />
        </aside>
      </div>
    </main>
  );
}

/**
 * The page's reads: the result, the same for everyone; a renamed login goes to the account's current one; and, with
 * the light GitHub sign-in, the visitor's reaction. No public passed run, or a hidden lesson, is a 404 (`not-found.tsx`);
 * a removed lesson its stub.
 */
export async function LessonResultView({
  slug,
  login,
  react,
}: {
  slug: string;
  login: string;
  react: string | string[] | undefined;
}) {
  const answer = await loadLessonResult(slug, login);
  if (!answer || (answer.kind === 'stub' && answer.visibility === 'HIDDEN')) notFound();
  if (answer.kind === 'stub') return <LessonStubScreen visibility={answer.visibility} />;
  const result = answer.value;
  if (result.login !== login) redirect(lessonResultPath(result.head.slug, result.login));

  // A pick back from the sign-in this browser started for this page; `?react=` on a link alone picks nothing.
  const pick = reactionParamOf(react);
  const returned = pick && (await hasReactionMark(result.head.slug, result.login, pick)) ? pick : null;
  const { canReact, reaction } = await loadMyResultReaction(result.head.slug, result.login);
  return <LessonResultScreen result={result} viewer={{ canReact, mine: reaction, returned }} />;
}
