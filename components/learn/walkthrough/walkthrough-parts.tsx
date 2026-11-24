import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { LessonBlock } from '@/components/workspace/blocks/lesson-block';
import type { PlayerCrumb } from '@/components/workspace/player/player-strip';
import { LEARN_FIXES_PAGE_BUILT } from '@/lib/learn/built-pages';
import { hasLearnView, type LearnFixPage } from '@/lib/learn/fix-page';
import { LEARN_HOME_PATH, LEARN_ISSUES_PATH, learnFixPath, learnLessonPath } from '@/lib/learn/paths';
import { questionsWordsOf, type Walkthrough } from '@/lib/learn/walkthrough';
import type { LessonBlock as Block } from '@/lib/workspace/blocks/block.types';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/*
 * The pieces every page of a fix's walkthrough draws the same: the line of facts and the title, one part of the
 * change, the box about the fix, and the pages with nothing to answer (not open, removed). None reads anything.
 */

/** The walkthrough's two columns: the part on the left, its question on the right (one column on a phone). */
export const WALKTHROUGH_GRID = 'grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-10';

/** The page under the strip. */
export const WALKTHROUGH_MAIN = 'mx-auto w-full max-w-7xl px-4 pt-8 pb-16';

const CHIP =
  'inline-flex h-6 items-center gap-1 rounded-md border bg-card px-1.5 font-mono text-xs text-foreground hover:bg-muted max-sm:min-h-11';

const github = (path: string) => `https://github.com/${path}`;

/** The way back to a fix's walkthrough: Learn, the lesson it used (or Issues), the walkthrough. */
export function walkthroughCrumbsOf(
  walkthrough: Pick<Walkthrough, 'lesson'> | null,
  walkthroughHref?: Route,
): PlayerCrumb[] {
  const lesson = walkthrough?.lesson;
  return [
    { label: 'Learn', href: LEARN_HOME_PATH },
    lesson ? { label: lesson.title, href: learnLessonPath(lesson.slug) } : { label: 'Issues', href: LEARN_ISSUES_PATH },
    { label: 'A fix walkthrough', href: walkthroughHref },
  ];
}

/** "Fix walkthrough", the pill that names the page. */
export const FixPill = () => (
  <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
    Fix walkthrough
  </span>
);

/** What the line of facts names: the repository, the issue, the pull request once open, the language, who fixed it. */
export type WalkthroughFacts = {
  repo: string;
  issueNumber: number;
  /** The pull request's number; null before it opens. */
  number: number | null;
  language: string | null;
  /** Who fixed it; null on the fixer's own run. */
  fixer: string | null;
  title: string;
};

/** The facts of a public walkthrough, as the head draws them. */
export const factsOf = (walkthrough: Walkthrough): WalkthroughFacts => ({
  repo: walkthrough.repo,
  issueNumber: walkthrough.issueNumber,
  number: walkthrough.number,
  language: walkthrough.language,
  fixer: walkthrough.fixer,
  title: walkthrough.title.trim() || `${walkthrough.repo} #${walkthrough.issueNumber}`,
});

/** The line of facts over the title, and the title (the page's one h1). */
export function WalkthroughHead({ facts }: { facts: WalkthroughFacts }) {
  return (
    <header className="flex flex-col gap-3" data-walkthrough-head="">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <FixPill />
        <span className="font-medium break-all text-foreground">{facts.repo}</span>
        <a
          className={CHIP}
          href={github(`${facts.repo}/issues/${facts.issueNumber}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Issue #{facts.issueNumber}
          <span aria-hidden="true">↗</span>
        </a>
        {facts.number ? (
          <a
            className={CHIP}
            href={github(`${facts.repo}/pull/${facts.number}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            PR #{facts.number}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        {facts.language ? <span>{facts.language}</span> : null}
        {facts.fixer ? (
          <span>
            fixed by{' '}
            <a
              className="font-medium text-foreground hover:underline"
              href={github(facts.fixer)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {facts.fixer}
            </a>
          </span>
        ) : null}
      </div>
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance">{facts.title}</h1>
    </header>
  );
}

/** A part's heading's id: the index, since a part's own id is the API's and may hold anything. */
export const partHeadingIdOf = (index: number) => `walkthrough-part-${index + 1}`;

/** One part of the change: "Part 2 of 4", its heading, then its blocks in order. */
export function WalkthroughPartArticle({
  heading,
  blocks,
  index,
  count,
}: {
  heading: string;
  blocks: readonly Block[];
  index: number;
  count: number;
}) {
  const headingId = partHeadingIdOf(index);
  return (
    <article className="flex min-w-0 flex-col gap-4" aria-labelledby={headingId} data-walkthrough-part={index + 1}>
      <p className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Part {index + 1} of {count}
      </p>
      <h2 id={headingId} tabIndex={-1} className="m-0 text-xl font-semibold outline-none">
        {heading || `Part ${index + 1}`}
      </h2>
      {blocks.map((block, at) => (
        // Blocks never move: the index is the block.
        <LessonBlock key={at} block={block} id={`${headingId}-block-${at + 1}`} />
      ))}
    </article>
  );
}

/** How the fix stands, as far as its own page goes: made with Learn or not, and merged, open or closed. */
export type FixPageStand = Pick<LearnFixPage, 'made' | 'state'>;

/**
 * The walkthrough's way to the fix's own page, worded for what is there: "Learn from it" (the change, and a signed-in
 * person's similar issues) while the fix has it, "How it was made" for one closed without a merge. None while it is
 * not known how the fix stands, so no button promises a page it cannot show.
 */
export function fixPageLinkOf(pr: PrRef, fix: FixPageStand | null): { text: string; href: Route } | null {
  if (!LEARN_FIXES_PAGE_BUILT || fix?.made !== 'LEARN') return null;
  return hasLearnView(fix)
    ? { text: 'The change and similar issues', href: learnFixPath(pr) }
    : { text: 'How the fix was made', href: prTimelinePath(pr) };
}

/**
 * Under a public walkthrough's question: who fixed it and how, the lesson it used, and the fix's own page (`fix`, how
 * it stands, from its own read) when it is known.
 */
export function AboutThisFix({ walkthrough, fix = null }: { walkthrough: Walkthrough; fix?: FixPageStand | null }) {
  const pr = { nameWithOwner: walkthrough.repo, number: walkthrough.number };
  const page = fixPageLinkOf(pr, fix);
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-about-fix="">
      <h2 className="m-0 text-base font-semibold">About this fix</h2>
      <p className="m-0 text-sm text-muted-foreground">
        {walkthrough.fixer} fixed this issue in {walkthrough.repo}, then answered these{' '}
        {questionsWordsOf(walkthrough.parts.length)} before the pull request opened.
      </p>
      {walkthrough.lesson || page ? (
        <div className="flex flex-wrap gap-2">
          {walkthrough.lesson ? (
            <Button asChild variant="outline" className="h-8 max-w-full px-3 text-[13px] max-sm:min-h-11">
              <Link href={learnLessonPath(walkthrough.lesson.slug)} prefetch={false}>
                <span className="truncate">The lesson it used: {walkthrough.lesson.title}</span>
              </Link>
            </Button>
          ) : null}
          {page ? (
            <Button asChild variant="outline" className="h-8 px-3 text-[13px] max-sm:min-h-11">
              <Link href={page.href} prefetch={false} data-fix-page-link="">
                {page.text}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="m-0 border-t pt-3 text-xs text-muted-foreground">
        Written by the fixer’s agent, checked by GitRanks
      </p>
    </section>
  );
}

/** A way on from a page with nothing to answer: a page of ours, or GitHub. */
export type FixStateAction = { label: string; href: string; external?: boolean };

/** A page with nothing to answer: what the address was, its state as the title, one sentence, and a way on. */
export function FixStateView({
  state,
  eyebrow,
  title,
  lead,
  action,
  children,
}: {
  state: string;
  eyebrow: string;
  title: string;
  lead: string;
  action?: FixStateAction | null;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 pt-16 pb-24" data-fix-state={state}>
      <p className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</p>
      <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="m-0 text-lg text-muted-foreground">{lead}</p>
      {children}
      {action ? (
        <Button asChild variant="outline" className="h-9 max-w-full px-4 max-sm:min-h-11">
          {action.external ? (
            <a href={action.href} target="_blank" rel="noopener noreferrer">
              <span className="truncate">{action.label}</span>
            </a>
          ) : (
            <Link href={action.href as Route} prefetch={false}>
              <span className="truncate">{action.label}</span>
            </Link>
          )}
        </Button>
      ) : null}
    </main>
  );
}

/** The pull request on GitHub, as a page with nothing to answer links it. */
export const githubPrActionOf = (repo: string, number: number): FixStateAction => ({
  label: `Open ${repo} #${number} on GitHub`,
  href: github(`${repo}/pull/${number}`),
  external: true,
});

/** A fix whose pages were removed: the pull request itself stays on GitHub. */
export const FixRemovedView = ({ repo, number }: { repo: string; number: number }) => (
  <FixStateView
    state="removed"
    eyebrow="A pull request sent through GitRanks"
    title="This page was removed"
    lead="GitRanks no longer shows how this pull request was made. The pull request itself is on GitHub."
    action={githubPrActionOf(repo, number)}
  />
);
