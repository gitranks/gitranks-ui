import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

/**
 * A row of the user's lists: its reference line (the repo, the issue and pull request, a pill), its title, a line of
 * what happened, and on the right its state and the button that leads to it. On a phone the state and the button go
 * under the rest, on one line. Your progress draws its rows with it.
 */
export function ListRow({
  id,
  state,
  refs,
  title,
  text,
  aside,
  href,
  action,
  quiet = false,
  kind = 'attempt',
}: {
  id: string;
  /** What the row is: its id goes in `data-attempt` or `data-lesson`. */
  kind?: 'attempt' | 'lesson';
  state: string;
  /** The reference line: `RefChips`, with its pills. */
  refs: ReactNode;
  title: ReactNode;
  text: ReactNode;
  /** Beside the button: a state pill. */
  aside?: ReactNode;
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
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
        {refs}
        <span className="text-base font-medium text-pretty">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </div>
      {aside || href ? (
        <div className="flex shrink-0 items-center gap-3">
          {aside}
          {href ? (
            <Button asChild variant={quiet ? 'outline' : 'default'} className="min-h-10 px-4 font-semibold">
              <Link href={href} prefetch={false}>
                {action}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
