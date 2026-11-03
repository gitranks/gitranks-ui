import type { ReactNode } from 'react';

import { HEADING } from './primitives';
import { Button } from '@/components/ui/button';
import type { ContributeAttemptDetail, ContributePrSignal } from '@/lib/contribute/contribute.types';
import { cn } from '@/lib/utils';

/** A card of the next step: amber for a move only the user can make, red for a check that fails, violet for a run. */
export const MOVE_CARD = {
  amber: 'border-warning/40 ring-warning/10',
  red: 'border-negative/30 ring-negative/10',
  violet: 'border-primary/30 ring-primary/10',
  /** Nothing for the user to do: what happens, told. */
  plain: '',
} as const;

export function MoveCard({
  tone,
  heading,
  pill,
  name,
  id,
  children,
}: {
  tone: keyof typeof MOVE_CARD;
  heading: string;
  pill: ReactNode;
  /** The card's kind, for the specs and the boards. */
  name: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-next-card={name}
      className={cn(
        'flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-5',
        tone !== 'plain' && 'ring-2',
        MOVE_CARD[tone],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={HEADING.card}>{heading}</h2>
        {pill}
      </div>
      {children}
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

/** The kinds are every signal on the pull request: an API that does not take `kinds` yet clears the same. */
export const allKindsOf = (first: ContributeAttemptDetail, kinds: readonly string[]) => {
  const all = new Set((first.needsYou?.signals ?? []).map(({ kind }) => kind));
  return all.size === kinds.length && kinds.every((kind) => all.has(kind as ContributePrSignal['kind']));
};
