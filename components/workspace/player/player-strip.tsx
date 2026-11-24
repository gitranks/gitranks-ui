import type { Route } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { PlayerSquare } from '@/lib/workspace/player';

/** A step of the strip’s way back: a link, plain words where there is no page to go to, or the page itself (the last). */
export type PlayerCrumb = { label: string; href?: Route };

const SQUARE: Record<PlayerSquare, string> = {
  right: 'bg-positive',
  wrong: 'bg-warning',
  answered: 'bg-muted-foreground',
  current: 'border-2 border-primary',
  waiting: 'border-[1.5px] border-border',
};

/** The squares of a run: one for each question, how each went, the current one ringed. */
export function PlayerSquares({ squares }: { squares: readonly PlayerSquare[] }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true" data-player-squares="">
      {squares.map((square, index) => (
        // Squares never move: the index is the question.
        <span key={index} className={cn('inline-block size-3 rounded-[3px]', SQUARE[square])} data-square={square} />
      ))}
    </span>
  );
}

/**
 * The player's strip, under the site's header: the way back on the left (Learn, the course, the place), and on the
 * right where the run stands, when there is one. It keeps its height, so the page does not move as it fills.
 */
export function PlayerStrip({ crumbs, end }: { crumbs: readonly PlayerCrumb[]; end?: ReactNode }) {
  return (
    <div className="border-b bg-background" data-player-strip="">
      <div className="mx-auto flex min-h-11 w-full max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2.5">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          {crumbs.map((crumb, index) => (
            <Fragment key={`${crumb.label}-${index}`}>
              {index ? <span aria-hidden="true">/</span> : null}
              {index < crumbs.length - 1 ? (
                crumb.href ? (
                  <Link href={crumb.href} className="whitespace-nowrap hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="whitespace-nowrap">{crumb.label}</span>
                )
              ) : (
                <span className="font-medium whitespace-nowrap text-foreground" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
        {end}
      </div>
    </div>
  );
}

/** The strip's right side for a run: its squares, then "Lesson 3 of 6", the number in mono. */
export function PlayerRunEnd({
  squares,
  words,
}: {
  squares?: readonly PlayerSquare[];
  /** The words after the squares, the number set apart; none when the words need no number. */
  words: { lead: string; number: number | null; tail: string };
}) {
  return (
    <span className="flex items-center gap-3 text-sm text-muted-foreground" data-player-run="">
      {squares?.length ? <PlayerSquares squares={squares} /> : null}
      <span>
        {words.lead}
        {words.number === null ? null : (
          <span className="font-mono font-semibold text-foreground tabular-nums">{words.number}</span>
        )}
        {words.tail}
      </span>
    </span>
  );
}
