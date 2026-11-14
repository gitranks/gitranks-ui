'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { ProfileContributeBlock } from './profile-contribute-block';
import { ProfileLearnBlock } from './profile-learn-block';
import { dismissLearnPromo } from '@/app/learn/actions';
import { reportPromo } from '@/app/learn/components/use-promo-report';
import { isProfileOwner } from '@/lib/contribute/profile-issues';
import {
  OWN_PROFILE_BLOCK_PATH,
  type OwnProfileBlockAnswer,
  ownIssueOf,
  ownMatchOf,
} from '@/lib/contribute/profile-picks';
import type { ShownPromo } from '@/lib/learn/learn-promo';
import { readLearnPromo } from '@/lib/learn/learn-promo-read';
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
 * The one suggestion on the signed-in owner's own profile, and nobody else's, read in the browser after the cached page
 * loads: GitRanks Learn when it may suit them (in the Contribute block's place), else Contribute's block (their own
 * list's top once they are a contributor, else ready issues picked for their languages). Both are asked together and
 * drawn once both answer, so one never flashes before the other. Nothing for anyone else, before the answers, or when
 * there is nothing to show. `colors`: the profile's languages, for Learn's issue rows.
 */
export function ProfileContribute({ login, colors }: { login: string; colors?: Readonly<Record<string, string>> }) {
  const { data: session } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const profile = loginFromPath(login);
  const owner = isProfileOwner(viewer, profile);
  const [answer, setAnswer] = useState<OwnProfileBlockAnswer>({ kind: 'none' });
  const [learn, setLearn] = useState<ShownPromo | null>(null);

  useEffect(() => {
    setAnswer({ kind: 'none' });
    setLearn(null);
    const url = ownProfileBlockUrl(viewer, profile);
    if (!url) return;
    let live = true;
    Promise.all([read<OwnProfileBlockAnswer>(url), readLearnPromo('PROFILE', viewer, profile)]).then(([got, promo]) => {
      if (!live) return;
      setLearn(promo);
      if (got && (got.kind === 'contributor' || got.kind === 'own')) setAnswer(got);
    });
    return () => {
      live = false;
    };
  }, [viewer, profile]);

  if (!owner) return null;
  // "Not for me": Learn's suggestion goes for good, and Contribute's block takes its place.
  const dismiss = () => {
    reportPromo('promo_dismissed', 'learn_promo_profile');
    setLearn(null);
    void dismissLearnPromo().catch(() => {});
  };
  return <OwnerSuggestionView answer={answer} learn={learn} onDismiss={dismiss} colors={colors} />;
}

/** The owner's one suggestion, as drawn: Learn's when it may suit them, else Contribute's block for its answer. */
export function OwnerSuggestionView({
  answer,
  learn,
  onDismiss,
  colors,
}: {
  answer: OwnProfileBlockAnswer;
  learn: ShownPromo | null;
  onDismiss?: () => void;
  colors?: Readonly<Record<string, string>>;
}) {
  if (learn) return <ProfileLearnBlock promo={learn} onDismiss={onDismiss} colors={colors} />;
  return <ProfileContributeView answer={answer} />;
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
