import { Check, Star } from 'lucide-react';
import Link from 'next/link';

import { buildProjectPath } from '@/lib/build/paths';
import { type BuildCardPlace, MARK_WORDS, placeWordsOf, projectFactsOf } from '@/lib/build/project-card';
import type { BuildProjectCard } from '@/lib/build/types';
import { cn } from '@/lib/utils';

/*
 * A project as a card, on Home and on Projects, and wherever else a project is listed: the name, one line on what you
 * end up with, and the facts on the last line. The whole card is the link. All cards of a grid are the same height.
 */

/** "Repeated after a week": the gold test passed. */
function GoldMark() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning-soft-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--warning)_35%,transparent)]"
      data-card-mark="gold"
    >
      <Star className="size-3.5 shrink-0 fill-current text-warning" aria-hidden="true" />
      {MARK_WORDS.gold}
    </span>
  );
}

/** "Answered every step", or "Built" for a built project with no mark. */
function BrandMark({ mark }: { mark: 'answered' | 'built' }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-brand-soft-foreground"
      data-card-mark={mark}
    >
      <Check className="size-4 shrink-0" aria-hidden="true" />
      {MARK_WORDS[mark]}
    </span>
  );
}

/** What the person has in a project, on the line above the facts. */
function PlaceWords({ place }: { place: BuildCardPlace }) {
  if (place.kind !== 'built') {
    return <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">{placeWordsOf(place)}</span>;
  }
  if (!place.marks.length) return <BrandMark mark="built" />;
  return (
    <>
      {place.marks.includes('gold') ? <GoldMark /> : null}
      {place.marks.includes('answered') ? <BrandMark mark="answered" /> : null}
    </>
  );
}

export type ProjectCardProps = {
  card: BuildProjectCard;
  /**
   * The person's place in the project, on its own line above the facts. Left out: the card has no such line (a
   * visitor, and the lists of Home). Null: the line is there and empty (a project the person has not started), so
   * every card of the list stays the same height.
   */
  place?: BuildCardPlace | null;
  /**
   * The line kept, empty, from the first paint in a browser that holds a session, while the person's places are read:
   * the cards do not grow when they come.
   */
  hinted?: boolean;
};

/** One project's card, a link to its page. */
export function ProjectCard({ card, place, hinted = false }: ProjectCardProps) {
  const lined = place !== undefined;
  return (
    <li className="flex" data-project-card={card.slug}>
      <Link
        href={buildProjectPath(card.slug)}
        className="flex w-full flex-col gap-1.5 rounded-lg border bg-card p-4 hover:bg-accent"
      >
        <span className="text-base font-semibold">{card.name}</span>
        <span className="text-sm text-muted-foreground">{card.line}</span>
        {lined || hinted ? (
          <span
            className={cn(
              'mt-auto flex min-h-[30px] flex-wrap items-center gap-2 pt-2',
              !lined && 'hidden [html[data-has-session]_&]:flex',
            )}
            data-card-place={place ? place.kind : ''}
          >
            {place ? <PlaceWords place={place} /> : null}
          </span>
        ) : null}
        <span
          className={cn(
            'text-xs text-muted-foreground',
            !lined && 'mt-auto pt-2',
            !lined && hinted && '[html[data-has-session]_&]:mt-0 [html[data-has-session]_&]:pt-0',
          )}
          data-card-facts=""
        >
          {projectFactsOf(card)}
        </span>
      </Link>
    </li>
  );
}

/** Cards in two columns, one on a phone; the last of an odd number keeps the width of the others. */
export function ProjectCards({
  cards,
  placeOf,
  hinted = false,
  className,
}: {
  cards: readonly BuildProjectCard[];
  /** The person's place in a project, by its slug; left out for a list with no such line. */
  placeOf?: (slug: string) => BuildCardPlace | null;
  hinted?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn('m-0 grid list-none gap-3 p-0 sm:grid-cols-2', className)}>
      {cards.map((card) => (
        <ProjectCard key={card.slug} card={card} place={placeOf ? placeOf(card.slug) : undefined} hinted={hinted} />
      ))}
    </ul>
  );
}
