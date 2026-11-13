'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { NEXT_SESSION, nextSessionPath, sessionPath } from '@/lib/contribute/sessions';

/** Where the shown session is told: by its page (`shown`), or by the address, under the contribution's layout. */
export type ShownSession = {
  firstId: string;
  /** Whether the next step shows at `?session=next` (else the first attempt does). */
  nextShown: boolean;
  /** The session shown, when the page says it: an attempt's id or `next`. Else the address tells. */
  shown?: string;
};

/**
 * The session the address shows: a run's (`…/runs/<id>`), the next step, or the first attempt. The layout reads it here,
 * as it stays while the user moves between the sessions.
 */
export function useShownSession({ firstId, nextShown, shown }: ShownSession): string {
  const pathname = usePathname();
  const session = useSearchParams().get('session');
  if (shown !== undefined) return shown;
  const run = pathname.match(/\/runs\/([^/]+)\/?$/)?.[1];
  if (run) return decodeURIComponent(run);
  return session === NEXT_SESSION && nextShown ? NEXT_SESSION : firstId;
}

/** The shown session's address, as the layout's links name it. */
export const shownPathOf = (firstId: string, shown: string) =>
  shown === NEXT_SESSION ? nextSessionPath(firstId) : sessionPath(firstId, shown);
