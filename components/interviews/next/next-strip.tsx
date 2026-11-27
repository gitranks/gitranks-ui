import type { Route } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';

import type { NextStrip as NextStripState } from '@/lib/interviews/next';
import { INTERVIEWS_HOME_PATH, interviewPlanPath } from '@/lib/interviews/paths';
import type { InterviewPlanPage } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/** A part's square: learned, or not yet. */
const SQUARE = {
  done: 'bg-[color-mix(in_oklch,var(--primary)_28%,var(--muted))]',
  open: 'bg-muted',
} as const;

type Crumb = { label: string; href?: Route };

function Crumbs({ crumbs, className }: { crumbs: readonly Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground', className)}
    >
      {crumbs.map((crumb, index) => (
        <Fragment key={`${crumb.label}-${index}`}>
          {index ? <span aria-hidden="true">/</span> : null}
          {crumb.href ? (
            <Link href={crumb.href} className="whitespace-nowrap hover:underline">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium whitespace-nowrap text-foreground" aria-current="page">
              {crumb.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/**
 * The strip of the connecting screen, under the site's header: the way back (Interviews, the plan, the round of the
 * part just done) and, on the right, the round's parts as squares with how many are done. On a phone the way back is
 * short ("Northwind interview / Round 3 · Coding interviews") and the squares give way to the words.
 */
export function NextStrip({ plan, strip }: { plan: InterviewPlanPage; strip: NextStripState | null }) {
  const planPath = interviewPlanPath(plan.company.slug, plan.slug);
  const here: Crumb[] = strip?.round ? [{ label: `Round ${strip.round.number} · ${strip.round.title}` }] : [];
  return (
    <div className="border-b bg-background" data-player-strip="" data-next-strip="">
      <div className="mx-auto flex min-h-11 w-full max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2.5">
        <Crumbs
          className="max-sm:hidden"
          crumbs={[
            { label: 'Interviews', href: INTERVIEWS_HOME_PATH },
            { label: `${plan.company.name} · ${plan.name}`, href: here.length ? planPath : undefined },
            ...here,
          ]}
        />
        <Crumbs
          className="sm:hidden"
          crumbs={[{ label: `${plan.company.name} interview`, href: here.length ? planPath : undefined }, ...here]}
        />
        {strip?.parts.length ? (
          <span className="flex items-center gap-3 text-sm text-muted-foreground" data-next-parts="">
            <span className="flex items-center gap-1.5 max-sm:hidden" aria-hidden="true">
              {strip.parts.map((done, index) => (
                // Squares never move: the index is the part.
                <span
                  key={index}
                  data-part-square={done ? 'done' : 'open'}
                  className={cn('inline-block size-4 rounded-[4px]', done ? SQUARE.done : SQUARE.open)}
                />
              ))}
            </span>
            <span className="whitespace-nowrap">
              {strip.words.number === null ? null : (
                <span className="font-mono font-semibold text-foreground tabular-nums">{strip.words.number}</span>
              )}
              {strip.words.tail}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
