'use client';

import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

import { MINE_MAIN_CLASS, MineBody, MineHead, MineMessage, MinePending } from './mine-parts';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { interviewsMineOf, mineViewOf } from '@/lib/interviews/mine';
import { INTERVIEWS_MINE_MINE_PATH, INTERVIEWS_MINE_PATH } from '@/lib/interviews/paths';
import type { InterviewsMine } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's plans from their route; null on any failure (Interviews not open to them, or an API that does not know it). */
export async function readInterviewsMine(): Promise<InterviewsMine | null> {
  try {
    const res = await fetch(INTERVIEWS_MINE_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    return interviewsMineOf(((await res.json()) as { mine?: unknown } | null)?.mine);
  } catch {
    return null;
  }
}

type Page =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'ended' }
  | { kind: 'failed' }
  | { kind: 'ready'; mine: InterviewsMine; now: Date };

const BUTTON_CLASS = 'font-semibold max-sm:min-h-11';

/**
 * My interviews in the browser. The page is the same for everyone; once it is up, a person with a session reads
 * their plans, and a visitor is asked to sign in, which brings them back here.
 */
export function InterviewsMineLive() {
  const [page, setPage] = useState<Page>({ kind: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const { data: session, status } = useSession();
  // The route answers no plans both signed out and on a failure. The session tells them apart: one the server no
  // longer reads (the readable hint outlived it) needs a new sign-in, which "Try again" would never give.
  const sessionGone = status === 'unauthenticated' || !!session?.error;
  const shown = page.kind === 'failed' && sessionGone ? 'ended' : page.kind;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again reads the plans once more.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPage({ kind: 'visitor' });
      return;
    }
    let live = true;
    readInterviewsMine().then((mine) => {
      if (live) setPage(mine ? { kind: 'ready', mine, now: new Date() } : { kind: 'failed' });
    });
    return () => {
      live = false;
    };
  }, [attempt]);

  const signInHere = useCallback(() => {
    signIn(IDENTITY_PROVIDER, { redirectTo: INTERVIEWS_MINE_PATH }).catch(() => {});
  }, []);

  return (
    <main className={MINE_MAIN_CLASS} data-interviews-page="mine">
      <MineHead />
      {shown === 'visitor' || shown === 'ended' ? (
        <MineMessage
          state={shown}
          title={
            shown === 'ended' ? 'Sign in again to see your interview plans' : 'Sign in to see your interview plans'
          }
          text={
            shown === 'ended'
              ? 'Your session ended. Sign in, and you come back here.'
              : 'Your interview plans are kept with your GitHub account, so this page needs you signed in.'
          }
        >
          <Button type="button" className={BUTTON_CLASS} onClick={signInHere}>
            Sign in with GitHub
          </Button>
        </MineMessage>
      ) : shown === 'failed' ? (
        <MineMessage
          state="failed"
          title="Your interview plans did not load"
          text="Nothing is lost; we could not read them just now. Try again in a minute."
        >
          <Button
            type="button"
            className={BUTTON_CLASS}
            onClick={() => {
              setPage({ kind: 'pending' });
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </Button>
        </MineMessage>
      ) : page.kind !== 'ready' ? (
        <MinePending />
      ) : (
        <MineBody view={mineViewOf(page.mine, page.now)} />
      )}
    </main>
  );
}
