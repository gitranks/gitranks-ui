import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HEADING } from './primitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A row of the user's lists: what it is about (a repo and its state), its title, a line of what happened, and the
 * button that leads to it. Learn's My lessons draws its rows with it too.
 */
export function ListRow({
  id,
  state,
  meta,
  pills,
  title,
  text,
  href,
  action,
  quiet = false,
  kind = 'attempt',
}: {
  id: string;
  /** What the row is: its id goes in `data-attempt` or `data-lesson`. */
  kind?: 'attempt' | 'lesson';
  state: string;
  meta: ReactNode;
  pills: ReactNode;
  title: ReactNode;
  text: ReactNode;
  href: Route | null;
  action: string;
  /** A row with nothing to do: its button is the outline one, so the view keeps one primary action. */
  quiet?: boolean;
}) {
  return (
    <li
      data-attempt={kind === 'attempt' ? id : undefined}
      data-lesson={kind === 'lesson' ? id : undefined}
      data-state={state}
      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-b-0"
    >
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          {meta ? <span className="font-mono text-xs text-muted-foreground">{meta}</span> : null}
          {pills}
        </span>
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </div>
      {href ? (
        <Button asChild variant={quiet ? 'outline' : 'default'} className="min-h-10 px-4 font-semibold">
          <Link href={href} prefetch={false}>
            {action}
          </Link>
        </Button>
      ) : null}
    </li>
  );
}

/** A list of the user's, in a card with its heading and count: "In progress · 2". */
export function ListSection({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} data-section={id} className="overflow-hidden rounded-xl border bg-card">
      <h2 id={id} className={cn(HEADING.card, 'border-b px-5 py-3.5')}>
        {title} · {count}
      </h2>
      <ul>{children}</ul>
    </section>
  );
}
