'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

import { Eyebrow, Pill } from './primitives';
import { useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { type HeldIds, heldPickOf, mergeMove, shownPickOf } from '@/lib/contribute/session-head-logic';

const Swap = createContext<{ shown: string; swap: (kind: string) => void } | null>(null);

/**
 * The pane's head when it holds moves: every card it holds is rendered, one shown and the rest hidden (each keeps its
 * own state, a typed note say). A row of Also waiting held by this pane swaps its card in place: the address takes
 * `move=<kind>` with `history.replaceState`, so the swap is linkable and survives a reload, and no server component
 * renders again (the comments' edits stay).
 */
export function HeadSwitch({ held, children }: { held: HeldIds; children: ReactNode }) {
  const move = useSearchParams().get('move');
  const [picked, setPicked] = useState(() => heldPickOf(held, move));
  // The address's move changed (back, a link, a swap): its card is the pick.
  const [seen, setSeen] = useState(move);
  if (seen !== move) {
    setSeen(move);
    setPicked(heldPickOf(held, move));
  }
  // A fresh read of the page may no longer hold the picked card: the move named, else the first.
  const shown = shownPickOf(held, picked, move);
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    document.getElementById(`move-title-${shown}`)?.focus();
  }, [shown]);

  const swap = (kind: string) => {
    moved.current = true;
    setPicked(heldPickOf(held, kind));
    window.history.replaceState(null, '', `${window.location.pathname}${mergeMove(window.location.search, kind)}`);
  };
  return (
    <Swap.Provider value={{ shown, swap }}>
      <div className="flex min-w-0 flex-col" data-session-head="card">
        {children}
      </div>
    </Swap.Provider>
  );
}

/** One held card: shown when it is the pick, else mounted and hidden. */
export function HeldCard({ id, children }: { id: string; children: ReactNode }) {
  const swap = useContext(Swap);
  const hidden = !!swap && swap.shown !== id;
  return (
    <div hidden={hidden} data-held={id}>
      {children}
    </div>
  );
}

/** A move under the card: its pill, its title, and Open (a swap here, or a link to the session that holds it). */
export type AlsoRow = {
  id: string;
  chip: string;
  tone: 'violet' | 'amber' | 'red';
  title: string;
  /** Held by this pane: swapped in place. Else the address of the session that holds it, with `move=`. */
  href: Route | null;
};

/** Every other move of the contribution, in order, under the card. */
export function AlsoWaiting({ rows }: { rows: AlsoRow[] }) {
  const swap = useContext(Swap);
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-1.5 border-t pt-3" data-also-waiting={rows.length}>
      <Eyebrow>Also waiting</Eyebrow>
      <ul className="flex flex-col divide-y">
        {rows.map((row) => (
          <li
            key={`${row.href ?? 'here'}-${row.id}`}
            className="flex min-w-0 items-center gap-2 py-1.5"
            data-also={row.id}
          >
            <Pill tone={row.tone}>{row.chip}</Pill>
            <span className="min-w-0 flex-1 truncate text-sm">{row.title}</span>
            {row.href ? (
              <Link href={row.href} prefetch={false} className="shrink-0 text-sm font-semibold text-link max-sm:py-3">
                Open
                <span className="sr-only">: {row.title}</span>
              </Link>
            ) : (
              <Button
                type="button"
                variant="link"
                className="h-auto shrink-0 p-0 max-sm:min-h-11"
                onClick={() => swap?.swap(row.id)}
              >
                Open
                <span className="sr-only">: {row.title}</span>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Start a run anyway": a run with the user's own note, when nothing a run would act on waits. Under the card when the
 * head is a card, in the status line's Details otherwise. Its note takes the focus when it opens.
 */
export function StartAnyway({ children }: { children: ReactNode }) {
  const error = useSessionActions()?.error;
  // Its own start failed: it stays open, its error under its button.
  const failed = error?.source === 'start' && error.key === 'anyway';
  const [chosen, setOpen] = useState(false);
  const open = chosen || failed;
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) content.current?.querySelector<HTMLElement>('textarea')?.focus();
  }, [open]);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="flex basis-full flex-col gap-2 border-t pt-3"
      data-start-anyway=""
    >
      <CollapsibleTrigger asChild>
        <Button type="button" variant="link" className="h-auto self-start p-0 max-sm:min-h-11">
          Start a run anyway
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent ref={content}>{children}</CollapsibleContent>
    </Collapsible>
  );
}
