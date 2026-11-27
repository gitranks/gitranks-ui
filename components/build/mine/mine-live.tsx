'use client';

import { signIn, useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

import { MINE_MAIN_CLASS, MineBody, MineHead, MineMessage, MinePending, type RemoveOutcome } from './mine-parts';
import { askBuildBarAgain } from '@/components/build/bar/build-bar-live';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import type { BuildActionResult } from '@/lib/build/build-action';
import { mineListOf, mineViewOf, withoutBuild } from '@/lib/build/mine';
import { BUILD_MINE_MINE_PATH, BUILD_MINE_PATH, BUILD_REMOVE_MINE_PATH } from '@/lib/build/paths';
import type { BuildMineList } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's builds from their route; null on any failure (Build not open to them, or an API that does not know it). */
export async function readBuildMine(): Promise<BuildMineList | null> {
  try {
    const res = await fetch(BUILD_MINE_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    return mineListOf(((await res.json()) as { mine?: unknown }).mine);
  } catch {
    return null;
  }
}

/** Removes a build in progress through its route; a failure to reach it reads as `FAILED`. */
export async function postRemoveBuild(build: string): Promise<BuildActionResult<boolean | null>> {
  try {
    const res = await fetch(BUILD_REMOVE_MINE_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ build }),
    });
    const answer = (await res.json().catch(() => null)) as BuildActionResult<boolean | null> | null;
    return answer && typeof answer.ok === 'boolean' ? answer : { ok: false, error: 'FAILED' };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

type Page =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'ended' }
  | { kind: 'failed' }
  | { kind: 'ready'; list: BuildMineList; now: Date };

/**
 * My builds in the browser. The page is the same for everyone; once it is up, a person with a session reads their
 * builds, and a visitor is asked to sign in. Removing a build takes its row away; a refusal the page cannot explain
 * (a build already built, or gone) reads the list again.
 */
export function BuildMineLive() {
  const [page, setPage] = useState<Page>({ kind: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const { data: session, status } = useSession();
  const login = session?.user?.githubLogin ?? null;
  // The route answers no list both signed out and on a failure. The session tells them apart: one the server no longer
  // reads (the readable hint outlived it) needs a new sign-in, which "Try again" would never give.
  const sessionGone = status === 'unauthenticated' || !!session?.error;
  const shown = page.kind === 'failed' && sessionGone ? 'ended' : page.kind;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again reads the list once more.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPage({ kind: 'visitor' });
      return;
    }
    let live = true;
    readBuildMine().then((list) => {
      if (live) setPage(list ? { kind: 'ready', list, now: new Date() } : { kind: 'failed' });
    });
    return () => {
      live = false;
    };
  }, [attempt]);

  const remove = useCallback(async (build: string): Promise<RemoveOutcome> => {
    const result = await postRemoveBuild(build);
    if (result.ok) {
      setPage((current) =>
        current.kind === 'ready' ? { ...current, list: withoutBuild(current.list, build) } : current,
      );
      // My builds, Settings and the count on "Test" may all change with it.
      askBuildBarAgain();
      return 'removed';
    }
    if (result.error === 'SIGNED_OUT') {
      setPage({ kind: 'ended' });
      return 'reload';
    }
    if (result.error === 'FAILED') return 'failed';
    // Built since, removed elsewhere, or refused: the list as it is now says why.
    const list = await readBuildMine();
    if (!list) return 'failed';
    setPage({ kind: 'ready', list, now: new Date() });
    askBuildBarAgain();
    return 'reload';
  }, []);

  const signInHere = useCallback(() => {
    signIn(IDENTITY_PROVIDER, { redirectTo: BUILD_MINE_PATH }).catch(() => {});
  }, []);

  return (
    <main className={MINE_MAIN_CLASS}>
      <MineHead />
      {shown === 'visitor' || shown === 'ended' ? (
        <MineMessage
          state={shown}
          title={shown === 'ended' ? 'Sign in again to see your builds' : 'Sign in to see your builds'}
          text={
            shown === 'ended'
              ? 'Your session ended. Sign in, and you come back here.'
              : 'Your builds are kept with your GitHub account, so this page needs you signed in.'
          }
        >
          <Button type="button" className="font-semibold max-sm:min-h-11" onClick={signInHere}>
            Sign in with GitHub
          </Button>
        </MineMessage>
      ) : shown === 'failed' ? (
        <MineMessage
          state="failed"
          title="Your builds did not load"
          text="Nothing is lost; we could not read them just now. Try again in a minute."
        >
          <Button
            type="button"
            className="font-semibold max-sm:min-h-11"
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
        <MineBody view={mineViewOf(page.list, page.now)} login={login} onRemove={remove} />
      )}
    </main>
  );
}
