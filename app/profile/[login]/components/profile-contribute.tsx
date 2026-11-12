'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { ProfileContributeBlock } from './profile-contribute-block';
import { isProfileOwner } from '@/lib/contribute/profile-issues';
import {
  OWN_PROFILE_BLOCK_PATH,
  type OwnProfileBlockAnswer,
  ownIssueOf,
  ownMatchOf,
} from '@/lib/contribute/profile-picks';
import { loginFromPath } from '@/utils/login-from-path';

/** One JSON read; null on any failure (the block is left out, never an error). */
async function read<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * GitRanks Contribute on the signed-in owner's own profile, and nobody else's, read in the browser after the cached
 * page loads: their own list's top once they are a contributor, else ready issues picked for their languages. Nothing
 * for anyone else, before the answer comes, or when there is nothing to show.
 */
export function ProfileContribute({ login }: { login: string }) {
  const { data: session } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const profile = loginFromPath(login);
  const owner = isProfileOwner(viewer, profile);
  const [answer, setAnswer] = useState<OwnProfileBlockAnswer>({ kind: 'none' });

  useEffect(() => {
    setAnswer({ kind: 'none' });
    const url = ownProfileBlockUrl(viewer, profile);
    if (!url) return;
    let live = true;
    read<OwnProfileBlockAnswer>(url).then((got) => {
      if (live && got && (got.kind === 'contributor' || got.kind === 'own')) setAnswer(got);
    });
    return () => {
      live = false;
    };
  }, [viewer, profile]);

  return owner ? <ProfileContributeView answer={answer} /> : null;
}

/** Where the block asks, for the owner of `profile`; null, nothing asked, for anyone else or nobody. */
export const ownProfileBlockUrl = (viewer: string | null | undefined, profile: string): string | null =>
  isProfileOwner(viewer, profile) ? `${OWN_PROFILE_BLOCK_PATH}?login=${encodeURIComponent(profile.trim())}` : null;

/** The block for an answer: a contributor's own list, the owner's picks, or nothing. */
export function ProfileContributeView({ answer }: { answer: OwnProfileBlockAnswer }) {
  if (answer.kind === 'none') return null;
  if (answer.kind === 'contributor') {
    return <ProfileContributeBlock state="connected" issues={answer.issues.map(ownIssueOf)} />;
  }
  return (
    <ProfileContributeBlock
      state="not_connected"
      issues={answer.issues.map(ownIssueOf)}
      readyIssues={answer.stats?.readyIssues ?? null}
      matchedTo={ownMatchOf(answer.issues)}
    />
  );
}
