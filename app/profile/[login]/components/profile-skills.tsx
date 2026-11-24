'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { OwnerBoxSlot, OwnerBoxView, useOwnerReads } from './profile-contribute';
import { SkillsBlock } from '@/components/skills/skills-block';
import type { SkillsBriefAnswer } from '@/lib/skills/skills.types';
import { readSkillsBrief } from '@/lib/skills/skills-brief-read';
import { overviewBlockOf } from '@/lib/skills/skills-overview';
import { loginFromPath } from '@/utils/login-from-path';
import { isProfileOwner } from '@/utils/profile-owner';

/**
 * The overview's Skills block, and above it the box only the profile's owner sees, both read in the browser after the
 * cached page loads, so neither moves the cards above them.
 *
 * - The block: the person's public numbers, the same for every reader (the tab reads the same answer). It holds no
 *   place while it loads, and adds nothing without a public page. The owner of a page only they see gets it from
 *   their own view, with its line.
 * - The owner's box: its place is kept from the moment the session says the reader is the owner, so it takes it
 *   without moving the block and what follows. Nothing for anyone else.
 *
 * `colors`: the profile's languages, for the box's rows.
 */
export function ProfileSkills({ login, colors }: { login: string; colors?: Readonly<Record<string, string>> }) {
  const { data: session } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const profile = loginFromPath(login);
  const owner = isProfileOwner(viewer, profile);
  const [brief, setBrief] = useState<SkillsBriefAnswer | null>(null);
  const reads = useOwnerReads(viewer, profile);

  useEffect(() => {
    setBrief(null);
    let live = true;
    readSkillsBrief(profile).then((answer) => {
      if (live) setBrief(answer);
    });
    return () => {
      live = false;
    };
  }, [profile]);

  const block = overviewBlockOf(brief, owner ? (reads?.skills.block ?? null) : null);
  return (
    <>
      {owner ? reads ? <OwnerBoxView reads={reads} colors={colors} /> : <OwnerBoxSlot /> : null}
      {block ? (
        <SkillsBlock login={profile} numbers={block.numbers} ownState={block.ownState} learnOpen={block.learnOpen} />
      ) : null}
    </>
  );
}
