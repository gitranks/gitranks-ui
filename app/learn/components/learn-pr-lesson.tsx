import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { avatarOf } from './lesson-header';
import { ResultReactions } from './result-reactions';
import { GithubAvatar } from '@/app/components/landing/landing-ui';
import { WrittenFor } from '@/components/learn/written-for';
import { buttonVariants } from '@/components/ui/button';
import type { LessonResultPage } from '@/lib/learn/learn.types';
import { lessonPath, lessonResultPath } from '@/lib/learn/learn-path';
import { resultFiguresOf } from '@/lib/learn/lesson-public';
import type { PrLessonRead } from '@/lib/learn/pr-lesson';
import { cn } from '@/lib/utils';
import type { ContributePrCard } from '@/lib/workspace/contribute.types';
import { fullDayLabel } from '@/lib/workspace/maintainers-format';
import { prUrlOf } from '@/lib/workspace/pr-feedback';

const CHIP = 'inline-flex items-center rounded-md border bg-card px-2 py-0.5 font-mono text-xs hover:underline';

/** The pull request as two chips, its repository and its number, both to GitHub. */
function PrChips({ card }: { card: ContributePrCard }) {
  const url = prUrlOf(card);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <a href={`https://github.com/${card.nameWithOwner}`} target="_blank" rel="noopener noreferrer" className={CHIP}>
        {card.nameWithOwner}
      </a>
      <a href={url} target="_blank" rel="noopener noreferrer" className={CHIP}>
        #{card.number} ↗<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

/** The figures under the author's line: first try, known before, minutes, the day. */
function resultFactsOf(result: LessonResultPage): string[] {
  const figures = resultFiguresOf(result);
  return [
    figures.firstTry ? `${figures.firstTry} first try` : null,
    figures.knew ? `${figures.knew} known before` : null,
    `${result.minutes} min`,
    fullDayLabel(result.passedAt),
  ].filter((fact): fact is string => !!fact);
}

const CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-5';

/** At the top of the page, before anything is explained: the pull request the footer link came from. No actions. */
export function PrContext({ card }: { card: ContributePrCard }) {
  return (
    <section
      aria-label="The pull request you came from"
      data-pr-context={card.attemptId}
      className="flex flex-col gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4"
    >
      <span className="text-xs text-muted-foreground">You came here from this pull request</span>
      {card.title ? <span className="font-semibold text-balance break-words">{card.title}</span> : null}
      <PrChips card={card} />
    </section>
  );
}

/**
 * After "What that means": the pull request's lesson with the author's result and the ways to both, then "Did this
 * help?". A lesson not public now is one neutral line, with no feedback.
 */
export function PrLesson({ read }: { read: PrLessonRead }) {
  if (read.kind === 'closed') {
    return (
      <section aria-labelledby="pr-lesson" className={CARD} data-pr-lesson-closed={read.card.attemptId}>
        <h2 id="pr-lesson" className="text-lg font-semibold">
          This pull request’s lesson
        </h2>
        <p className="text-sm text-muted-foreground">It is not public right now.</p>
      </section>
    );
  }
  const { card, result, viewer } = read;
  const { head, login } = result;
  const figures = resultFiguresOf(result);
  return (
    <>
      <section aria-labelledby="pr-lesson" className={CARD} data-pr-lesson={card.attemptId}>
        <h2 id="pr-lesson" className="text-lg font-semibold">
          This pull request’s lesson
        </h2>
        <p className="text-sm text-muted-foreground">
          The lesson {login} took on this change before they could submit it, and how they did. Anyone can read both.
        </p>
        <div className="flex flex-col gap-1">
          <Link
            href={lessonPath(head.slug)}
            prefetch={false}
            className="text-base font-semibold text-balance hover:underline"
          >
            {head.title}
          </Link>
          <WrittenFor writtenFor={head.writtenFor} author />
        </div>
        <div className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5">
          <GithubAvatar url={avatarOf(login)} size={32} className="border" />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm">
              <span className="font-semibold">{login}</span> passed{' '}
              <span className="font-mono font-semibold tabular-nums">
                {figures.passed} of {figures.total}
              </span>{' '}
              steps
            </span>
            <span className="text-xs text-muted-foreground">{resultFactsOf(result).join(' · ')}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={lessonPath(head.slug)}
            prefetch={false}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-10 px-4 font-semibold max-sm:min-h-11 max-sm:w-full',
            )}
          >
            Read the lesson
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link
            href={lessonResultPath(head.slug, login)}
            prefetch={false}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-10 px-4 font-semibold max-sm:min-h-11 max-sm:w-full',
            )}
          >
            See {login}’s result
          </Link>
        </div>
      </section>
      <ResultReactions
        slug={head.slug}
        login={login}
        repo={card.nameWithOwner}
        pr={card.number}
        reactions={result.reactions}
        canReact={viewer.canReact}
        mine={viewer.mine}
        returned={viewer.returned}
        prompt={viewer.prompt}
        own={viewer.own}
        author
        report={false}
        from={card.attemptId}
      />
    </>
  );
}
