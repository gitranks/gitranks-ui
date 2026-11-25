import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/workspace/kbd';
import { cn } from '@/lib/utils';

/*
 * The box of a product's home page, as Learn home and Contribute home draw it: a small line on top, a title, a few
 * lines and at most one action. One box at most is lit: it has the brand's edge and the one filled button, with Enter.
 * The parts take plain data, so each home passes its own words and its own key markers.
 */

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

/** A box: lit (it takes Enter), plain, or quiet (dashed, nothing to do). Other attributes go on the box itself. */
export function HomeBox({
  lit = false,
  quiet = false,
  children,
  ...attributes
}: {
  lit?: boolean;
  quiet?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<'section'>, 'className' | 'children'>) {
  return (
    <section
      className={cn(
        'flex min-h-[224px] min-w-0 flex-col gap-3 rounded-xl p-5',
        quiet ? 'border border-dashed' : 'bg-card',
        !quiet && (lit ? 'border-2 border-primary' : 'border'),
      )}
      data-lit={lit ? '' : undefined}
      data-quiet={quiet ? '' : undefined}
      {...attributes}
    >
      {children}
    </section>
  );
}

/** The small line on top; `chip` marks it as something that needs the person. */
export function Eyebrow({ chip = false, children }: { chip?: boolean; children: ReactNode }) {
  if (chip) {
    return (
      <span className="self-start rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
        {children}
      </span>
    );
  }
  return <span className={EYEBROW}>{children}</span>;
}

export const Title = ({ quiet = false, children }: { quiet?: boolean; children: ReactNode }) => (
  <h2 className={cn('m-0 text-lg font-semibold text-balance', quiet && 'text-muted-foreground')}>{children}</h2>
);

export const Text = ({ children }: { children: ReactNode }) => (
  <p className="m-0 text-sm text-muted-foreground">{children}</p>
);

/** The data attributes a home's own keys find its actions by: the lit one's (Enter), and one with a key of its own. */
export type ActionMarkers = { enter: `data-${string}`; key?: `data-${string}` };

/**
 * A box's one action: the main one (Enter) when its box is lit, else an outline one. Its own key, when it has one, works
 * either way; its hint shows only when the box is not lit, where Enter's is.
 */
export function Action({
  lit,
  hints,
  href,
  keyHint,
  markers,
  children,
}: {
  lit: boolean;
  hints: boolean;
  href: string;
  keyHint?: string;
  markers: ActionMarkers;
  children: ReactNode;
}) {
  const kbd = hints ? lit ? <Kbd onPrimary>⏎</Kbd> : keyHint ? <Kbd>{keyHint}</Kbd> : null : null;
  const marks = {
    [markers.enter]: lit ? '' : undefined,
    ...(markers.key ? { [markers.key]: keyHint } : {}),
  };
  return (
    <Button
      asChild
      variant={lit ? 'default' : 'outline'}
      className={cn('mt-auto self-start max-sm:min-h-11', lit ? 'h-10 px-6 font-semibold' : 'h-9 px-4')}
    >
      <Link href={href as never} {...marks}>
        {children}
        {kbd}
      </Link>
    </Button>
  );
}
