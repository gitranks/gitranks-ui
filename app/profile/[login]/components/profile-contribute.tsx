'use client';

import { usePathname } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { ProfileContributeBlock } from './profile-contribute-block';
import { ProfileIssuesBlock } from './profile-issues-for-you';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { isProfileOwner } from '@/lib/contribute/profile-issues';
import {
  type LanguagePicksAnswer,
  languagePicksUrl,
  OWN_PROFILE_BLOCK_PATH,
  type OwnProfileBlockAnswer,
  type ProfileLanguage,
} from '@/lib/contribute/profile-picks';
import { loginFromPath } from '@/utils/login-from-path';

const NO_PICKS: LanguagePicksAnswer = { issues: [], stats: null };

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
 * GitRanks Contribute on a profile, chosen in the browser after the cached page loads:
 * - anyone but the owner (signed out, or signed in on someone else's profile): the profile's main language's picks of
 *   the day, the same for everyone, read from a cached route;
 * - the signed-in owner: their "Issues for you" once they are a contributor, else their own picks; until that answer
 *   comes, nothing;
 * - nothing when the profile writes no pool language (a visitor), or there is nothing to show.
 */
export function ProfileContribute({ login, language }: { login: string; language: ProfileLanguage | null }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const profile = loginFromPath(login);
  const owner = isProfileOwner(viewer, profile);
  const [visitor, setVisitor] = useState<LanguagePicksAnswer>(NO_PICKS);
  const [own, setOwn] = useState<OwnProfileBlockAnswer>({ kind: 'none' });

  useEffect(() => {
    setVisitor(NO_PICKS);
    const pool = language?.language;
    if (status === 'loading' || owner || !pool) return;
    let live = true;
    read<LanguagePicksAnswer>(languagePicksUrl(pool)).then((answer) => {
      if (live && Array.isArray(answer?.issues)) setVisitor({ issues: answer.issues, stats: answer.stats ?? null });
    });
    return () => {
      live = false;
    };
  }, [status, owner, language?.language]);

  useEffect(() => {
    setOwn({ kind: 'none' });
    if (!owner) return;
    let live = true;
    read<OwnProfileBlockAnswer>(`${OWN_PROFILE_BLOCK_PATH}?login=${encodeURIComponent(profile.trim())}`).then(
      (answer) => {
        if (live && answer && (answer.kind === 'contributor' || answer.kind === 'own')) setOwn(answer);
      },
    );
    return () => {
      live = false;
    };
  }, [owner, profile]);

  if (owner) {
    if (own.kind === 'contributor') return <ProfileIssuesBlock issues={own.issues} />;
    if (own.kind === 'own') {
      return <ProfileContributeBlock audience="own" picks={own.issues} stats={own.stats} language={language} />;
    }
    return null;
  }
  return (
    <ProfileContributeBlock
      audience="visitor"
      picks={visitor.issues}
      stats={visitor.stats}
      language={language}
      onSignIn={status === 'unauthenticated' ? () => signIn(IDENTITY_PROVIDER, { redirectTo: pathname }) : undefined}
    />
  );
}
