import Link from 'next/link';

import { Pill } from './primitives';
import type { SessionCard } from '@/lib/contribute/sessions';
import { cn } from '@/lib/utils';

const CARD = 'flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-3 py-2.5 text-foreground';

function CardBody({ card }: { card: SessionCard }) {
  return (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{card.title}</span>
        {card.pill ? <Pill tone={card.pill.tone}>{card.pill.label}</Pill> : null}
      </span>
      {card.meta ? <span className="font-mono text-xs text-muted-foreground tabular-nums">{card.meta}</span> : null}
      {card.note ? <span className="text-xs text-muted-foreground">{card.note}</span> : null}
    </>
  );
}

/**
 * The contribution's sessions, oldest first, the one shown marked: a column beside it, a row that scrolls on a phone.
 * `rounds` says how many follow-up rounds are used.
 */
export function SessionsList({ cards, rounds }: { cards: SessionCard[]; rounds: string | null }) {
  return (
    <nav aria-labelledby="attempt-sessions" data-sessions={cards.length} className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="attempt-sessions" className="text-sm font-semibold">
          Sessions
        </h2>
        {rounds ? <span className="text-xs text-muted-foreground">{rounds}</span> : null}
      </div>
      <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {cards.map((card) => (
          <li key={card.key} data-session={card.key} className="w-56 shrink-0 lg:w-auto">
            {card.href ? (
              <Link
                href={card.href}
                prefetch={false}
                scroll={false}
                aria-current={card.current ? 'page' : undefined}
                className={cn(
                  CARD,
                  'hover:border-primary/40',
                  card.draft && 'border-dashed',
                  card.current && 'border-primary bg-brand-soft/40 ring-1 ring-primary ring-inset',
                )}
              >
                <CardBody card={card} />
              </Link>
            ) : (
              <div className={cn(CARD, 'border-dashed bg-transparent')}>
                <CardBody card={card} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
