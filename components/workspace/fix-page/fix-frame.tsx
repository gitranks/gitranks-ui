import { ArrowLeft } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { RefChips } from '@/components/workspace/ref-chips';
import { cn } from '@/lib/utils';
import type { FixByline, FixChange, FixStatePill } from '@/lib/workspace/pr-timeline-made';

/*
 * The frame both views of a fix share: the row with the way back and the two views, which stays at the
 * top of the window, and the issue card. Then the view's own part, and the foot. Every address comes in as a prop:
 * the frame knows neither product.
 */

/** The page's column: one column on every screen, as both boards draw it. */
export const FIX_PAGE_MAIN = 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-4 pb-16';

export type FixView = 'learn' | 'made';

/** "← Issues", then "Learn from it" and "How it was made"; the switch is left out for a pull request with one view. */
export function FixViewRow({
  back,
  views,
  current,
}: {
  back: { label: string; href: Route } | null;
  views: Record<FixView, Route> | null;
  current: FixView;
}) {
  if (!back && !views) return null;
  const tab = (view: FixView, label: string) => (
    <Link
      href={views?.[view] ?? '#'}
      prefetch={false}
      aria-current={view === current ? 'page' : undefined}
      data-fix-view={view}
      className={cn(
        'inline-flex h-8 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors max-sm:min-h-11',
        view === current
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
  return (
    <div
      className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      data-fix-row=""
    >
      {back ? (
        <Link
          href={back.href}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline max-sm:min-h-11"
          data-fix-back=""
        >
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          {back.label}
        </Link>
      ) : (
        <span />
      )}
      {views ? (
        <nav aria-label="Views of this pull request" className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {tab('learn', 'Learn from it')}
          {tab('made', 'How it was made')}
        </nav>
      ) : null}
    </div>
  );
}

const PILL_TONE: Record<FixStatePill['tone'], string> = {
  positive: 'bg-positive/10 text-positive-strong',
  brand: 'bg-brand-soft text-brand-soft-foreground',
  muted: 'bg-muted text-muted-foreground',
};

/** The issue card: the repository, the issue and the pull request, the state, the title and who made it. */
export function FixIssueCard({
  repo,
  issue,
  pr,
  title,
  pill,
  byline,
  stopped = false,
}: {
  repo: string;
  issue: number;
  pr: { number: number; url: string };
  title: string;
  pill: FixStatePill;
  byline: FixByline;
  /** A maintainer stopped GitRanks work on it: one line under the card says so. */
  stopped?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:p-6" data-fix-card="">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <RefChips repo={repo} issue={issue} pr={pr} />
        <span
          className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', PILL_TONE[pill.tone])}
          data-fix-state={pill.tone}
        >
          {pill.text}
        </span>
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-pretty break-words">{title}</h1>
      <p className="m-0 text-sm text-muted-foreground" data-fix-byline="">
        {byline.before}
        {byline.login ? (
          <>
            {' '}
            <Link
              href={`/profile/${encodeURIComponent(byline.login)}` as Route}
              prefetch={false}
              className="font-medium text-foreground hover:underline"
            >
              {byline.login}
            </Link>
            {byline.after.startsWith('’') ? '' : ' '}
          </>
        ) : (
          ' '
        )}
        {byline.after}
      </p>
      {stopped ? (
        <p className="m-0 border-t pt-3 text-sm text-muted-foreground" data-stopped="">
          A maintainer stopped GitRanks work on this pull request. It stays as it is on GitHub.
        </p>
      ) : null}
    </header>
  );
}

/** The change: the agent's own words on the fix, its numbers, and the diff on GitHub. */
export function FixChangeCard({ change }: { change: FixChange }) {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
      aria-labelledby="fix-change"
      data-fix-change=""
    >
      <h2 id="fix-change" className="m-0 text-base font-semibold">
        The change
      </h2>
      {change.text ? <p className="m-0 text-sm break-words">{change.text}</p> : null}
      {change.pills.length ? (
        <div className="flex flex-wrap gap-2">
          {change.pills.map((pill) => (
            <span
              key={pill}
              className="rounded-full bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground tabular-nums"
            >
              {pill}
            </span>
          ))}
        </div>
      ) : null}
      <a
        href={change.diffUrl}
        target="_blank"
        rel="noreferrer"
        className="self-start text-sm font-medium text-link hover:underline"
      >
        See the diff on GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}

/** Under both views: the page's Markdown copy and how the product works. */
export function FixFoot({ markdownHref, about }: { markdownHref: string; about: { text: string; href: Route } }) {
  return (
    <p className="m-0 text-xs text-muted-foreground" data-fix-foot="">
      {/* A route handler's answer, not a page: a plain link. */}
      <a href={markdownHref} className="hover:underline">
        Markdown version
      </a>
      {' · '}
      <Link href={about.href} prefetch={false} className="hover:underline">
        {about.text}
      </Link>
    </p>
  );
}

/** The two views' page: the row, the issue card, the view's own part and the foot. */
export function FixPageFrame({ row, card, children }: { row: ReactNode; card: ReactNode; children: ReactNode }) {
  return (
    <main className={FIX_PAGE_MAIN}>
      {row}
      {card}
      {children}
    </main>
  );
}
