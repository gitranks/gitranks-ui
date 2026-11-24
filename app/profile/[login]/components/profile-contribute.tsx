'use client';

import { useEffect, useState } from 'react';

import { ProfileContributeBlock } from './profile-contribute-block';
import { ProfileLearnListBox, ProfilePickedBox } from './profile-owner-boxes';
import {
  OWN_PROFILE_BLOCK_PATH,
  type OwnProfileBlockAnswer,
  ownIssueOf,
  ownMatchOf,
} from '@/lib/contribute/profile-picks';
import { skillsProfileMinePath } from '@/lib/skills/paths';
import { NO_SKILLS_PROFILE, ownerBoxCaseOf, type SkillsProfileAnswer } from '@/lib/skills/skills-overview';
import { isProfileOwner } from '@/utils/profile-owner';

/** One JSON read; null on any failure (the box is left out, never an error). */
async function read<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** What the owner's own profile reads for its box and its block: Contribute's picks, and their Skills view. */
export type OwnerReads = { picks: OwnProfileBlockAnswer; skills: SkillsProfileAnswer };

/** Where the box asks, for the owner of `profile`; null, nothing asked, for anyone else or nobody. */
export const ownProfileBlockUrl = (viewer: string | null | undefined, profile: string): string | null =>
  isProfileOwner(viewer, profile) ? `${OWN_PROFILE_BLOCK_PATH}?login=${encodeURIComponent(profile.trim())}` : null;

/**
 * The owner's reads, in the browser after the cached page loads, both asked together: null until both answer, and for
 * anyone but the owner (nothing is asked then).
 */
export function useOwnerReads(viewer: string | null | undefined, profile: string): OwnerReads | null {
  const [reads, setReads] = useState<OwnerReads | null>(null);
  useEffect(() => {
    setReads(null);
    const url = ownProfileBlockUrl(viewer, profile);
    if (!url) return;
    let live = true;
    Promise.all([read<OwnProfileBlockAnswer>(url), read<SkillsProfileAnswer>(skillsProfileMinePath(profile))]).then(
      ([picks, skills]) => {
        if (live) setReads({ picks: picks ?? { kind: 'none' }, skills: skills ?? NO_SKILLS_PROFILE });
      },
    );
    return () => {
      live = false;
    };
  }, [viewer, profile]);
  return reads;
}

/**
 * The owner's box, by the products they use: issues picked for them with a way into each product when they use
 * neither; the top of their own Learn list when they learn; Contribute's own box when they contribute or use both
 * (and when their sides could not be read). `colors`: the profile's languages, for the rows' dots.
 */
export function OwnerBoxView({ reads, colors }: { reads: OwnerReads; colors?: Readonly<Record<string, string>> }) {
  const { picks, skills } = reads;
  switch (ownerBoxCaseOf(skills.sides)) {
    case 'learns':
      return <ProfileLearnListBox rows={skills.learnRows ?? []} colors={colors} />;
    case 'neither':
      return picks.kind === 'none' ? null : (
        <ProfilePickedBox
          issues={picks.issues.map(ownIssueOf)}
          readyIssues={picks.kind === 'own' ? picks.stats?.readyIssues : null}
          matchedTo={ownMatchOf(picks.issues)}
          learnOpen={skills.sides?.learnOpen === true}
        />
      );
    default:
      return <ProfileContributeView answer={picks} />;
  }
}

/** Contribute's own box for an answer: a contributor's own list, the owner's picks, or nothing. */
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
