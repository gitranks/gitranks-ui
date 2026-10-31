'use client';

import Link from 'next/link';
import { type RefObject, useLayoutEffect } from 'react';

import { attemptHref } from './reviews-ready';
import type { LiveStatus } from '@/lib/contribute/live-issues';
import { cn } from '@/lib/utils';

/** What a list row knows of its issue as it is now, and what it tells the list. */
export type IssueLive = {
  status: LiveStatus;
  attemptId: string | null;
  /** A Skip found the issue taken: the row turns taken and leaves. */
  onTaken?: () => void;
  /** The user skipped it: it is not asked about again. */
  onSkipped?: () => void;
};

/** The issue is no longer free: its controls are off, and the card is dimmed. */
export const isGone = (status: LiveStatus | undefined) => !!status && status !== 'AVAILABLE';

/** The dimmed card's parts: everything but the status line. */
export const GONE = 'opacity-60';

/**
 * The card's status line: a live region that is always there (out of sight while the issue is free), so the change
 * is announced. "Taken by another contributor", or "Your agent is on this · View" with the user's attempt.
 */
export function IssueLiveStatus({
  status,
  attemptId,
  ref,
}: {
  status: LiveStatus;
  attemptId: string | null;
  ref?: RefObject<HTMLParagraphElement | null>;
}) {
  return (
    <p
      ref={ref}
      role="status"
      tabIndex={-1}
      data-live-status={status === 'AVAILABLE' ? undefined : status === 'TAKEN' ? 'taken' : 'yours'}
      className={cn(status === 'AVAILABLE' ? 'sr-only' : 'text-sm font-medium text-foreground outline-none')}
    >
      {status === 'TAKEN' ? 'Taken by another contributor' : null}
      {status === 'CLAIMED_BY_YOU' ? (
        <>
          Your agent is on this
          {attemptId ? (
            <>
              {' · '}
              <Link href={attemptHref(attemptId)} prefetch={false} className="font-semibold text-link hover:underline">
                View
              </Link>
            </>
          ) : null}
        </>
      ) : null}
    </p>
  );
}

/** A card's focus, when its controls turn off under it: moved to its status line, never lost to the page. */
export function useFocusOnGone(
  gone: boolean,
  card: RefObject<HTMLElement | null>,
  status: RefObject<HTMLElement | null>,
) {
  // Before the browser lets go of the control it disabled: the same commit, before paint.
  useLayoutEffect(() => {
    if (gone && card.current?.contains(document.activeElement)) status.current?.focus();
  }, [gone, card, status]);
}
