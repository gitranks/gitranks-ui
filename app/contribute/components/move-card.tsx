import type { ReactNode } from 'react';

import { Eyebrow, HEADING } from './primitives';
import { Button } from '@/components/ui/button';
import type { ContributeAttemptDetail, ContributePrSignal } from '@/lib/contribute/contribute.types';
import { cn } from '@/lib/utils';

/**
 * The move card's border: violet when a GitRanks step is ready for the user, amber when only they can do it or GitHub
 * or the repo blocks GitRanks, red when something failed.
 */
export const MOVE_CARD = {
  amber: 'border-warning/40 ring-warning/10',
  red: 'border-negative/30 ring-negative/10',
  violet: 'border-primary/30 ring-primary/10',
} as const;

/**
 * The one thing to do now on a session (M4): its kind line, a title that says the move, one visible sentence of why,
 * a body (a note field, a copy block), at most one primary button and two secondaries, the action's error, the rest of
 * the why behind a disclosure, and what rides along (a proof's line, "Start a run anyway", Also waiting).
 */
export function MoveCard({
  tone,
  kindLine,
  title,
  why,
  primary,
  secondary,
  body,
  whyLabel = 'Why…',
  whyBody,
  whyOpen = false,
  error,
  rider,
  name,
  id,
}: {
  tone: keyof typeof MOVE_CARD;
  kindLine: string;
  title: ReactNode;
  why?: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  body?: ReactNode;
  whyLabel?: string;
  whyBody?: ReactNode;
  /** Open only for steps outside GitRanks (a CLA, a DCO by hand). */
  whyOpen?: boolean;
  error?: ReactNode;
  rider?: ReactNode;
  /** `data-move`: the card's kind. */
  name: string;
  /** The card's own id: its title's id, so two mounted cards never share one. */
  id: string;
}) {
  const titleId = `move-title-${id}`;
  return (
    <section
      data-move={name}
      aria-labelledby={titleId}
      className={cn('flex scroll-mt-20 flex-col gap-3 rounded-xl border bg-card p-4 ring-2 sm:p-5', MOVE_CARD[tone])}
    >
      <div className="flex flex-col gap-1.5">
        <Eyebrow>{kindLine}</Eyebrow>
        <h2 id={titleId} tabIndex={-1} className={cn(HEADING.card, 'break-words outline-none')}>
          {title}
        </h2>
        {why ? (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">{why}</div>
        ) : null}
      </div>
      {body}
      {primary || secondary ? (
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-start" data-move-actions="">
          {primary}
          {secondary}
        </div>
      ) : null}
      {error}
      {whyBody ? (
        <details open={whyOpen} className="group text-sm" data-move-why="">
          <summary className="cursor-pointer font-medium text-link marker:text-muted-foreground">{whyLabel}</summary>
          <div className="mt-2 flex flex-col gap-2 text-muted-foreground [overflow-wrap:anywhere]">{whyBody}</div>
        </details>
      ) : null}
      {rider}
    </section>
  );
}

/** A link to GitHub as a button: the card's main one, or beside it. */
export function GithubButton({ href, primary, children }: { href: string; primary: boolean; children: ReactNode }) {
  return (
    <Button asChild size="lg" variant={primary ? 'default' : 'outline'} className="min-h-11 px-4 font-semibold">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </Button>
  );
}

/** Steps to take, in order. */
export const Steps = ({ steps, title = 'What to do' }: { steps: string[]; title?: string }) => (
  <div className="flex flex-col gap-1.5">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm break-words">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  </div>
);

/** The kinds are every signal on the pull request: an API that does not take `kinds` yet clears the same. */
export const allKindsOf = (first: ContributeAttemptDetail, kinds: readonly string[]) => {
  const all = new Set((first.needsYou?.signals ?? []).map(({ kind }) => kind));
  return all.size === kinds.length && kinds.every((kind) => all.has(kind as ContributePrSignal['kind']));
};
